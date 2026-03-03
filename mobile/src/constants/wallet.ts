// CFL Wallet Addresses and Payment Configuration

// Treasury wallet receives 50% of subscription payments
export const TREASURY_WALLET = '8VdX3RKQSTa98vaJsQiMoktcjYXNwaRcM3144KuodPcD';

// Jackpot wallet receives 50% of subscription payments for weekly drawing
export const JACKPOT_WALLET = '8BitDWkraozroK1yfVf2pW3T2kkCrzRVA9rEh5gL8f3m';

// VIP addresses get free access
export const VIP_ADDRESSES = [
  TREASURY_WALLET,
  JACKPOT_WALLET,
];

// Subscription cost in SOL
export const SUBSCRIPTION_COST_SOL = 0.02;

// Split: 50% to treasury, 50% to jackpot
export const TREASURY_SPLIT_SOL = 0.01;
export const JACKPOT_SPLIT_SOL = 0.01;

// Subscription duration in hours
export const SUBSCRIPTION_DURATION_HOURS = 24;

// Mobile Wallet Adapter app identity
export const APP_IDENTITY = {
  name: 'CFL Race',
  uri: 'https://cfl.gg',
  icon: 'favicon.ico',
} as const;
