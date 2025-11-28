import { NextResponse } from 'next/server';
import { DEFAULT_TOKENS, getAllPythFeedIds } from '@/lib/tokens';
import { TradeEvent } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// CFL's Pyth RPC endpoint (same one they use)
const PYTH_HERMES_URL = 'https://cfl-pythnet-2711.mainnet.pythnet.rpcpool.com/hermes/v2/updates/price/latest';
const PYTH_HERMES_FALLBACK = 'https://hermes.pyth.network/v2/updates/price/latest';

interface PythPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

// Store previous prices to detect changes
const previousPrices = new Map<string, { price: number; timestamp: number }>();

// Trade event cache
const tradeCache: TradeEvent[] = [];
const CACHE_MAX_SIZE = 500;

function convertPythPrice(rawPrice: string, expo: number): number {
  return parseFloat(rawPrice) * Math.pow(10, expo);
}

// Build feedId to token lookup
const feedIdToToken = new Map<string, { symbol: string; mint: string; boost: number }>();
DEFAULT_TOKENS.forEach(token => {
  if (token.pythFeedId) {
    feedIdToToken.set(token.pythFeedId, {
      symbol: token.symbol,
      mint: token.mint,
      boost: token.boost,
    });
  }
});

async function fetchPythPricesAndGenerateTrades(useFallback = false): Promise<TradeEvent[]> {
  const newTrades: TradeEvent[] = [];
  const feedIds = getAllPythFeedIds();

  if (feedIds.length === 0) return newTrades;

  const baseUrl = useFallback ? PYTH_HERMES_FALLBACK : PYTH_HERMES_URL;
  const BATCH_SIZE = 50;
  const now = Date.now();

  for (let i = 0; i < feedIds.length; i += BATCH_SIZE) {
    const batch = feedIds.slice(i, i + BATCH_SIZE);

    try {
      const params = batch.map(id => `ids[]=${encodeURIComponent(id)}`).join('&');
      const url = `${baseUrl}?${params}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        if (!useFallback) {
          return fetchPythPricesAndGenerateTrades(true);
        }
        continue;
      }

      const data = await response.json();

      for (const item of data.parsed as PythPriceData[]) {
        const feedId = `0x${item.id}`;
        const currentPrice = convertPythPrice(item.price.price, item.price.expo);
        const token = feedIdToToken.get(feedId);

        if (!token || currentPrice <= 0) continue;

        const prev = previousPrices.get(feedId);

        if (prev && prev.price > 0) {
          // Calculate percentage change
          const priceChange = ((currentPrice - prev.price) / prev.price) * 100;
          const timeDelta = now - prev.timestamp;

          // Only generate trade if there's meaningful price movement
          // and enough time has passed (avoid duplicates)
          if (Math.abs(priceChange) > 0.001 && timeDelta > 500) {
            // Price went up = buying pressure, price went down = selling pressure
            const tradeType = priceChange > 0 ? 'buy' : 'sell';

            // Calculate trade size based on:
            // 1. Magnitude of price change (bigger move = bigger volume)
            // 2. Token's boost value (higher boost = more volatile = potentially larger trades)
            const baseSize = 100; // Base trade size in USD
            const changeMultiplier = Math.min(Math.abs(priceChange) * 100, 50); // Cap at 50x
            const boostMultiplier = token.boost / 80; // Normalize around 80
            const tradeSize = baseSize * changeMultiplier * boostMultiplier;

            // Only create trade if size is meaningful
            if (tradeSize >= 10) {
              const trade: TradeEvent = {
                mint: token.mint,
                symbol: token.symbol,
                type: tradeType,
                amountUsd: Math.round(tradeSize * 100) / 100,
                timestamp: now,
                signature: `pyth-${feedId.slice(2, 10)}-${now}`,
              };

              newTrades.push(trade);
            }
          }
        }

        // Update previous price
        previousPrices.set(feedId, { price: currentPrice, timestamp: now });
      }
    } catch (error) {
      console.error('Pyth fetch error:', error);
      if (!useFallback) {
        return fetchPythPricesAndGenerateTrades(true);
      }
    }
  }

  // Add new trades to cache
  for (const trade of newTrades) {
    tradeCache.unshift(trade);
  }

  // Trim cache
  while (tradeCache.length > CACHE_MAX_SIZE) {
    tradeCache.pop();
  }

  return newTrades;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = parseInt(searchParams.get('since') || '0', 10);

  try {
    // Fetch new prices and generate trades from price movements
    await fetchPythPricesAndGenerateTrades();

    // Filter by timestamp
    const filteredTrades = tradeCache.filter(t => t.timestamp > since);

    return NextResponse.json({
      trades: filteredTrades,
      timestamp: Date.now(),
      source: 'pyth',
      count: filteredTrades.length,
    });
  } catch (error) {
    console.error('Trades API error:', error);
    return NextResponse.json({ error: 'Failed to fetch trades', trades: [] }, { status: 500 });
  }
}
