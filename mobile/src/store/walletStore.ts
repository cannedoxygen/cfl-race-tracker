import { create } from 'zustand';

interface WalletState {
  // Wallet connection
  address: string | null;
  connected: boolean;

  // Subscription status
  isVip: boolean;
  expiresAt: Date | null;
  hasAccess: boolean;

  // Actions
  setWallet: (address: string | null) => void;
  setSubscription: (expiresAt: Date | null, isVip: boolean) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  // Initial state
  address: null,
  connected: false,
  isVip: false,
  expiresAt: null,
  hasAccess: false,

  // Set wallet address
  setWallet: (address: string | null) => {
    set({
      address,
      connected: !!address,
    });
  },

  // Set subscription status
  setSubscription: (expiresAt: Date | null, isVip: boolean) => {
    set({
      expiresAt,
      isVip,
      hasAccess: isVip || (expiresAt !== null && expiresAt > new Date()),
    });
  },

  // Disconnect wallet
  disconnect: () => {
    set({
      address: null,
      connected: false,
      isVip: false,
      expiresAt: null,
      hasAccess: false,
    });
  },
}));
