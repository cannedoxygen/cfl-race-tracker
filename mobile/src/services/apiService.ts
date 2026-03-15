// API Service for CFL Mobile App
// Handles all HTTP requests to the backend

import { API_ENDPOINTS } from '../constants/api';
import { Token, ReferralEntry } from '../types';

// Token data from API
interface TokensResponse {
  success: boolean;
  data: Token[];
  count: number;
}

// Race prices from API
interface RacePricesResponse {
  prices: Array<{
    mint: string;
    symbol: string;
    price: number;
    percentChange: number;
    startPrice: number;
    boost: number;
    totalChange?: number;
  }>;
  raceStartTime: number;
  timestamp: number;
}

// Subscription status
interface SubscriptionResponse {
  active: boolean;
  expiresAt: string | null;
  vip: boolean;
}

// Jackpot info
interface JackpotResponse {
  totalJackpot: number;
  ticketCount: number;
  topUsers: Array<{
    wallet: string;
    tickets: number;
    skrDomain?: string;
  }>;
  lastWinner?: {
    wallet: string;
    prize: number;
    timestamp: number;
  };
}

// Fetch tokens from CFL API (requires wallet for subscription check)
export async function fetchTokens(wallet?: string): Promise<Token[]> {
  try {
    const walletParam = wallet ? `?wallet=${wallet}` : '';
    const response = await fetch(`${API_ENDPOINTS.tokens}${walletParam}`);
    if (!response.ok) throw new Error('Failed to fetch tokens');

    const data: TokensResponse = await response.json();

    // Transform API response to match our Token type
    const tokens = (data.data || []).map((t: any) => ({
      symbol: t.tokenSymbol || t.symbol,
      mint: t.coinGeckoId || t.tokenSymbol, // Use coinGeckoId as unique identifier
      name: t.tokenName || t.name,
      logoURI: t.tokenImageLogo || t.playerCard || '',
      boost: t.currentPower || 80,
      track: getTrackFromBoost(t.currentPower || 80),
      position: t.position,
      pythFeedId: t.solanaPythFeedId,
      pythLazerId: t.pythLazerId,
      coinGeckoId: t.coinGeckoId,
      exponent: t.exponent,
      playerCard: t.playerCard,
      priceChange24h: t.priceChange24h,
      priceChange7d: t.priceChange7d,
    }));

    return tokens;
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return [];
  }
}

// Helper to determine track from boost level
function getTrackFromBoost(boost: number): 'aggressive' | 'balanced' | 'moderate' | 'conservative' {
  if (boost >= 85) return 'aggressive';
  if (boost >= 80) return 'balanced';
  if (boost >= 75) return 'moderate';
  return 'conservative';
}

// Fetch race prices (requires wallet for subscription check)
export async function fetchRacePrices(action?: 'start' | 'reset', startTime?: number, wallet?: string): Promise<RacePricesResponse | null> {
  try {
    let url = API_ENDPOINTS.racePrices;
    const params = new URLSearchParams();

    if (wallet) params.set('wallet', wallet);
    if (action === 'start' && startTime) {
      params.set('action', 'start');
      params.set('startTime', startTime.toString());
    } else if (action === 'reset') {
      params.set('action', 'reset');
    }

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch prices');

    return await response.json();
  } catch (error) {
    console.error('Error fetching race prices:', error);
    return null;
  }
}

// Check subscription status
export async function checkSubscription(wallet: string): Promise<SubscriptionResponse> {
  try {
    const response = await fetch(`${API_ENDPOINTS.subscription}?wallet=${wallet}`);
    if (!response.ok) throw new Error('Failed to check subscription');

    return await response.json();
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { active: false, expiresAt: null, vip: false };
  }
}

// Verify payment transaction
export async function verifyPayment(walletAddress: string, txSignature: string): Promise<{ success: boolean; alreadyProcessed?: boolean }> {
  try {
    const response = await fetch(API_ENDPOINTS.verifyPayment, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, txSignature }),
    });

    return await response.json();
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { success: false };
  }
}

// Get jackpot info
export async function fetchJackpot(): Promise<JackpotResponse | null> {
  try {
    const response = await fetch(API_ENDPOINTS.jackpot);
    if (!response.ok) throw new Error('Failed to fetch jackpot');

    const data = await response.json();

    // Transform API response to match our expected format
    // API returns: totalLamports, topUsers with wallet_address/subscription_count
    // We need: totalJackpot, topUsers with wallet/tickets
    return {
      totalJackpot: (data.totalLamports || 0) / 1_000_000_000, // Convert lamports to SOL
      ticketCount: (data.topUsers || []).reduce((sum: number, u: any) => sum + (u.subscription_count || 0), 0),
      topUsers: (data.topUsers || []).map((u: any) => ({
        wallet: u.wallet_address || '',
        tickets: u.subscription_count || 0,
        skrDomain: data.domainNames?.[u.wallet_address],
      })),
      lastWinner: data.recentWinner ? {
        wallet: data.recentWinner.winnerWallet || '',
        prize: data.recentWinner.prizeSol || 0,
        timestamp: data.recentWinner.drawnAt ? new Date(data.recentWinner.drawnAt).getTime() : 0,
      } : undefined,
    };
  } catch (error) {
    console.error('Error fetching jackpot:', error);
    return null;
  }
}

// Submit referral entry
export async function submitReferralEntry(entry: {
  cflUsername: string;
  discordUsername?: string;
  twitterHandle?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(API_ENDPOINTS.referralEnter, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });

    return await response.json();
  } catch (error) {
    console.error('Error submitting referral:', error);
    return { success: false, message: 'Network error' };
  }
}

// Get referral entries for current week
export async function fetchReferralEntries(): Promise<ReferralEntry[]> {
  try {
    const response = await fetch(API_ENDPOINTS.referralEntries);
    if (!response.ok) throw new Error('Failed to fetch entries');

    const data = await response.json();
    return data.entries || [];
  } catch (error) {
    console.error('Error fetching referral entries:', error);
    return [];
  }
}
