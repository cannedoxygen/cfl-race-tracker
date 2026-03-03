import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Pyth Hermes endpoints
const PYTH_HERMES_URL = 'https://hermes.pyth.network/v2/updates/price/latest';
const PYTH_FEEDS_URL = 'https://hermes.pyth.network/v2/price_feeds?asset_type=crypto';
const CFL_TOKEN_API = 'https://v12-cfl-backend-production.up.railway.app/token/list?page=1&limit=500';

interface PythFeed {
  id: string;
  attributes: {
    base: string;
    quote_currency: string;
  };
}

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
  pythLazerId?: number;
}

// Cache for Pyth feed mapping (symbol -> feedId)
let pythFeedMap: Map<string, string> = new Map();
let pythFeedMapTimestamp = 0;
const PYTH_FEED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// Fetch and cache Pyth feed mapping (symbol -> hex feed ID)
async function getPythFeedMap(): Promise<Map<string, string>> {
  const now = Date.now();

  if (pythFeedMap.size > 0 && (now - pythFeedMapTimestamp) < PYTH_FEED_CACHE_TTL) {
    return pythFeedMap;
  }

  try {
    const response = await fetch(PYTH_FEEDS_URL, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Pyth feeds API returned ${response.status}`);
    }

    const feeds: PythFeed[] = await response.json();
    const newMap = new Map<string, string>();

    for (const feed of feeds) {
      if (feed.attributes.quote_currency === 'USD') {
        const symbol = feed.attributes.base.toLowerCase();
        // Store with 0x prefix for consistency
        newMap.set(symbol, `0x${feed.id}`);
      }
    }

    pythFeedMap = newMap;
    pythFeedMapTimestamp = now;
    console.log(`[Race Prices] Loaded ${newMap.size} Pyth feed mappings`);

    return newMap;
  } catch (error) {
    console.error('[Race Prices] Failed to fetch Pyth feeds:', error);
    return pythFeedMap; // Return stale cache if available
  }
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

// Fetch prices from Pyth for given feed IDs
async function fetchPythPrices(feedIds: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  if (feedIds.length === 0) return prices;

  const BATCH_SIZE = 50;

  for (let i = 0; i < feedIds.length; i += BATCH_SIZE) {
    const batch = feedIds.slice(i, i + BATCH_SIZE);

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
        const feedId = `0x${item.id}`;
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
    // Fetch Pyth feed mapping and CFL tokens in parallel
    const [feedMap, cflTokens] = await Promise.all([
      getPythFeedMap(),
      fetchCFLTokens(),
    ]);

    // Build token list with matched Pyth feed IDs (match by symbol)
    const tokensWithFeeds: Array<{
      symbol: string;
      mint: string;
      name: string;
      boost: number;
      feedId: string;
    }> = [];

    for (const token of cflTokens) {
      const symbol = token.tokenSymbol.toLowerCase();
      const feedId = feedMap.get(symbol);

      if (feedId) {
        tokensWithFeeds.push({
          symbol: token.tokenSymbol.toUpperCase(),
          mint: token.coinGeckoId || symbol,
          name: token.tokenName,
          boost: token.currentPower || token.lastPower || 80,
          feedId,
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
