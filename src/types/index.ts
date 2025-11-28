// CFL Track types based on boost level
export type TrackType = 'aggressive' | 'balanced' | 'moderate' | 'conservative';

// CFL Player positions (soccer-style)
export type PlayerPosition = 'GK' | 'CB' | 'LB' | 'RB' | 'DMF' | 'CMF' | 'AMF' | 'LMF' | 'RMF' | 'LWF' | 'RWF' | 'CF' | 'ST' | 'SS' | 'MF';

// Token metadata from CFL API - matches real data structure
export interface Token {
  // Basic identity
  symbol: string;           // tokenSymbol from API
  mint: string;             // Solana mint address (derived or placeholder)
  name: string;             // tokenName from API
  logoURI: string;          // tokenImageLogo from API

  // CFL game metrics
  boost: number;            // currentPower from API (70-90 scale)
  track: TrackType;         // Derived from boost
  position?: PlayerPosition; // Soccer position (CB, MF, ST, etc.)

  // Price feed integrations
  pythFeedId?: string;      // Pyth Network price feed ID
  solanaPythFeedId?: string; // Solana-specific Pyth feed
  pythLazerId?: string;     // Pyth Lazer feed ID
  coinGeckoId?: string;     // CoinGecko ID for price fetching
  exponent?: number;        // Price decimal exponent

  // CFL metadata
  playerCard?: string;      // NFT card image URL
  priceChange24h?: number;  // 24h price change %
  priceChange7d?: number;   // 7d price change %
  lastPower?: number;       // Previous power/boost value
}

// A single trade event
export interface TradeEvent {
  mint: string;
  symbol: string;
  type: 'buy' | 'sell';
  amountUsd: number;
  timestamp: number;
  signature?: string; // Transaction signature for deduplication
}

// CFL Match modes - determines scoring direction
export type MatchMode = 'long' | 'short';

// Momentum indicator
export type MomentumSignal = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';

// Race position for a token with CFL-relevant metrics
export interface RacePosition {
  mint: string;
  symbol: string;
  name: string;
  logoURI: string;
  color: string;
  position: number; // % price change from race start (like CFL scoring)
  normalizedPosition: number; // Scaled for chart display
  totalBuys: number; // Legacy - kept for compatibility
  totalSells: number; // Legacy - kept for compatibility
  tradeCount: number;
  history: Array<{ timestamp: number; position: number }>;

  // Price tracking (CFL-style)
  startPrice?: number; // Price 60s ago (for rolling calculation)
  currentPrice?: number; // Current price
  boost?: number; // Token boost multiplier from CFL
  totalChange?: number; // Total % change from race start (for reference)

  // CFL-relevant metrics
  buyCount: number; // Number of buy transactions
  sellCount: number; // Number of sell transactions
  buyRatio: number; // buys / (buys + sells), 0-1 scale
  velocity: number; // Rate of change in % (per update)
  momentum: MomentumSignal; // Overall momentum signal
  volumeSpike: boolean; // True if recent volume is abnormally high
  recentVolume: number; // Volume in last 60 seconds
  avgTradeSize: number; // Average trade size
  largestTrade: number; // Largest single trade
  lastTradeTime: number; // Timestamp of most recent trade
}

// Chart data point
export interface ChartDataPoint {
  timestamp: number;
  [tokenSymbol: string]: number | undefined;
}

// Race state
export type RaceStatus = 'idle' | 'racing' | 'paused';

// Chart view mode for volatility display
export type ChartViewMode = 'volatility' | 'change1m' | 'change5m';

// Price point (for reference data)
export interface PricePoint {
  timestamp: number;
  price: number;
}

// Legacy types kept for compatibility
export interface TokenPriceData {
  mint: string;
  symbol: string;
  currentPrice: number;
  priceHistory: PricePoint[];
  percentChange1m: number;
  percentChange5m: number;
  lastUpdated: number;
}

export interface VolatilityScore {
  mint: string;
  symbol: string;
  name: string;
  logoURI: string;
  score: number;
  normalizedScore: number;
  percentChange1m: number;
  percentChange5m: number;
  currentPrice: number;
  priceHistory: PricePoint[];
  color: string;
}
