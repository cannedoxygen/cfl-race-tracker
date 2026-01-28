import { PublicKey } from '@solana/web3.js';

// Wallet addresses - hardcoded to avoid build-time env var issues
const TREASURY_ADDRESS_STRING = '8VdX3RKQSTa98vaJsQiMoktcjYXNwaRcM3144KuodPcD';
const JACKPOT_ADDRESS_STRING = '5bY2BoRtUjEmDpTtRv6Z5CGWg3WW7WDEqXM4mnnLKEhd';

// Lazy-loaded PublicKey instances
let _treasuryAddress: PublicKey | null = null;
let _jackpotAddress: PublicKey | null = null;

export const TREASURY_ADDRESS = {
  get value(): PublicKey {
    if (!_treasuryAddress) {
      _treasuryAddress = new PublicKey(TREASURY_ADDRESS_STRING);
    }
    return _treasuryAddress;
  },
  toBase58(): string {
    return TREASURY_ADDRESS_STRING;
  }
};

export const JACKPOT_ADDRESS = {
  get value(): PublicKey {
    if (!_jackpotAddress) {
      _jackpotAddress = new PublicKey(JACKPOT_ADDRESS_STRING);
    }
    return _jackpotAddress;
  },
  toBase58(): string {
    return JACKPOT_ADDRESS_STRING;
  }
};

// Subscription cost in SOL
export const SUBSCRIPTION_COST_SOL = 0.02;
export const SUBSCRIPTION_COST_LAMPORTS = SUBSCRIPTION_COST_SOL * 1_000_000_000; // 20,000,000 lamports

// Split amounts
export const TREASURY_AMOUNT_LAMPORTS = 10_000_000; // 0.01 SOL
export const JACKPOT_AMOUNT_LAMPORTS = 10_000_000; // 0.01 SOL

// Subscription duration
export const SUBSCRIPTION_DURATION_HOURS = 24;
export const SUBSCRIPTION_DURATION_MS = SUBSCRIPTION_DURATION_HOURS * 60 * 60 * 1000;

// VIP wallets that play for free
export const VIP_WALLETS = [
  '8VdX3RKQSTa98vaJsQiMoktcjYXNwaRcM3144KuodPcD',
  '7wkDoaFHXgmFjpKMSZZL7mg3c8bHLErSQ6QwhcDTXU8R',
];

export function isVipWallet(walletAddress: string): boolean {
  return VIP_WALLETS.includes(walletAddress);
}

// RPC endpoint - set via environment variable
export const SOLANA_RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

// Helper to truncate wallet address for display
export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
