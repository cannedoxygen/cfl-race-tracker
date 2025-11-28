// CFL Token Service
// Loads token data from CFL JSON files and provides real-time prices

import { Token, TrackType, PlayerPosition } from '@/types';
import { getTrackFromBoost, getTokenColor } from './tokens';
import { fetchPythPrices, TokenPrice, createPricePoller } from './pythService';

// Import the JSON data directly (Next.js will bundle this)
import tokenData from '@/data/tokens.json';

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

interface CFLApiResponse {
  success: boolean;
  data: CFLApiToken[];
  pagination?: Record<string, unknown>;
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

// Load all tokens from JSON file
function loadAllTokens(): Token[] {
  const apiTokens = (tokenData as CFLApiResponse).data;
  return apiTokens.map(convertCFLToken);
}

// Cached token list
let cachedTokens: Token[] | null = null;

// Get all CFL tokens
export function getCFLTokens(): Token[] {
  if (!cachedTokens) {
    cachedTokens = loadAllTokens();
  }
  return cachedTokens;
}

// Get tokens by track
export function getCFLTokensByTrack(track: TrackType | 'all'): Token[] {
  const tokens = getCFLTokens();
  if (track === 'all') return tokens;
  return tokens.filter(t => t.track === track);
}

// Get token by symbol
export function getCFLTokenBySymbol(symbol: string): Token | undefined {
  return getCFLTokens().find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
}

// Get all Pyth feed IDs
export function getAllPythFeedIds(): string[] {
  return getCFLTokens()
    .filter(t => t.pythFeedId)
    .map(t => t.pythFeedId!);
}

// Token with live price data
export interface TokenWithPrice extends Token {
  currentPrice?: number;
  priceConfidence?: number;
  emaPrice?: number;
  lastPriceUpdate?: number;
}

// Fetch current prices for all tokens
export async function getCFLTokensWithPrices(): Promise<TokenWithPrice[]> {
  const tokens = getCFLTokens();
  const feedIds = tokens
    .filter(t => t.pythFeedId)
    .map(t => t.pythFeedId!);

  const prices = await fetchPythPrices(feedIds);

  return tokens.map(token => {
    const price = token.pythFeedId ? prices.get(token.pythFeedId) : undefined;
    return {
      ...token,
      currentPrice: price?.price,
      priceConfidence: price?.confidence,
      emaPrice: price?.emaPrice,
      lastPriceUpdate: price?.publishTime,
    };
  });
}

// Create a price update subscription for tokens
export function subscribeToPrices(
  tokens: Token[],
  onUpdate: (prices: Map<string, TokenPrice>) => void,
  intervalMs: number = 1000
) {
  const feedIds = tokens
    .filter(t => t.pythFeedId)
    .map(t => t.pythFeedId!);

  return createPricePoller(feedIds, onUpdate, intervalMs);
}

// Get track statistics
export function getCFLTrackStats() {
  const tokens = getCFLTokens();
  return {
    aggressive: tokens.filter(t => t.track === 'aggressive').length,
    balanced: tokens.filter(t => t.track === 'balanced').length,
    moderate: tokens.filter(t => t.track === 'moderate').length,
    conservative: tokens.filter(t => t.track === 'conservative').length,
    total: tokens.length,
  };
}

// Export for use in components
export type { TokenPrice };
