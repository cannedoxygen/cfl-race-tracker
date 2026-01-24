'use client';

import { useMemo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { SOLANA_RPC_ENDPOINT } from '@/lib/wallet';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

// Dynamically import wallet components to avoid SSR issues
const WalletProviderInner = dynamic(
  () => import('./WalletProviderInner').then((mod) => mod.WalletProviderInner),
  { ssr: false }
);

export function WalletProvider({ children }: Props) {
  return <WalletProviderInner>{children}</WalletProviderInner>;
}
