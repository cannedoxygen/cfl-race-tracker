import { NextResponse } from 'next/server';
import { fetchTokensFromCFL } from '@/lib/tokenService';
import { Token } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Pyth Hermes endpoints
const PYTH_HERMES_URL = 'https://hermes.pyth.network/v2/updates/price/latest';
const PYTH_HERMES_FALLBACK = 'https://hermes.pyth.network/v2/updates/price/latest';

interface PythPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

// Store price history for rolling calculations
interface PriceHistory {
  price: number;
  timestamp: number;
}

// Rolling price history (last 2 minutes of data per token)
const priceHistory = new Map<string, PriceHistory[]>();
const HISTORY_WINDOW_MS = 120000; // Keep 2 minutes of history
const ROLLING_WINDOW_MS = 60000; // Calculate % change over last 60 seconds

// Store race start prices (reset when new race starts)
let raceStartPrices = new Map<string, number>();
let raceStartTime: number | null = null;

function convertPythPrice(rawPrice: string, expo: number): number {
  return parseFloat(rawPrice) * Math.pow(10, expo);
}

// Build feedId to token lookup (refreshed on each request)
function buildFeedIdLookup(tokens: Token[]): Map<string, { symbol: string; mint: string; boost: number }> {
  const lookup = new Map<string, { symbol: string; mint: string; boost: number }>();
  tokens.forEach(token => {
    if (token.pythFeedId) {
      lookup.set(token.pythFeedId, {
        symbol: token.symbol,
        mint: token.mint,
        boost: token.boost,
      });
    }
  });
  return lookup;
}

async function fetchCurrentPrices(tokens: Token[], useFallback = false): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  const feedIds = tokens.filter(t => t.pythFeedId).map(t => t.pythFeedId!);

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
          return fetchCurrentPrices(tokens, true);
        }
        continue;
      }

      const data = await response.json();

      for (const item of data.parsed as PythPriceData[]) {
        const feedId = `0x${item.id}`;
        const currentPrice = convertPythPrice(item.price.price, item.price.expo);

        if (currentPrice > 0) {
          prices.set(feedId, currentPrice);
        }
      }
    } catch (error) {
      console.error('Pyth fetch error:', error);
      if (!useFallback) {
        return fetchCurrentPrices(tokens, true);
      }
    }
  }

  return prices;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const startTimeParam = searchParams.get('startTime');

  try {
    // Fetch tokens from CFL API (cached)
    const tokens = await fetchTokensFromCFL();
    const feedIdToToken = buildFeedIdLookup(tokens);

    const currentPrices = await fetchCurrentPrices(tokens);
    const now = Date.now();

    // Update price history for all tokens
    for (const [feedId, currentPrice] of currentPrices) {
      const history = priceHistory.get(feedId) || [];

      // Add current price to history
      history.push({ price: currentPrice, timestamp: now });

      // Remove old entries (older than HISTORY_WINDOW_MS)
      const cutoff = now - HISTORY_WINDOW_MS;
      const trimmedHistory = history.filter(h => h.timestamp > cutoff);

      priceHistory.set(feedId, trimmedHistory);
    }

    // Start a new race - store current prices as baseline
    // Only reset on explicit 'start' action, not on cold starts
    if (action === 'start') {
      raceStartTime = startTimeParam ? parseInt(startTimeParam) : now;
      raceStartPrices = new Map(currentPrices);

      // Clear price history on new race
      priceHistory.clear();

      return NextResponse.json({
        action: 'started',
        startTime: raceStartTime,
        tokenCount: raceStartPrices.size,
        timestamp: now,
      });
    }

    // If client has a startTime but server lost state (cold start), restore it silently
    if (startTimeParam && !raceStartTime) {
      raceStartTime = parseInt(startTimeParam);
      // Use current prices as baseline since we lost the original start prices
      raceStartPrices = new Map(currentPrices);
    }

    // Reset race
    if (action === 'reset') {
      raceStartPrices.clear();
      priceHistory.clear();
      raceStartTime = null;

      return NextResponse.json({
        action: 'reset',
        timestamp: now,
      });
    }

    // Calculate ROLLING % changes (last 60 seconds, not from start)
    const priceChanges: Array<{
      mint: string;
      symbol: string;
      boost: number;
      startPrice: number;
      currentPrice: number;
      percentChange: number; // Rolling 60s change (what matters for ranking)
      totalChange: number;   // Total change from race start (for reference)
    }> = [];

    for (const [feedId, currentPrice] of currentPrices) {
      const token = feedIdToToken.get(feedId);
      if (!token) continue;

      const history = priceHistory.get(feedId) || [];

      // Find price from ~60 seconds ago for rolling calculation
      const rollingCutoff = now - ROLLING_WINDOW_MS;
      const oldPrices = history.filter(h => h.timestamp <= rollingCutoff);
      const price60sAgo = oldPrices.length > 0
        ? oldPrices[oldPrices.length - 1].price  // Most recent price before cutoff
        : history.length > 0
          ? history[0].price  // If no old prices, use oldest available
          : currentPrice;     // If no history at all, use current (0% change)

      // Rolling % change (last 60 seconds) - THIS IS WHAT WE RANK BY
      const rollingChange = price60sAgo > 0
        ? ((currentPrice - price60sAgo) / price60sAgo) * 100
        : 0;

      // Total change from race start (for reference only)
      const startPrice = raceStartPrices.get(feedId) || currentPrice;
      const totalChange = startPrice > 0
        ? ((currentPrice - startPrice) / startPrice) * 100
        : 0;

      priceChanges.push({
        mint: token.mint,
        symbol: token.symbol,
        boost: token.boost,
        startPrice: price60sAgo,
        currentPrice,
        percentChange: rollingChange,  // Rolling 60s change for ranking
        totalChange,                    // Total change for reference
      });
    }

    // Sort by ROLLING % change (best recent performers first)
    priceChanges.sort((a, b) => b.percentChange - a.percentChange);

    return NextResponse.json({
      prices: priceChanges,
      raceStartTime,
      hasStartPrices: raceStartPrices.size > 0,
      timestamp: now,
      count: priceChanges.length,
      rollingWindowMs: ROLLING_WINDOW_MS,
    });
  } catch (error) {
    console.error('Race prices API error:', error);
    return NextResponse.json({ error: 'Failed to fetch race prices', prices: [] }, { status: 500 });
  }
}
