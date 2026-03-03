import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Pyth Hermes endpoint
const PYTH_HERMES_URL = 'https://hermes.pyth.network/v2/updates/price/latest';
const CFL_TOKEN_API = 'https://v12-cfl-backend-production.up.railway.app/token/list?page=1&limit=500';

interface PythPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

interface CFLToken {
  tokenSymbol: string;
  tokenName: string;
  coinGeckoId: string;
  currentPower: number;
  lastPower: number;
  tokenImageLogo?: string;
  solanaPythFeedId: string;  // Use this directly like mobile app
}

// Store price history for rolling calculations
interface PriceHistory {
  price: number;
  timestamp: number;
}

const priceHistory = new Map<string, PriceHistory[]>();
const HISTORY_WINDOW_MS = 120000; // Keep 2 minutes of history
const ROLLING_WINDOW_MS = 60000; // Calculate % change over last 60 seconds

// Store race start prices
let raceStartPrices = new Map<string, number>();
let raceStartTime: number | null = null;

function convertPythPrice(rawPrice: string, expo: number): number {
  return parseFloat(rawPrice) * Math.pow(10, expo);
}

// Fetch CFL tokens
async function fetchCFLTokens(): Promise<CFLToken[]> {
  try {
    const response = await fetch(CFL_TOKEN_API, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`CFL API returned ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[Race Prices] Failed to fetch CFL tokens:', error);
    return [];
  }
}

// Normalize feed ID to always have 0x prefix
function normalizeFeedId(feedId: string): string {
  return feedId.startsWith('0x') ? feedId : `0x${feedId}`;
}

// Fetch prices from Pyth for given feed IDs
// Returns map with normalized feed IDs (with 0x prefix) as keys
async function fetchPythPrices(feedIds: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  if (feedIds.length === 0) return prices;

  // Normalize all input feed IDs
  const normalizedFeedIds = feedIds.map(normalizeFeedId);

  const BATCH_SIZE = 50;

  for (let i = 0; i < normalizedFeedIds.length; i += BATCH_SIZE) {
    const batch = normalizedFeedIds.slice(i, i + BATCH_SIZE);

    try {
      const params = batch.map(id => `ids[]=${encodeURIComponent(id)}`).join('&');
      const url = `${PYTH_HERMES_URL}?${params}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error(`Pyth price API returned ${response.status}`);
        continue;
      }

      const data = await response.json();

      for (const item of data.parsed as PythPriceData[]) {
        const feedId = normalizeFeedId(item.id);
        const currentPrice = convertPythPrice(item.price.price, item.price.expo);

        if (currentPrice > 0) {
          prices.set(feedId, currentPrice);
        }
      }
    } catch (error) {
      console.error('Pyth price fetch error:', error);
    }
  }

  return prices;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const startTimeParam = searchParams.get('startTime');

  try {
    // Fetch CFL tokens (they include solanaPythFeedId directly)
    const cflTokens = await fetchCFLTokens();

    // Build token list using solanaPythFeedId from CFL API (like mobile app does)
    const tokensWithFeeds: Array<{
      symbol: string;
      mint: string;
      name: string;
      boost: number;
      feedId: string;
    }> = [];

    for (const token of cflTokens) {
      // Use solanaPythFeedId directly from CFL API - this is what makes mobile app work
      const rawFeedId = token.solanaPythFeedId;

      if (rawFeedId) {
        tokensWithFeeds.push({
          symbol: token.tokenSymbol.toUpperCase(),
          mint: token.coinGeckoId || token.tokenSymbol.toLowerCase(),
          name: token.tokenName,
          boost: token.currentPower || token.lastPower || 80,
          feedId: normalizeFeedId(rawFeedId),  // Normalize for consistent matching
        });
      }
    }

    // Fetch current prices from Pyth
    const feedIds = tokensWithFeeds.map(t => t.feedId);
    const currentPrices = await fetchPythPrices(feedIds);
    const now = Date.now();

    // Build feedId to token lookup
    const feedIdToToken = new Map<string, typeof tokensWithFeeds[0]>();
    for (const token of tokensWithFeeds) {
      feedIdToToken.set(token.feedId, token);
    }

    // Update price history for all tokens
    for (const [feedId, currentPrice] of currentPrices) {
      const history = priceHistory.get(feedId) || [];
      history.push({ price: currentPrice, timestamp: now });

      const cutoff = now - HISTORY_WINDOW_MS;
      const trimmedHistory = history.filter(h => h.timestamp > cutoff);
      priceHistory.set(feedId, trimmedHistory);
    }

    // Handle race actions
    if (action === 'start') {
      raceStartTime = startTimeParam ? parseInt(startTimeParam) : now;
      raceStartPrices = new Map(currentPrices);
      priceHistory.clear();

      return NextResponse.json({
        action: 'started',
        startTime: raceStartTime,
        tokenCount: raceStartPrices.size,
        timestamp: now,
      });
    }

    if (startTimeParam && !raceStartTime) {
      raceStartTime = parseInt(startTimeParam);
      raceStartPrices = new Map(currentPrices);
    }

    if (action === 'reset') {
      raceStartPrices.clear();
      priceHistory.clear();
      raceStartTime = null;

      return NextResponse.json({
        action: 'reset',
        timestamp: now,
      });
    }

    // Calculate price changes
    const priceChanges: Array<{
      mint: string;
      symbol: string;
      boost: number;
      startPrice: number;
      currentPrice: number;
      percentChange: number;
      totalChange: number;
    }> = [];

    for (const [feedId, currentPrice] of currentPrices) {
      const token = feedIdToToken.get(feedId);
      if (!token) continue;

      const history = priceHistory.get(feedId) || [];

      // Find price from ~60 seconds ago
      const rollingCutoff = now - ROLLING_WINDOW_MS;
      const oldPrices = history.filter(h => h.timestamp <= rollingCutoff);
      const price60sAgo = oldPrices.length > 0
        ? oldPrices[oldPrices.length - 1].price
        : history.length > 0
          ? history[0].price
          : currentPrice;

      // Rolling % change (last 60 seconds)
      const rollingChange = price60sAgo > 0
        ? ((currentPrice - price60sAgo) / price60sAgo) * 100
        : 0;

      // Total change from race start
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
        percentChange: rollingChange,
        totalChange,
      });
    }

    // Sort by rolling % change
    priceChanges.sort((a, b) => b.percentChange - a.percentChange);

    return NextResponse.json({
      prices: priceChanges,
      raceStartTime,
      hasStartPrices: raceStartPrices.size > 0,
      timestamp: now,
      count: priceChanges.length,
      matchedTokens: tokensWithFeeds.length,
      totalCFLTokens: cflTokens.length,
      rollingWindowMs: ROLLING_WINDOW_MS,
    });
  } catch (error) {
    console.error('Race prices API error:', error);
    return NextResponse.json({ error: 'Failed to fetch race prices', prices: [] }, { status: 500 });
  }
}
