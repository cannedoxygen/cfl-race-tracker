'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Transaction, SystemProgram } from '@solana/web3.js';
import {
  TREASURY_ADDRESS,
  JACKPOT_ADDRESS,
  TREASURY_AMOUNT_LAMPORTS,
  JACKPOT_AMOUNT_LAMPORTS,
  SUBSCRIPTION_COST_SOL,
} from '@/lib/wallet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ModalState = 'info' | 'connect' | 'processing';

export function SubscriptionModal({ isOpen, onClose, onSuccess }: Props) {
  // All hooks MUST be at the top, before any conditional returns
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<ModalState>('info');
  const [error, setError] = useState<string | null>(null);

  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const { publicKey, connected, sendTransaction } = wallet;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState('info');
      setError(null);
    }
  }, [isOpen]);

  // When wallet connects after clicking continue
  useEffect(() => {
    if (state === 'connect' && connected && publicKey) {
      handlePayment();
    }
  }, [state, connected, publicKey]);

  const handleContinue = async () => {
    setError(null);

    // If not connected, open wallet modal
    if (!connected || !publicKey) {
      setVisible(true);
      setState('connect');
      return;
    }

    // Process payment
    await handlePayment();
  };

  const handlePayment = async () => {
    if (!publicKey || !sendTransaction) return;

    setState('processing');

    try {
      const transaction = new Transaction();

      // Transfer to treasury (0.01 SOL)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: TREASURY_ADDRESS,
          lamports: TREASURY_AMOUNT_LAMPORTS,
        })
      );

      // Transfer to jackpot (0.01 SOL)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: JACKPOT_ADDRESS,
          lamports: JACKPOT_AMOUNT_LAMPORTS,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      // Verify with backend
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
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Payment verification failed');
        setState('info');
      }
    } catch (err: any) {
      console.error('Payment failed:', err);
      setError(err.message || 'Transaction failed');
      setState('info');
    }
  };

  // Don't render anything until client-side mounted or if not open
  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative card-pixel max-w-sm w-full mx-4 p-6">
        {state === 'processing' ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-cfl-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-pixel-body text-cfl-text">Processing payment...</p>
            <p className="font-pixel-body text-cfl-text-muted text-sm mt-2">
              Please confirm in your wallet
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-cfl-green to-green-600 flex items-center justify-center text-2xl shadow-lg">
                🏁
              </div>
              <h2 className="font-pixel text-[9px] md:text-[10px] text-cfl-gold">
                START RACING
              </h2>
            </div>

            {/* Cost Info */}
            <div className="bg-cfl-bg/50 rounded-lg p-4 border border-cfl-border mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-pixel-body text-cfl-text-muted text-sm">
                  24-Hour Access
                </span>
                <span className="font-pixel text-[12px] text-cfl-gold">
                  {SUBSCRIPTION_COST_SOL} SOL
                </span>
              </div>
              <div className="border-t border-cfl-border pt-3">
                <p className="font-pixel-body text-cfl-text-muted text-xs">
                  Where your SOL goes:
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-pixel-body text-cfl-text">Jackpot Pool</span>
                    <span className="font-pixel-body text-cfl-green">0.01 SOL</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-pixel-body text-cfl-text">Development</span>
                    <span className="font-pixel-body text-cfl-purple">0.01 SOL</span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-cfl-red/20 border border-cfl-red/50 rounded-lg p-3 mb-4">
                <p className="font-pixel-body text-cfl-red text-xs">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleContinue}
                className="w-full py-3 px-4 bg-gradient-to-r from-cfl-green to-green-600 hover:from-green-500 hover:to-green-500 text-white font-pixel text-[8px] md:text-[9px] rounded-lg transition-all shadow-pixel-sm hover:shadow-green-glow"
              >
                {connected ? 'PAY & START' : 'CONNECT & PAY'}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 px-4 bg-transparent border border-cfl-border text-cfl-text-muted hover:text-white font-pixel-body text-xs rounded-lg transition-all"
              >
                Maybe Later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
