'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import clsx from 'clsx';

export function SubscriptionTimer() {
  const { publicKey } = useWallet();
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--');
  const [isLow, setIsLow] = useState(false);

  // Fetch subscription status
  const fetchSubscription = useCallback(async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(
        `/api/subscription?wallet=${publicKey.toBase58()}`
      );
      const data = await response.json();

      if (data.active && data.expiresAt) {
        setExpiresAt(new Date(data.expiresAt));
      } else {
        setExpiresAt(null);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchSubscription();
    // Refresh every 5 minutes
    const interval = setInterval(fetchSubscription, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSubscription]);

  // Update countdown every second
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('--:--:--');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        setExpiresAt(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );

      // Warn when less than 1 hour
      setIsLow(hours < 1);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;

  return (
    <div
      className={clsx(
        'timer-pixel flex items-center gap-1.5 px-2 py-1',
        isLow && 'animate-pulse border-cfl-red'
      )}
    >
      <svg
        className={clsx('w-3 h-3', isLow ? 'text-cfl-red' : 'text-cfl-green')}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
      </svg>
      <span
        className={clsx(
          'text-xs font-mono',
          isLow ? 'text-cfl-red' : 'text-cfl-green'
        )}
      >
        {timeLeft}
      </span>
    </div>
  );
}
