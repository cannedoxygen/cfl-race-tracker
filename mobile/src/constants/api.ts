// API Configuration for CFL Mobile App
// Your web app is deployed on Vercel

export const API_BASE = 'https://cfladvantage.vercel.app/api';

// Direct CFL backend endpoints (Railway)
export const CFL_BACKEND = 'https://v12-cfl-backend-production.up.railway.app';
export const CFL_PRICE_SSE = 'https://price-ingestor-production.up.railway.app/sse/prices';

// API Endpoints
export const API_ENDPOINTS = {
  tokens: `${API_BASE}/tokens`,
  racePrices: `${API_BASE}/race-prices`,
  subscription: `${API_BASE}/subscription`,
  verifyPayment: `${API_BASE}/verify-payment`,
  jackpot: `${API_BASE}/jackpot`,
  referralEnter: `${API_BASE}/referral/enter`,
  referralEntries: `${API_BASE}/referral/entries`,
} as const;

// Polling intervals (in milliseconds)
export const POLLING_INTERVALS = {
  prices: 2000,      // 2 seconds for race prices
  subscription: 60000, // 1 minute for subscription status
  jackpot: 5000,     // 5 seconds for jackpot balance
} as const;

// Solana RPC Configuration
export const SOLANA_RPC = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
} as const;
