'use client';

import { useState, useEffect, useRef } from 'react';
import { RacePosition } from '@/types';
import Image from 'next/image';
import clsx from 'clsx';

interface Props {
  positions: RacePosition[];
  selectedToken: string | null;
  onSelectToken: (mint: string | null) => void;
}

interface HourlyMoverData {
  mint: string;
  symbol: string;
  logoURI: string;
  color: string;
  accumulatedVolatility: number;
  peakChange: number;
  direction: 'long' | 'short';
}

export function HourlyTopMover({ positions, selectedToken, onSelectToken }: Props) {
  const [topMover, setTopMover] = useState<HourlyMoverData | null>(null);
  const volatilityAccumulator = useRef<Map<string, { volatility: number; peakChange: number; lastUpdate: number }>>(new Map());
  const hourStartTime = useRef<number>(Date.now());

  // Reset hourly tracking every hour
  useEffect(() => {
    const checkHourReset = () => {
      const now = Date.now();
      const hourElapsed = now - hourStartTime.current >= 3600000; // 1 hour in ms

      if (hourElapsed) {
        volatilityAccumulator.current.clear();
        hourStartTime.current = now;
      }
    };

    const interval = setInterval(checkHourReset, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Accumulate volatility data
  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    positions.forEach(pos => {
      const existing = volatilityAccumulator.current.get(pos.mint);
      const absChange = Math.abs(pos.position);

      if (existing) {
        // Add to accumulated volatility (sum of absolute changes)
        volatilityAccumulator.current.set(pos.mint, {
          volatility: existing.volatility + absChange * 0.1, // Scale down since we update frequently
          peakChange: Math.max(existing.peakChange, absChange),
          lastUpdate: now,
        });
      } else {
        volatilityAccumulator.current.set(pos.mint, {
          volatility: absChange,
          peakChange: absChange,
          lastUpdate: now,
        });
      }
    });

    // Find the top mover based on accumulated volatility
    let bestMint: string | null = null;
    let bestVolatility = 0;

    volatilityAccumulator.current.forEach((data, mint) => {
      if (data.volatility > bestVolatility) {
        bestVolatility = data.volatility;
        bestMint = mint;
      }
    });

    if (bestMint) {
      const pos = positions.find(p => p.mint === bestMint);
      const accData = volatilityAccumulator.current.get(bestMint);

      if (pos && accData) {
        setTopMover({
          mint: pos.mint,
          symbol: pos.symbol,
          logoURI: pos.logoURI,
          color: pos.color,
          accumulatedVolatility: accData.volatility,
          peakChange: accData.peakChange,
          direction: pos.position >= 0 ? 'long' : 'short',
        });
      }
    }
  }, [positions]);

  // Calculate time remaining in current hour
  const getTimeRemaining = () => {
    const elapsed = Date.now() - hourStartTime.current;
    const remaining = Math.max(0, 3600000 - elapsed);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!topMover) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
            <span className="text-cfl-pink">*</span> HOURLY TOP MOVER
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-cfl-text-muted">
          <div className="text-center">
            <div className="text-2xl mb-1">*</div>
            <p className="font-pixel text-[8px]">TRACKING...</p>
          </div>
        </div>
      </div>
    );
  }

  const isSelected = selectedToken === topMover.mint;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
          <span className="text-cfl-pink">*</span> HOURLY TOP MOVER
        </h2>
        <span className="font-pixel-body text-xs text-cfl-pink">
          {timeRemaining} left
        </span>
      </div>

      <button
        onClick={() => onSelectToken(isSelected ? null : topMover.mint)}
        className={clsx(
          'flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-lg transition-all',
          'border-2 bg-gradient-to-br from-cfl-pink/10 to-cfl-purple/10 border-cfl-pink/30 hover:border-cfl-pink',
          isSelected && 'ring-2 ring-cfl-pink shadow-pink-glow'
        )}
      >
        {/* Token logo */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 border-cfl-pink/50"
          style={{ backgroundColor: `${topMover.color}30` }}
        >
          {topMover.logoURI ? (
            <Image
              src={topMover.logoURI}
              alt={topMover.symbol}
              width={40}
              height={40}
              className="rounded-full"
              unoptimized
            />
          ) : (
            <span className="font-pixel text-sm" style={{ color: topMover.color }}>
              {topMover.symbol.slice(0, 2)}
            </span>
          )}
        </div>

        {/* Symbol */}
        <span className="font-pixel-body text-xl text-white">
          {topMover.symbol}
        </span>

        {/* Stats row */}
        <div className="flex items-center gap-3">
          <span className={clsx(
            'font-pixel text-[8px] px-2 py-1 rounded border',
            topMover.direction === 'long'
              ? 'bg-cfl-green/20 text-cfl-green border-cfl-green/30'
              : 'bg-cfl-red/20 text-cfl-red border-cfl-red/30'
          )}>
            {topMover.direction === 'long' ? 'LONG' : 'SHORT'}
          </span>
          <span className="font-pixel text-[10px] text-cfl-gold">
            Peak: {topMover.peakChange.toFixed(2)}%
          </span>
        </div>

        {/* Volatility score */}
        <div className="text-center">
          <span className="font-pixel-body text-xs text-cfl-text-muted">Volatility Score</span>
          <div className="font-pixel text-sm text-cfl-pink">
            {topMover.accumulatedVolatility.toFixed(1)}
          </div>
        </div>
      </button>
    </div>
  );
}
