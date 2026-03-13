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
  maxMove: number;     // Biggest absolute movement (volatility indicator)
  currentChange: number; // Rolling 60s change (like leaderboard)
  direction: 'long' | 'short';
}

interface TokenHistory {
  changes: number[];
  maxMove: number;   // Biggest absolute movement (shows volatility potential)
  lastUpdate: number;
}

// Decay rate: score reduces by this much per second of inactivity
const DECAY_RATE = 0.02; // 2% per second
const MAX_HISTORY = 150;

// Noisy tokens - low liquidity causes oracle price oscillation without real trades
// These get a dampening factor applied to their volatility score
const NOISY_TOKENS: Record<string, number> = {
  'babydoge': 0.3,  // 70% reduction - oracle noise without real volume
};

const getNoiseDampener = (symbol: string): number => {
  const lower = symbol.toLowerCase();
  return NOISY_TOKENS[lower] ?? 1.0; // Default: no dampening
};

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
      const absChange = Math.abs(currentChange);

      if (existing) {
        const newChanges = [...existing.changes, currentChange];
        if (newChanges.length > MAX_HISTORY) {
          newChanges.shift();
        }

        // Apply decay to maxMove, then update with new value if higher
        const timeSinceUpdate = now - existing.lastUpdate;
        const decayFactor = Math.max(0, 1 - (DECAY_RATE * timeSinceUpdate / 1000));
        const decayedMax = existing.maxMove * decayFactor;

        historyRef.current.set(pos.mint, {
          changes: newChanges,
          maxMove: Math.max(decayedMax, absChange),
          lastUpdate: now,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          maxMove: absChange,
          lastUpdate: now,
        });
      }
    });

    // Calculate volatility score for each token
    const scored = positions.map(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 3) {
        return { pos, score: 0, maxMove: 0 };
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

      // Apply noise dampening for known noisy tokens
      const noiseDampener = getNoiseDampener(pos.symbol);
      score *= noiseDampener;

      return { pos, score, maxMove: history.maxMove };
    });

    // Sort by score and take top N
    scored.sort((a, b) => b.score - a.score);

    const topN = scored.slice(0, topCount).map(({ pos, score, maxMove }) => ({
      mint: pos.mint,
      symbol: pos.symbol,
      logoURI: pos.logoURI,
      color: pos.color,
      score,
      maxMove,
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

  const rankLabels = ['1ST', '2ND', '3RD', '4TH', '5TH'];
  const rankColors = ['text-cfl-gold', 'text-gray-400', 'text-amber-600', 'text-cfl-text-muted', 'text-cfl-text-muted'];
  const borderColors = ['border-cfl-gold', 'border-gray-400', 'border-amber-600', 'border-cfl-border', 'border-cfl-border'];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
          <span className="text-cfl-pink">★</span> {title} TOP MOVERS
        </h2>
        <span className="font-pixel-body text-[10px] text-cfl-pink">{timeRemaining}</span>
      </div>

      {/* Horizontal scrollable cards */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-2 h-full min-w-max">
          {topMovers.map((mover, index) => {
            const isSelected = selectedToken === mover.mint;
            const absValue = Math.abs(mover.currentChange);
            const barHeight = Math.min((absValue / 3) * 100, 100); // Max at 3%

            return (
              <button
                key={mover.mint}
                onClick={() => onSelectToken(isSelected ? null : mover.mint)}
                className={clsx(
                  'w-20 flex flex-col items-center p-2 rounded-lg transition-all relative overflow-hidden flex-shrink-0',
                  `border-2 ${borderColors[index]}`,
                  'hover:scale-105',
                  isSelected && 'ring-2 ring-white shadow-lg'
                )}
              >
                {/* Progress bar from bottom */}
                <div
                  className="absolute left-0 right-0 bottom-0 transition-all duration-500"
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: mover.direction === 'long' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  }}
                />

                {/* Content - spread vertically */}
                <div className="relative flex flex-col items-center justify-between h-full w-full">
                  {/* Top: Rank */}
                  <span className={clsx('font-pixel text-[8px]', rankColors[index])}>
                    {rankLabels[index]}
                  </span>

                  {/* Middle: Logo + Symbol */}
                  <div className="flex flex-col items-center flex-1 justify-center">
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
                  </div>

                  {/* Bottom: Badge + Change + Max */}
                  <div className="flex flex-col items-center">
                    <span className={clsx(
                      'font-pixel text-[6px] px-1.5 py-0.5 rounded',
                      mover.direction === 'long' ? 'bg-cfl-green/30 text-cfl-green' : 'bg-cfl-red/30 text-cfl-red'
                    )}>
                      {mover.direction === 'long' ? 'LONG' : 'SHORT'}
                    </span>

                    <span className={clsx(
                      'font-pixel text-[8px] whitespace-nowrap mt-0.5',
                      mover.currentChange >= 0 ? 'text-cfl-green' : 'text-cfl-red'
                    )}>
                      {mover.currentChange >= 0 ? '+' : ''}{mover.currentChange.toFixed(2)}%
                    </span>
                    <span className="font-pixel text-[5px] text-cfl-gold whitespace-nowrap">
                      MAX {mover.maxMove.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
