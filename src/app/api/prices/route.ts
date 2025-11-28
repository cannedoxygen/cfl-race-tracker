import { NextResponse } from 'next/server';
import { DEFAULT_TOKENS, getAllPythFeedIds } from '@/lib/tokens';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// CFL's Pyth RPC endpoint
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

// Store previous prices to calculate changes
const previousPrices = new Map<string, { price: number; timestamp: number }>();

function convertPythPrice(rawPrice: string, expo: number): number {
  return parseFloat(rawPrice) * Math.pow(10, expo);
}

async function fetchPythPrices(feedIds: string[], useFallback = false): Promise<Map<string, { price: number; change: number; feedId: string }>> {
  const prices = new Map<string, { price: number; change: number; feedId: string }>();

  if (feedIds.length === 0) return prices;

  const baseUrl = useFallback ? PYTH_HERMES_FALLBACK : PYTH_HERMES_URL;
  const BATCH_SIZE = 50;

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
          return fetchPythPrices(feedIds, true);
        }
        continue;
      }

      const data = await response.json();

      for (const item of data.parsed as PythPriceData[]) {
        const feedId = `0x${item.id}`;
        const currentPrice = convertPythPrice(item.price.price, item.price.expo);

        // Calculate price change from previous fetch
        const prev = previousPrices.get(feedId);
        let change = 0;

        if (prev && prev.price > 0) {
          change = ((currentPrice - prev.price) / prev.price) * 100;
        }

        // Update previous price
        previousPrices.set(feedId, { price: currentPrice, timestamp: Date.now() });

        prices.set(feedId, {
          price: currentPrice,
          change,
          feedId,
        });
      }
    } catch (error) {
      console.error('Pyth fetch error:', error);
      if (!useFallback) {
        return fetchPythPrices(feedIds, true);
      }
    }
  }

  return prices;
}

export async function GET() {
  try {
    const feedIds = getAllPythFeedIds();
    const pythPrices = await fetchPythPrices(feedIds);

    // Map prices back to tokens
    const tokenPrices = DEFAULT_TOKENS
      .filter(t => t.pythFeedId)
      .map(token => {
        const priceData = pythPrices.get(token.pythFeedId!);
        return {
          symbol: token.symbol,
          name: token.name,
          mint: token.mint,
          pythFeedId: token.pythFeedId,
          price: priceData?.price || 0,
          change: priceData?.change || 0,
          boost: token.boost,
          track: token.track,
          position: token.position,
          logoURI: token.logoURI,
        };
      })
      .filter(t => t.price > 0);

    return NextResponse.json({
      prices: tokenPrices,
      timestamp: Date.now(),
      count: tokenPrices.length,
    });
  } catch (error) {
    console.error('Prices API error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices', prices: [] }, { status: 500 });
  }
}
