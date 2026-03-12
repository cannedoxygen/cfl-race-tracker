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
  score: number;
  peakHigh: number;    // Highest positive peak
  peakLow: number;     // Lowest negative peak (stored as negative)
  currentChange: number; // Rolling 60s change (like leaderboard)
  direction: 'long' | 'short';
}

interface TokenHistory {
  changes: number[];
  peakHigh: number;  // Highest positive value
  peakLow: number;   // Lowest negative value (stored as negative)
  lastUpdate: number;
}

// Decay rate: score reduces by this much per second of inactivity
const DECAY_RATE = 0.02; // 2% per second
const MAX_HISTORY = 150;

export function TopMovers({ positions, selectedToken, onSelectToken, intervalMinutes, topCount }: Props) {
  const [topMovers, setTopMovers] = useState<MoverData[]>([]);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());
  const intervalStartTime = useRef<number>(Date.now());
  const intervalMs = intervalMinutes * 60 * 1000;

  // Reset tracking at each interval
  useEffect(() => {
    const checkReset = () => {
      const now = Date.now();
      const elapsed = now - intervalStartTime.current >= intervalMs;

      if (elapsed) {
        historyRef.current.clear();
        intervalStartTime.current = now;
      }
    };

    const interval = setInterval(checkReset, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [intervalMs]);

  // Track history and calculate scores with decay
  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    // Update history for each position
    positions.forEach(pos => {
      const existing = historyRef.current.get(pos.mint);
      const currentChange = pos.position;

      if (existing) {
        const newChanges = [...existing.changes, currentChange];
        if (newChanges.length > MAX_HISTORY) {
          newChanges.shift();
        }

        // Apply decay to peaks, then update with new value if more extreme
        const timeSinceUpdate = now - existing.lastUpdate;
        const decayFactor = Math.max(0, 1 - (DECAY_RATE * timeSinceUpdate / 1000));
        const decayedHigh = existing.peakHigh * decayFactor;
        const decayedLow = existing.peakLow * decayFactor;

        historyRef.current.set(pos.mint, {
          changes: newChanges,
          peakHigh: currentChange > 0 ? Math.max(decayedHigh, currentChange) : decayedHigh,
          peakLow: currentChange < 0 ? Math.min(decayedLow, currentChange) : decayedLow,
          lastUpdate: now,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          peakHigh: currentChange > 0 ? currentChange : 0,
          peakLow: currentChange < 0 ? currentChange : 0,
          lastUpdate: now,
        });
      }
    });

    // Calculate volatility score for each token
    const scored = positions.map(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 3) {
        return { pos, score: 0, peakHigh: 0, peakLow: 0 };
      }

      const changes = history.changes;

      // Calculate volatility: sum of absolute differences
      let volatilityScore = 0;
      for (let i = 1; i < changes.length; i++) {
        volatilityScore += Math.abs(changes[i] - changes[i - 1]);
      }

      // Weight recent changes more heavily
      const recentChanges = changes.slice(-10);
      let recentVolatility = 0;
      for (let i = 1; i < recentChanges.length; i++) {
        recentVolatility += Math.abs(recentChanges[i] - recentChanges[i - 1]);
      }

      // Combine overall + recent (recent weighted 2x)
      let score = volatilityScore + (recentVolatility * 2);

      // Apply time decay to score
      const timeSinceUpdate = now - history.lastUpdate;
      const decayFactor = Math.max(0, 1 - (DECAY_RATE * timeSinceUpdate / 1000));
      score *= decayFactor;

      return { pos, score, peakHigh: history.peakHigh, peakLow: history.peakLow };
    });

    // Sort by score and take top N
    scored.sort((a, b) => b.score - a.score);

    const topN = scored.slice(0, topCount).map(({ pos, score, peakHigh, peakLow }) => ({
      mint: pos.mint,
      symbol: pos.symbol,
      logoURI: pos.logoURI,
      color: pos.color,
      score,
      peakHigh,
      peakLow,
      currentChange: pos.position,
      direction: pos.position >= 0 ? 'long' : 'short',
    } as MoverData));

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

                {/* Two numbers: current rolling change + relevant peak */}
                <div className="flex flex-col items-center mt-0.5">
                  <span className={clsx(
                    'font-pixel text-[8px]',
                    mover.currentChange >= 0 ? 'text-cfl-green' : 'text-cfl-red'
                  )}>
                    {mover.currentChange >= 0 ? '+' : ''}{mover.currentChange.toFixed(2)}%
                  </span>
                  {/* Show relevant peak based on direction */}
                  {mover.direction === 'long' ? (
                    <span className="font-pixel text-[6px] text-cfl-green">
                      ⬆{mover.peakHigh.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="font-pixel text-[6px] text-cfl-red">
                      ⬇{Math.abs(mover.peakLow).toFixed(2)}%
                    </span>
                  )}
                </div>
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

              {/* Peak - show relevant peak based on direction */}
              <span className={clsx(
                'font-pixel text-[8px] w-12 text-right',
                mover.direction === 'long' ? 'text-cfl-green' : 'text-cfl-red'
              )}>
                {mover.direction === 'long'
                  ? `+${mover.peakHigh.toFixed(2)}%`
                  : `${mover.peakLow.toFixed(2)}%`
                }
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
