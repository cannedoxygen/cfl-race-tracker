import { PublicKey } from '@solana/web3.js';

// Wallet addresses
export const TREASURY_ADDRESS = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '8VdX3RKQSTa98vaJsQiMoktcjYXNwaRcM3144KuodPcD'
);

export const JACKPOT_ADDRESS = new PublicKey(
  process.env.NEXT_PUBLIC_JACKPOT_ADDRESS || '5bY2BoRtUjEmDpTtRv6Z5CGWg3WW7WDEqXM4mnnLKEhd'
);

// Subscription cost in SOL
export const SUBSCRIPTION_COST_SOL = 0.02;
export const SUBSCRIPTION_COST_LAMPORTS = SUBSCRIPTION_COST_SOL * 1_000_000_000; // 20,000,000 lamports

// Split amounts
export const TREASURY_AMOUNT_LAMPORTS = 10_000_000; // 0.01 SOL
export const JACKPOT_AMOUNT_LAMPORTS = 10_000_000; // 0.01 SOL

// Subscription duration
export const SUBSCRIPTION_DURATION_HOURS = 24;
export const SUBSCRIPTION_DURATION_MS = SUBSCRIPTION_DURATION_HOURS * 60 * 60 * 1000;

// RPC endpoint - set via environment variable
export const SOLANA_RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

// Helper to truncate wallet address for display
export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
