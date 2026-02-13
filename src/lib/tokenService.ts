import { Token, TrackType, PlayerPosition } from '@/types';

// CFL Backend API
const CFL_TOKEN_API = 'https://v12-cfl-backend-production.up.railway.app/token/list?page=1&limit=500';

// CFL API token structure
interface CFLApiToken {
  pythFeedId: string;
  coinGeckoId: string;
  solanaPythFeedId: string;
  tokenName: string;
  tokenSymbol: string;
  tokenImageLogo: string;
  pythLazerId: number;
  exponent: number;
  lastPower: number;
  currentPower: number;
  priceChange24h: number;
  priceChange7d: number;
  playerCard: string;
  position: string;
}

// Server-side cache
let serverTokenCache: Token[] | null = null;
let serverCacheTimestamp = 0;
const SERVER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to determine track from boost value
function getTrackFromBoost(boost: number): TrackType {
  if (boost >= 85) return 'aggressive';
  if (boost >= 81) return 'balanced';
  if (boost >= 77) return 'moderate';
  return 'conservative';
}

// Convert CFL API token to our Token format
function convertCFLToken(apiToken: CFLApiToken): Token {
  const boost = apiToken.currentPower || apiToken.lastPower || 0;
  return {
    symbol: apiToken.tokenSymbol.toUpperCase(),
    mint: apiToken.coinGeckoId || apiToken.tokenSymbol.toLowerCase(),
    name: apiToken.tokenName,
    logoURI: apiToken.tokenImageLogo,
    boost,
    track: getTrackFromBoost(boost),
    position: apiToken.position as PlayerPosition,
    pythFeedId: apiToken.pythFeedId,
    solanaPythFeedId: apiToken.solanaPythFeedId,
    pythLazerId: apiToken.pythLazerId?.toString(),
    coinGeckoId: apiToken.coinGeckoId,
    exponent: apiToken.exponent,
    playerCard: apiToken.playerCard,
    priceChange24h: apiToken.priceChange24h,
    priceChange7d: apiToken.priceChange7d,
    lastPower: apiToken.lastPower,
  };
}

/**
 * Fetch tokens from CFL backend API (server-side)
 * Uses caching to avoid excessive API calls
 */
export async function fetchTokensFromCFL(): Promise<Token[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (serverTokenCache && (now - serverCacheTimestamp) < SERVER_CACHE_TTL) {
    return serverTokenCache;
  }

  try {
    const response = await fetch(CFL_TOKEN_API, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`CFL API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      const tokens = data.data.map(convertCFLToken);
      serverTokenCache = tokens;
      serverCacheTimestamp = now;
      console.log(`[TokenService] Fetched ${tokens.length} tokens from CFL API`);
      return tokens;
    }

    throw new Error('Invalid API response format');
  } catch (error) {
    console.error('[TokenService] Failed to fetch from CFL backend:', error);

    // Return cached data even if expired, as fallback
    if (serverTokenCache) {
      console.log('[TokenService] Using stale cache as fallback');
      return serverTokenCache;
    }

    // Last resort: load from static file
    try {
      const staticData = await import('@/data/tokens.json');
      const tokens = (staticData as { data: CFLApiToken[] }).data.map(convertCFLToken);
      console.log(`[TokenService] Loaded ${tokens.length} tokens from static file`);
      return tokens;
    } catch {
      console.error('[TokenService] Failed to load static fallback');
      return [];
    }
  }
}

/**
 * Get all Pyth feed IDs from tokens
 */
export async function getAllPythFeedIdsFromAPI(): Promise<string[]> {
  const tokens = await fetchTokensFromCFL();
  return tokens
    .filter(t => t.pythFeedId)
    .map(t => t.pythFeedId!);
}

/**
 * Get token by symbol
 */
export async function getTokenBySymbolFromAPI(symbol: string): Promise<Token | undefined> {
  const tokens = await fetchTokensFromCFL();
  return tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
}
