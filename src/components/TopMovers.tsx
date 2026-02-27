'use client';

import { useState, useEffect, useRef } from 'react';
import { RacePosition } from '@/types';
import Image from 'next/image';
import clsx from 'clsx';

interface Props {
  positions: RacePosition[];
  selectedToken: string | null;
  onSelectToken: (mint: string | null) => void;
  intervalMinutes: number; // 5, 15, 30, or 60
  topCount: number; // how many to show (3 or 5)
}

interface MoverData {
  mint: string;
  symbol: string;
  logoURI: string;
  color: string;
  accumulatedVolatility: number;
  peakChange: number;
  direction: 'long' | 'short';
}

export function TopMovers({ positions, selectedToken, onSelectToken, intervalMinutes, topCount }: Props) {
  const [topMovers, setTopMovers] = useState<MoverData[]>([]);
  const volatilityAccumulator = useRef<Map<string, { volatility: number; peakChange: number; lastUpdate: number }>>(new Map());
  const intervalStartTime = useRef<number>(Date.now());
  const intervalMs = intervalMinutes * 60 * 1000;

  // Reset tracking at each interval
  useEffect(() => {
    const checkReset = () => {
      const now = Date.now();
      const elapsed = now - intervalStartTime.current >= intervalMs;

      if (elapsed) {
        volatilityAccumulator.current.clear();
        intervalStartTime.current = now;
      }
    };

    const interval = setInterval(checkReset, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [intervalMs]);

  // Accumulate volatility data
  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    positions.forEach(pos => {
      const existing = volatilityAccumulator.current.get(pos.mint);
      const absChange = Math.abs(pos.position);

      if (existing) {
        volatilityAccumulator.current.set(pos.mint, {
          volatility: existing.volatility + absChange * 0.1,
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

    // Find top movers
    const sortedMovers: { mint: string; volatility: number }[] = [];
    volatilityAccumulator.current.forEach((data, mint) => {
      sortedMovers.push({ mint, volatility: data.volatility });
    });
    sortedMovers.sort((a, b) => b.volatility - a.volatility);

    const topN = sortedMovers.slice(0, topCount).map(({ mint }) => {
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
        } as MoverData;
      }
      return null;
    }).filter((m): m is MoverData => m !== null);

    setTopMovers(topN);
  }, [positions, topCount]);

  // Time remaining
  const getTimeRemaining = () => {
    const elapsed = Date.now() - intervalStartTime.current;
    const remaining = Math.max(0, intervalMs - elapsed);
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
  }, [intervalMs]);

  const title = intervalMinutes === 60 ? 'HOURLY' : `${intervalMinutes} MIN`;

  if (topMovers.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
            <span className="text-cfl-pink">★</span> {title} TOP MOVERS
          </h2>
          <span className="font-pixel-body text-[10px] text-cfl-pink">{timeRemaining}</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-cfl-text-muted">
          <p className="font-pixel text-[8px]">TRACKING...</p>
        </div>
      </div>
    );
  }

  // For top 3 (hourly) - use big cards side by side
  if (topCount === 3) {
    const rankColors = ['border-cfl-gold', 'border-gray-400', 'border-amber-600'];
    const rankBgColors = ['from-cfl-gold/20', 'from-gray-400/20', 'from-amber-600/20'];
    const rankLabels = ['1ST', '2ND', '3RD'];

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
            <span className="text-cfl-pink">★</span> {title} TOP MOVERS
          </h2>
          <span className="font-pixel-body text-[10px] text-cfl-pink">{timeRemaining}</span>
        </div>

        <div className="flex-1 flex gap-2 items-stretch">
          {topMovers.map((mover, index) => {
            const isSelected = selectedToken === mover.mint;

            return (
              <button
                key={mover.mint}
                onClick={() => onSelectToken(isSelected ? null : mover.mint)}
                className={clsx(
                  'flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-all',
                  `border-2 ${rankColors[index]} bg-gradient-to-b ${rankBgColors[index]} to-transparent`,
                  'hover:scale-105',
                  isSelected && 'ring-2 ring-white shadow-lg'
                )}
              >
                <span className={clsx(
                  'font-pixel text-[8px] mb-1',
                  index === 0 ? 'text-cfl-gold' : index === 1 ? 'text-gray-400' : 'text-amber-600'
                )}>
                  {rankLabels[index]}
                </span>

                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2"
                  style={{ backgroundColor: `${mover.color}30`, borderColor: mover.color }}
                >
                  {mover.logoURI ? (
                    <Image
                      src={mover.logoURI}
                      alt={mover.symbol}
                      width={32}
                      height={32}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <span className="font-pixel text-xs" style={{ color: mover.color }}>
                      {mover.symbol.slice(0, 2)}
                    </span>
                  )}
                </div>

                <span className="font-pixel-body text-sm text-white mt-1 truncate max-w-full">
                  {mover.symbol}
                </span>

                <span className={clsx(
                  'font-pixel text-[6px] px-1.5 py-0.5 rounded mt-1',
                  mover.direction === 'long'
                    ? 'bg-cfl-green/30 text-cfl-green'
                    : 'bg-cfl-red/30 text-cfl-red'
                )}>
                  {mover.direction === 'long' ? 'LONG' : 'SHORT'}
                </span>

                <span className="font-pixel text-[8px] text-cfl-gold mt-0.5">
                  {mover.peakChange.toFixed(2)}%
                </span>
              </button>
            );
          })}

          {[...Array(3 - topMovers.length)].map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg border-2 border-cfl-border/30 bg-cfl-bg/30"
            >
              <span className="font-pixel text-[8px] text-cfl-text-muted">—</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // For top 5 - use compact list
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
          <span className="text-cfl-pink">★</span> {title} TOP MOVERS
        </h2>
        <span className="font-pixel-body text-[10px] text-cfl-pink">{timeRemaining}</span>
      </div>

      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
        {topMovers.map((mover, index) => {
          const isSelected = selectedToken === mover.mint;

          return (
            <button
              key={mover.mint}
              onClick={() => onSelectToken(isSelected ? null : mover.mint)}
              className={clsx(
                'flex items-center gap-2 px-2 py-1 rounded transition-all',
                'border bg-cfl-bg/50 hover:bg-cfl-border/30',
                index === 0 ? 'border-cfl-gold/50' : 'border-cfl-border/50',
                isSelected && 'ring-1 ring-cfl-pink'
              )}
            >
              {/* Rank */}
              <span className={clsx(
                'font-pixel text-[8px] w-4',
                index === 0 ? 'text-cfl-gold' : 'text-cfl-text-muted'
              )}>
                {index + 1}
              </span>

              {/* Logo */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ backgroundColor: `${mover.color}30` }}
              >
                {mover.logoURI ? (
                  <Image
                    src={mover.logoURI}
                    alt={mover.symbol}
                    width={16}
                    height={16}
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
                'font-pixel text-[6px] px-1 rounded',
                mover.direction === 'long'
                  ? 'bg-cfl-green/30 text-cfl-green'
                  : 'bg-cfl-red/30 text-cfl-red'
              )}>
                {mover.direction === 'long' ? 'L' : 'S'}
              </span>

              {/* Peak */}
              <span className="font-pixel text-[8px] text-cfl-gold w-12 text-right">
                {mover.peakChange.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
