import { Token, TrackType, PlayerPosition } from '@/types';

// Import static token data as fallback
import staticTokenData from '@/data/tokens.json';

// Token category types
export type TokenCategory = 'layer1' | 'meme';

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

// Helper to determine track from boost value
export function getTrackFromBoost(boost: number): TrackType {
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

// Token storage - starts with static data, updates from API
// Using a single array that we mutate to keep all references in sync
const tokenCache: Token[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Initialize from static data
function initializeFromStatic(): void {
  const apiTokens = (staticTokenData as { data: CFLApiToken[] }).data;
  const tokens = apiTokens.map(convertCFLToken);
  tokenCache.length = 0;
  tokenCache.push(...tokens);
}

// Initialize cache with static data immediately
initializeFromStatic();

// Fetch fresh tokens from API
export async function refreshTokens(): Promise<Token[]> {
  const now = Date.now();

  // Skip if recently fetched
  if (tokenCache.length > 0 && (now - lastFetchTime) < CACHE_TTL) {
    return tokenCache;
  }

  try {
    // Use absolute URL for server-side, relative for client-side
    const baseUrl = typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      : '';

    const response = await fetch(`${baseUrl}/api/tokens`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      const newTokens = data.data.map(convertCFLToken);

      // Mutate the array to keep all references in sync
      tokenCache.length = 0;
      tokenCache.push(...newTokens);
      lastFetchTime = now;

      // Update token colors
      updateTokenColors();

      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log(`[CFL Tokens] Refreshed ${tokenCache.length} tokens from API`);
      }
    }
  } catch (error) {
    console.error('[CFL Tokens] Failed to refresh from API:', error);
    // Keep using existing cache
  }

  return tokenCache;
}

// Get current tokens (sync - uses cache)
export function getTokens(): Token[] {
  return tokenCache;
}

// Token colors for chart lines
const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1', '#FF69B4', '#32CD32',
  '#FF4500', '#9370DB', '#20B2AA', '#FF1493', '#00FF7F', '#FFD700', '#1E90FF',
  '#FF6347', '#7B68EE', '#00FA9A', '#DC143C', '#00BFFF', '#FF8C00', '#9932CC',
  '#228B22', '#FF00FF', '#4169E1', '#2E8B57', '#FF7F50', '#6A5ACD', '#3CB371',
];

export const TOKEN_COLORS: Record<string, string> = {};

function updateTokenColors() {
  tokenCache.forEach((token, index) => {
    TOKEN_COLORS[token.symbol] = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  });
  TOKEN_COLORS.DEFAULT = '#888888';
}

// Initialize colors
updateTokenColors();

export function getTokenColor(symbol: string): string {
  return TOKEN_COLORS[symbol] || TOKEN_COLORS.DEFAULT;
}

// Filter tokens by track
export function getTokensByTrack(track: TrackType | 'all'): Token[] {
  if (track === 'all') return tokenCache;
  return tokenCache.filter(t => t.track === track);
}

// Get tokens by category (for backwards compatibility)
export function getTokensByCategory(category: TokenCategory): Token[] {
  return tokenCache;
}

// Get track stats
export function getTrackStats() {
  return {
    aggressive: tokenCache.filter(t => t.track === 'aggressive').length,
    balanced: tokenCache.filter(t => t.track === 'balanced').length,
    moderate: tokenCache.filter(t => t.track === 'moderate').length,
    conservative: tokenCache.filter(t => t.track === 'conservative').length,
    total: tokenCache.length,
  };
}

// Get token by symbol
export function getTokenBySymbol(symbol: string): Token | undefined {
  return tokenCache.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
}

// Get token by Pyth feed ID
export function getTokenByPythFeedId(feedId: string): Token | undefined {
  return tokenCache.find(t => t.pythFeedId === feedId);
}

// Get all Pyth feed IDs
export function getAllPythFeedIds(): string[] {
  return tokenCache
    .filter(t => t.pythFeedId)
    .map(t => t.pythFeedId!);
}

// Load token list (async - refreshes from API)
export async function loadTokenList(track?: TrackType | 'all'): Promise<Token[]> {
  await refreshTokens();

  if (track && track !== 'all') {
    return getTokensByTrack(track);
  }
  return tokenCache;
}

// Export for backward compatibility
export const DEFAULT_TOKENS = tokenCache;
export const CFL_TOKENS = tokenCache;

// Trigger initial API refresh on module load (non-blocking)
if (typeof window !== 'undefined') {
  // Client-side: refresh tokens after a short delay
  setTimeout(() => {
    refreshTokens().catch(console.error);
  }, 1000);
}

// Log stats on load (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const stats = getTrackStats();
  console.log(`[CFL Tokens] Initialized with ${stats.total} tokens:`, stats);
}
