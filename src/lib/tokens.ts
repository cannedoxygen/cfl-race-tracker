import { Token, TrackType, PlayerPosition } from '@/types';

// Import real CFL token data from JSON file
import tokenData from '@/data/tokens.json';

// Token category types
export type TokenCategory = 'layer1' | 'meme';

// Helper to determine track from boost value
export function getTrackFromBoost(boost: number): TrackType {
  if (boost >= 85) return 'aggressive';
  if (boost >= 81) return 'balanced';
  if (boost >= 77) return 'moderate';
  return 'conservative';
}

// CFL API token structure (from JSON files)
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

// Convert CFL API token to our Token format
function convertCFLToken(apiToken: CFLApiToken): Token {
  const boost = apiToken.currentPower;
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

// Load and convert all tokens from JSON data
function loadTokensFromJSON(): Token[] {
  const apiTokens = (tokenData as { data: CFLApiToken[] }).data;
  return apiTokens.map(convertCFLToken);
}

// Load tokens once at module initialization
const CFL_TOKENS: Token[] = loadTokensFromJSON();

// Token colors for chart lines - generate from token data or use defaults
const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1', '#FF69B4', '#32CD32',
  '#FF4500', '#9370DB', '#20B2AA', '#FF1493', '#00FF7F', '#FFD700', '#1E90FF',
  '#FF6347', '#7B68EE', '#00FA9A', '#DC143C', '#00BFFF', '#FF8C00', '#9932CC',
  '#228B22', '#FF00FF', '#4169E1', '#2E8B57', '#FF7F50', '#6A5ACD', '#3CB371',
];

export const TOKEN_COLORS: Record<string, string> = {};

// Assign colors to tokens
CFL_TOKENS.forEach((token, index) => {
  TOKEN_COLORS[token.symbol] = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
});

// Fallback color
TOKEN_COLORS.DEFAULT = '#888888';

export function getTokenColor(symbol: string): string {
  return TOKEN_COLORS[symbol] || TOKEN_COLORS.DEFAULT;
}

// Filter tokens by track
export function getTokensByTrack(track: TrackType | 'all'): Token[] {
  if (track === 'all') return CFL_TOKENS;
  return CFL_TOKENS.filter(t => t.track === track);
}

// Get tokens by category (for backwards compatibility)
export function getTokensByCategory(category: TokenCategory): Token[] {
  // All tokens are now from CFL data, category distinction is deprecated
  return CFL_TOKENS;
}

// Get track stats
export function getTrackStats() {
  return {
    aggressive: CFL_TOKENS.filter(t => t.track === 'aggressive').length,
    balanced: CFL_TOKENS.filter(t => t.track === 'balanced').length,
    moderate: CFL_TOKENS.filter(t => t.track === 'moderate').length,
    conservative: CFL_TOKENS.filter(t => t.track === 'conservative').length,
    total: CFL_TOKENS.length,
  };
}

// Get token by symbol
export function getTokenBySymbol(symbol: string): Token | undefined {
  return CFL_TOKENS.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
}

// Get token by Pyth feed ID
export function getTokenByPythFeedId(feedId: string): Token | undefined {
  return CFL_TOKENS.find(t => t.pythFeedId === feedId);
}

// Get all Pyth feed IDs
export function getAllPythFeedIds(): string[] {
  return CFL_TOKENS
    .filter(t => t.pythFeedId)
    .map(t => t.pythFeedId!);
}

// Load token list (async for backwards compatibility)
export async function loadTokenList(track?: TrackType | 'all'): Promise<Token[]> {
  if (track && track !== 'all') {
    return getTokensByTrack(track);
  }
  return CFL_TOKENS;
}

// Export the token list
export const DEFAULT_TOKENS = CFL_TOKENS;
export { CFL_TOKENS };

// Log stats on load (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const stats = getTrackStats();
  console.log(`[CFL Tokens] Loaded ${stats.total} tokens:`, stats);
}
