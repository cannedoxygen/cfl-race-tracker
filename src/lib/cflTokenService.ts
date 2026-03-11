// CFL Token Service
// Re-exports from main tokens module and adds price functionality

import { Token, TrackType } from '@/types';
import {
  getTokens,
  getTokensByTrack,
  getTokenBySymbol,
  getAllPythFeedIds,
  getTrackStats,
  refreshTokens,
  loadTokenList,
} from './tokens';
import { fetchPythPrices, TokenPrice, createPricePoller } from './pythService';

// Get all CFL tokens (calls refreshTokens if needed)
export async function getCFLTokens(): Promise<Token[]> {
  return loadTokenList();
}

// Get all CFL tokens synchronously (uses cache - call refreshTokens first)
export function getCFLTokensSync(): Token[] {
  return getTokens();
}

// Get tokens by track
export function getCFLTokensByTrack(track: TrackType | 'all'): Token[] {
  return getTokensByTrack(track);
}

// Get token by symbol
export function getCFLTokenBySymbol(symbol: string): Token | undefined {
  return getTokenBySymbol(symbol);
}

// Get all Pyth feed IDs
export function getCFLPythFeedIds(): string[] {
  return getAllPythFeedIds();
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
  const tokens = await getCFLTokens();
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
  return getTrackStats();
}

// Export for use in components
export type { TokenPrice };
export { refreshTokens };
