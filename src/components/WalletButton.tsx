'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { truncateAddress } from '@/lib/wallet';
import clsx from 'clsx';

export function WalletButton() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        'px-2 md:px-3 py-1.5 rounded-lg font-pixel-body text-xs font-bold transition-all border',
        connected
          ? 'bg-cfl-green/20 text-cfl-green border-cfl-green/30 hover:bg-cfl-green/30'
          : 'bg-cfl-purple/20 text-cfl-purple border-cfl-purple/30 hover:bg-cfl-purple/30 hover:shadow-purple-glow'
      )}
    >
      {connected && publicKey
        ? truncateAddress(publicKey.toBase58())
        : 'Connect'}
    </button>
  );
}
