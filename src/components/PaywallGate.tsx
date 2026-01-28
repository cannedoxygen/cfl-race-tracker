'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  Transaction,
  SystemProgram,
  PublicKey,
} from '@solana/web3.js';
import {
  TREASURY_ADDRESS,
  JACKPOT_ADDRESS,
  TREASURY_AMOUNT_LAMPORTS,
  JACKPOT_AMOUNT_LAMPORTS,
  SUBSCRIPTION_COST_SOL,
  truncateAddress,
} from '@/lib/wallet';
import { JackpotDisplay } from './JackpotDisplay';

interface Props {
  children: React.ReactNode;
}

type PaywallState = 'loading' | 'connect' | 'pay' | 'processing' | 'active';

export function PaywallGate({ children }: Props) {
  const { publicKey, connected, sendTransaction, disconnect } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [state, setState] = useState<PaywallState>('loading');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // CRITICAL: Default to false, only true when we VERIFY access
  const [hasVerifiedAccess, setHasVerifiedAccess] = useState(false);

  // Check subscription status
  const checkSubscription = useCallback(async () => {
    if (!publicKey) {
      setState('connect');
      setHasVerifiedAccess(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/subscription?wallet=${publicKey.toBase58()}`
      );
      const data = await response.json();

      if (data.active && (data.expiresAt || data.vip)) {
        if (data.vip) {
          setIsVip(true);
        }
        if (data.expiresAt) {
          setExpiresAt(new Date(data.expiresAt));
        }
        setState('active');
        setHasVerifiedAccess(true); // ONLY set true here
      } else {
        setState('pay');
        setHasVerifiedAccess(false);
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
      setState('pay');
      setHasVerifiedAccess(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      checkSubscription();
    } else {
      setState('connect');
      setHasVerifiedAccess(false);
    }
  }, [connected, publicKey, checkSubscription]);

  // Check if subscription expired (VIP never expires)
  useEffect(() => {
    if (!expiresAt || isVip) return;

    const checkExpiry = () => {
      if (new Date() >= expiresAt) {
        setState('pay');
        setExpiresAt(null);
        setHasVerifiedAccess(false); // Revoke access on expiry
      }
    };

    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, isVip]);

  const handleConnect = () => {
    setVisible(true);
  };

  const handlePay = async () => {
    if (!publicKey) return;

    setError(null);
    setState('processing');

    try {
      // Create transaction with two transfers
      const transaction = new Transaction();

      // Transfer to treasury (0.01 SOL)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: TREASURY_ADDRESS.value,
          lamports: TREASURY_AMOUNT_LAMPORTS,
        })
      );

      // Transfer to jackpot (0.01 SOL)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: JACKPOT_ADDRESS.value,
          lamports: JACKPOT_AMOUNT_LAMPORTS,
        })
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Verify payment with backend
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          txSignature: signature,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setExpiresAt(new Date(data.expiresAt));
        setState('active');
      } else {
        setError(data.error || 'Payment verification failed');
        setState('pay');
      }
    } catch (err: any) {
      console.error('Payment failed:', err);
      setError(err.message || 'Transaction failed');
      setState('pay');
    }
  };

  // CRITICAL: Only show app if we have VERIFIED access
  // This is the ONLY place children can be rendered
  if (hasVerifiedAccess && state === 'active') {
    return <>{children}</>;
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="h-screen bg-cfl-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cfl-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-pixel-body text-cfl-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Paywall screen
  return (
    <div className="h-screen bg-cfl-bg flex flex-col items-center justify-center p-4">
      <div className="card-pixel max-w-md w-full p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cfl-gold to-cfl-orange flex items-center justify-center text-3xl shadow-lg">
            🏁
          </div>
          <h1 className="font-pixel text-[10px] md:text-xs text-cfl-gold mb-2">
            CFL RACE
          </h1>
          <p className="font-pixel-body text-cfl-text-muted text-sm md:text-base">
            Real-time volatility racing for CFL tokens
          </p>
        </div>

        {/* Connect State */}
        {state === 'connect' && (
          <div className="space-y-4">
            <p className="font-pixel-body text-center text-cfl-text text-sm md:text-base">
              Connect your wallet to access the race
            </p>
            <button
              onClick={handleConnect}
              className="w-full py-3 px-4 bg-gradient-to-r from-cfl-purple to-purple-600 hover:from-purple-500 hover:to-purple-500 text-white font-pixel text-[8px] md:text-[10px] rounded-lg transition-all shadow-pixel-sm hover:shadow-purple-glow"
            >
              CONNECT WALLET
            </button>
          </div>
        )}

        {/* Pay State */}
        {state === 'pay' && publicKey && (
          <div className="space-y-4">
            <div className="bg-cfl-bg/50 rounded-lg p-4 border border-cfl-border">
              <p className="font-pixel-body text-cfl-text-muted text-xs mb-2">
                Connected as
              </p>
              <p className="font-pixel-body text-cfl-text text-sm">
                {truncateAddress(publicKey.toBase58(), 6)}
              </p>
            </div>

            <div className="bg-cfl-bg/50 rounded-lg p-4 border border-cfl-border">
              <p className="font-pixel-body text-cfl-text text-sm md:text-base mb-2">
                24-Hour Access Pass
              </p>
              <p className="font-pixel text-[14px] md:text-lg text-cfl-gold">
                {SUBSCRIPTION_COST_SOL} SOL
              </p>
              <p className="font-pixel-body text-cfl-text-muted text-xs mt-2">
                0.01 SOL goes to the jackpot pool
              </p>
            </div>

            {error && (
              <div className="bg-cfl-red/20 border border-cfl-red/50 rounded-lg p-3">
                <p className="font-pixel-body text-cfl-red text-xs">{error}</p>
              </div>
            )}

            <button
              onClick={handlePay}
              className="w-full py-3 px-4 bg-gradient-to-r from-cfl-green to-green-600 hover:from-green-500 hover:to-green-500 text-white font-pixel text-[8px] md:text-[10px] rounded-lg transition-all shadow-pixel-sm hover:shadow-green-glow"
            >
              PAY {SUBSCRIPTION_COST_SOL} SOL
            </button>

            <button
              onClick={() => disconnect()}
              className="w-full py-2 px-4 bg-transparent border border-cfl-border text-cfl-text-muted hover:text-white font-pixel-body text-xs rounded-lg transition-all"
            >
              Disconnect
            </button>
          </div>
        )}

        {/* Processing State */}
        {state === 'processing' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-cfl-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-pixel-body text-cfl-text">
              Processing payment...
            </p>
            <p className="font-pixel-body text-cfl-text-muted text-sm mt-2">
              Please confirm in your wallet
            </p>
          </div>
        )}
      </div>

      {/* Jackpot Display */}
      <div className="mt-6 max-w-md w-full">
        <JackpotDisplay />
      </div>
    </div>
  );
}
