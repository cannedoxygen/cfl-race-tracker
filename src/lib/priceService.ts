import { Token, TokenPriceData, PricePoint } from '@/types';

// In-memory price history cache
const priceHistoryCache: Map<string, PricePoint[]> = new Map();
const MAX_HISTORY_POINTS = 60; // ~10 minutes at 10s intervals

// Rate limiting
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 2000; // Minimum 2 seconds between fetches

// Helius API key
const HELIUS_API_KEY = '6ed0e579-53f4-43f8-a060-6cd930b55ef1';

interface HeliusAssetResponse {
  result: {
    token_info?: {
      price_info?: {
        price_per_token: number;
        currency: string;
      };
    };
  };
}

interface DexScreenerResponse {
  pairs: Array<{
    baseToken: {
      address: string;
      symbol: string;
    };
    priceUsd: string;
    priceChange: {
      m5: number;
      h1: number;
    };
  }>;
}

// Fetch price from DexScreener (free, no API key needed)
async function fetchDexScreenerPrices(tokens: Token[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  try {
    // DexScreener allows batch queries by address
    const addresses = tokens.map(t => t.mint).join(',');
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${addresses}`,
      { next: { revalidate: 5 } }
    );

    if (response.ok) {
      const data: DexScreenerResponse = await response.json();
      if (data.pairs) {
        for (const pair of data.pairs) {
          if (pair.priceUsd && !prices.has(pair.baseToken.address)) {
            prices.set(pair.baseToken.address, parseFloat(pair.priceUsd));
          }
        }
      }
    }
  } catch (error) {
    console.error('DexScreener error:', error);
  }

  return prices;
}

// Fetch price from Helius DAS API
async function fetchHeliusPrice(mint: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'price-fetch',
          method: 'getAsset',
          params: { id: mint },
        }),
      }
    );

    if (response.ok) {
      const data: HeliusAssetResponse = await response.json();
      return data.result?.token_info?.price_info?.price_per_token || null;
    }
  } catch (error) {
    console.error('Helius error for', mint, error);
  }
  return null;
}

// Fallback: CoinGecko for major tokens
const COINGECKO_IDS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'solana',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'bonk',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'dogwifcoin',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'jupiter-exchange-solana',
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': 'pyth-network',
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'raydium',
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 'orca',
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': 'render-token',
  'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux': 'helium',
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'popcat',
};

async function fetchCoinGeckoPrices(tokens: Token[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  const ids = tokens
    .map(t => COINGECKO_IDS[t.mint])
    .filter(Boolean)
    .join(',');

  if (!ids) return prices;

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { next: { revalidate: 10 } }
    );

    if (response.ok) {
      const data = await response.json();
      for (const token of tokens) {
        const geckoId = COINGECKO_IDS[token.mint];
        if (geckoId && data[geckoId]?.usd) {
          prices.set(token.mint, data[geckoId].usd);
        }
      }
    }
  } catch (error) {
    console.error('CoinGecko error:', error);
  }

  return prices;
}

export async function fetchTokenPrices(tokens: Token[]): Promise<TokenPriceData[]> {
  const now = Date.now();

  // Rate limit protection
  if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_FETCH_INTERVAL - (now - lastFetchTime)));
  }
  lastFetchTime = Date.now();

  const timestamp = Date.now();

  // Try DexScreener first (most reliable for Solana tokens)
  let prices = await fetchDexScreenerPrices(tokens);

  // Fallback to CoinGecko for any missing prices
  if (prices.size < tokens.length) {
    const missingTokens = tokens.filter(t => !prices.has(t.mint));
    const geckoPrice = await fetchCoinGeckoPrices(missingTokens);
    for (const [mint, price] of geckoPrice) {
      if (!prices.has(mint)) {
        prices.set(mint, price);
      }
    }
  }

  // Last resort: try Helius for any still missing
  for (const token of tokens) {
    if (!prices.has(token.mint)) {
      const heliusPrice = await fetchHeliusPrice(token.mint);
      if (heliusPrice) {
        prices.set(token.mint, heliusPrice);
      }
    }
  }

  const results: TokenPriceData[] = tokens.map((token) => {
    const currentPrice = prices.get(token.mint) || 0;

    // Update price history cache
    const history = priceHistoryCache.get(token.mint) || [];
    history.push({ timestamp, price: currentPrice });

    // Keep only recent history
    while (history.length > MAX_HISTORY_POINTS) {
      history.shift();
    }
    priceHistoryCache.set(token.mint, history);

    // Calculate percent changes
    const percentChange1m = calculatePercentChange(history, 60 * 1000);
    const percentChange5m = calculatePercentChange(history, 5 * 60 * 1000);

    return {
      mint: token.mint,
      symbol: token.symbol,
      currentPrice,
      priceHistory: [...history],
      percentChange1m,
      percentChange5m,
      lastUpdated: timestamp,
    };
  });

  return results;
}

function calculatePercentChange(history: PricePoint[], timeWindowMs: number): number {
  if (history.length < 2) return 0;

  const now = Date.now();
  const currentPrice = history[history.length - 1].price;

  // Find the price point closest to the time window ago
  const targetTime = now - timeWindowMs;
  let closestPoint = history[0];

  for (const point of history) {
    if (point.timestamp <= targetTime) {
      closestPoint = point;
    } else {
      break;
    }
  }

  const oldPrice = closestPoint.price;

  if (oldPrice === 0) return 0;
  return ((currentPrice - oldPrice) / oldPrice) * 100;
}

// Server-side cache for API route
let serverCache: {
  data: TokenPriceData[] | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const SERVER_CACHE_TTL = 5000; // 5 seconds

export async function fetchTokenPricesWithCache(tokens: Token[]): Promise<TokenPriceData[]> {
  const now = Date.now();

  // Return cached data if fresh enough
  if (serverCache.data && now - serverCache.timestamp < SERVER_CACHE_TTL) {
    return serverCache.data;
  }

  const data = await fetchTokenPrices(tokens);
  serverCache = { data, timestamp: now };

  return data;
}

// Clear the price history (useful for testing)
export function clearPriceHistory(): void {
  priceHistoryCache.clear();
}
