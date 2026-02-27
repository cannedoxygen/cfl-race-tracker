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
  const [topMovers, setTopMovers] = useState<HourlyMoverData[]>([]);
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

    // Find top 3 movers based on accumulated volatility
    const sortedMovers: { mint: string; volatility: number }[] = [];
    volatilityAccumulator.current.forEach((data, mint) => {
      sortedMovers.push({ mint, volatility: data.volatility });
    });
    sortedMovers.sort((a, b) => b.volatility - a.volatility);

    const top3 = sortedMovers.slice(0, 3).map(({ mint }) => {
      const pos = positions.find(p => p.mint === mint);
      const accData = volatilityAccumulator.current.get(mint);

      if (pos && accData) {
        return {
          mint: pos.mint,
          symbol: pos.symbol,
          logoURI: pos.logoURI,
          color: pos.color,
          accumulatedVolatility: accData.volatility,
          peakChange: accData.peakChange,
          direction: pos.position >= 0 ? 'long' : 'short',
        } as HourlyMoverData;
      }
      return null;
    }).filter((m): m is HourlyMoverData => m !== null);

    setTopMovers(top3);
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

  const rankColors = ['text-cfl-gold', 'text-gray-400', 'text-amber-600'];
  const rankLabels = ['1ST', '2ND', '3RD'];

  if (topMovers.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
            <span className="text-cfl-pink">*</span> HOURLY MOVERS
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
          <span className="text-cfl-pink">*</span> HOURLY MOVERS
        </h2>
        <span className="font-pixel-body text-[10px] text-cfl-pink">
          {timeRemaining}
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
        {topMovers.map((mover, index) => {
          const isSelected = selectedToken === mover.mint;

          return (
            <button
              key={mover.mint}
              onClick={() => onSelectToken(isSelected ? null : mover.mint)}
              className={clsx(
                'flex items-center gap-2 p-1.5 rounded-lg transition-all',
                'border bg-cfl-bg/50 hover:bg-cfl-border/30',
                index === 0 ? 'border-cfl-pink/40' : 'border-cfl-border',
                isSelected && 'ring-1 ring-cfl-pink'
              )}
            >
              {/* Rank */}
              <span className={clsx('font-pixel text-[8px] w-6', rankColors[index])}>
                {rankLabels[index]}
              </span>

              {/* Token logo */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ backgroundColor: `${mover.color}30` }}
              >
                {mover.logoURI ? (
                  <Image
                    src={mover.logoURI}
                    alt={mover.symbol}
                    width={20}
                    height={20}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <span className="font-pixel text-[6px]" style={{ color: mover.color }}>
                    {mover.symbol.slice(0, 2)}
                  </span>
                )}
              </div>

              {/* Symbol */}
              <span className="font-pixel-body text-xs text-white flex-1 text-left truncate">
                {mover.symbol}
              </span>

              {/* Direction */}
              <span className={clsx(
                'font-pixel text-[6px] px-1 py-0.5 rounded',
                mover.direction === 'long'
                  ? 'bg-cfl-green/20 text-cfl-green'
                  : 'bg-cfl-red/20 text-cfl-red'
              )}>
                {mover.direction === 'long' ? 'L' : 'S'}
              </span>

              {/* Peak change */}
              <span className="font-pixel text-[8px] text-cfl-gold w-12 text-right">
                {mover.peakChange.toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
