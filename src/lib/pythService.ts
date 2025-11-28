// Pyth Network Price Service
// Fetches real-time prices from Pyth Hermes API

// CFL's Pyth RPC endpoint (from their frontend)
const PYTH_HERMES_URL = 'https://cfl-pythnet-2711.mainnet.pythnet.rpcpool.com/hermes/v2/updates/price/latest';

// Fallback to public Pyth endpoint if CFL's endpoint fails
const PYTH_HERMES_FALLBACK = 'https://hermes.pyth.network/v2/updates/price/latest';

export interface PythPriceData {
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

export interface PythResponse {
  binary: {
    encoding: string;
    data: string[];
  };
  parsed: PythPriceData[];
}

export interface TokenPrice {
  feedId: string;
  price: number;
  confidence: number;
  emaPrice: number;
  publishTime: number;
  exponent: number;
}

// Convert Pyth raw price to actual price
function convertPythPrice(rawPrice: string, expo: number): number {
  return parseFloat(rawPrice) * Math.pow(10, expo);
}

// Fetch prices for multiple Pyth feed IDs
export async function fetchPythPrices(feedIds: string[], useFallback = false): Promise<Map<string, TokenPrice>> {
  const prices = new Map<string, TokenPrice>();

  if (feedIds.length === 0) return prices;

  const baseUrl = useFallback ? PYTH_HERMES_FALLBACK : PYTH_HERMES_URL;

  // Pyth API has a limit on URL length, so batch requests
  const BATCH_SIZE = 50;
  const batches: string[][] = [];

  for (let i = 0; i < feedIds.length; i += BATCH_SIZE) {
    batches.push(feedIds.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      // Build URL with feed IDs - keep 0x prefix, use ids[] format like CFL does
      const params = batch
        .map(id => `ids[]=${encodeURIComponent(id)}`)
        .join('&');

      const url = `${baseUrl}?${params}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        // Add cache control for fresher data
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error('Pyth API error:', response.status);
        // Try fallback if primary fails
        if (!useFallback) {
          console.log('Trying fallback Pyth endpoint...');
          return fetchPythPrices(feedIds, true);
        }
        continue;
      }

      const data: PythResponse = await response.json();

      for (const item of data.parsed) {
        const feedId = `0x${item.id}`;
        prices.set(feedId, {
          feedId,
          price: convertPythPrice(item.price.price, item.price.expo),
          confidence: convertPythPrice(item.price.conf, item.price.expo),
          emaPrice: convertPythPrice(item.ema_price.price, item.ema_price.expo),
          publishTime: item.price.publish_time,
          exponent: item.price.expo,
        });
      }
    } catch (error) {
      console.error('Error fetching Pyth prices:', error);
      // Try fallback on network error
      if (!useFallback) {
        console.log('Trying fallback Pyth endpoint...');
        return fetchPythPrices(feedIds, true);
      }
    }
  }

  return prices;
}

// Fetch a single price
export async function fetchPythPrice(feedId: string): Promise<TokenPrice | null> {
  const prices = await fetchPythPrices([feedId]);
  return prices.get(feedId) || null;
}

// Stream prices using polling (Pyth also supports WebSocket but this is simpler)
export function createPricePoller(
  feedIds: string[],
  onPrices: (prices: Map<string, TokenPrice>) => void,
  intervalMs: number = 1000
): { start: () => void; stop: () => void } {
  let intervalId: NodeJS.Timeout | null = null;
  let isRunning = false;

  const poll = async () => {
    if (!isRunning) return;

    try {
      const prices = await fetchPythPrices(feedIds);
      onPrices(prices);
    } catch (error) {
      console.error('Price polling error:', error);
    }
  };

  return {
    start: () => {
      if (isRunning) return;
      isRunning = true;
      poll(); // Initial fetch
      intervalId = setInterval(poll, intervalMs);
    },
    stop: () => {
      isRunning = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}
