'use client';

import { useState, useEffect, useRef } from 'react';
import { RacePosition } from '@/types';
import Image from 'next/image';
import clsx from 'clsx';

type MetricType = 'hot' | 'momentum' | 'volatile' | 'trending';

interface Props {
  positions: RacePosition[];
  selectedToken: string | null;
  onSelectToken: (mint: string | null) => void;
  metric: MetricType;
}

interface MoverData {
  mint: string;
  symbol: string;
  logoURI: string;
  color: string;
  score: number;
  direction: 'long' | 'short';
  change: number;
}

interface TokenHistory {
  changes: number[];
  lastPrice: number;
  lastUpdate: number;
}

const TITLES: Record<MetricType, string> = {
  hot: 'HOT NOW',
  momentum: 'MOMENTUM',
  volatile: 'VOLATILE',
  trending: 'TRENDING',
};

const DESCRIPTIONS: Record<MetricType, string> = {
  hot: '5 min',
  momentum: '5 min',
  volatile: '5 min',
  trending: '5 min',
};

const INFO_DETAILS: Record<MetricType, string> = {
  hot: 'Tokens with the biggest price movement in the last 5 minutes. Great for catching sudden pumps or dumps.',
  momentum: 'Tokens where price is accelerating over 5 minutes. Moving slow then fast = high momentum.',
  volatile: 'Tokens with the most price swings in 5 minutes. High volatility = more opportunities but more risk.',
  trending: 'Tokens moving consistently in one direction over 5 minutes. Less choppy, more predictable.',
};

// Noisy tokens - low liquidity causes oracle price oscillation without real trades
const NOISY_TOKENS: Record<string, number> = {
  'babydoge': 0.3,  // 70% reduction - oracle noise without real volume
};

const getNoiseDampener = (symbol: string): number => {
  return NOISY_TOKENS[symbol.toLowerCase()] ?? 1.0;
};

export function SmartMovers({ positions, selectedToken, onSelectToken, metric }: Props) {
  const [topMovers, setTopMovers] = useState<MoverData[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());
  const maxHistoryLength = 150; // Keep last 150 data points (~5 minutes at 2s updates)

  // Track price history for calculations
  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    positions.forEach(pos => {
      const existing = historyRef.current.get(pos.mint);
      const currentChange = pos.position;

      if (existing) {
        // Add new change to history
        const newChanges = [...existing.changes, currentChange];
        // Keep only last N points
        if (newChanges.length > maxHistoryLength) {
          newChanges.shift();
        }
        historyRef.current.set(pos.mint, {
          changes: newChanges,
          lastPrice: currentChange,
          lastUpdate: now,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          lastPrice: currentChange,
          lastUpdate: now,
        });
      }
    });

    // Calculate scores based on metric type
    const scored = positions.map(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 2) {
        return { pos, score: 0 };
      }

      let score = 0;
      const changes = history.changes;

      switch (metric) {
        case 'hot':
          // HOT: Biggest absolute change in recent history (last few points)
          const recentChanges = changes.slice(-5);
          if (recentChanges.length >= 2) {
            const recentMove = Math.abs(recentChanges[recentChanges.length - 1] - recentChanges[0]);
            score = recentMove;
          }
          break;

        case 'momentum':
          // MOMENTUM: Is the rate of change increasing?
          // Compare velocity in first half vs second half
          if (changes.length >= 6) {
            const mid = Math.floor(changes.length / 2);
            const firstHalf = changes.slice(0, mid);
            const secondHalf = changes.slice(mid);

            const firstVelocity = (firstHalf[firstHalf.length - 1] - firstHalf[0]) / firstHalf.length;
            const secondVelocity = (secondHalf[secondHalf.length - 1] - secondHalf[0]) / secondHalf.length;

            // Acceleration = change in velocity (absolute, we want any acceleration)
            score = Math.abs(secondVelocity) - Math.abs(firstVelocity);
            // Boost if accelerating in same direction
            if (secondVelocity * firstVelocity > 0 && Math.abs(secondVelocity) > Math.abs(firstVelocity)) {
              score *= 1.5;
            }
          }
          break;

        case 'volatile':
          // VOLATILE: Standard deviation of changes (lots of swings)
          if (changes.length >= 3) {
            const diffs: number[] = [];
            for (let i = 1; i < changes.length; i++) {
              diffs.push(changes[i] - changes[i - 1]);
            }
            const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
            const variance = diffs.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / diffs.length;
            score = Math.sqrt(variance);
          }
          break;

        case 'trending':
          // TRENDING: Consistent direction (low variance in direction, high net movement)
          if (changes.length >= 5) {
            const netMove = changes[changes.length - 1] - changes[0];
            const direction = netMove >= 0 ? 1 : -1;

            // Count how many moves are in the same direction
            let consistentMoves = 0;
            for (let i = 1; i < changes.length; i++) {
              const moveDir = changes[i] - changes[i - 1];
              if ((moveDir >= 0 && direction >= 0) || (moveDir < 0 && direction < 0)) {
                consistentMoves++;
              }
            }
            const consistency = consistentMoves / (changes.length - 1);
            score = Math.abs(netMove) * consistency;
          }
          break;
      }

      // Apply noise dampening for known noisy tokens
      score *= getNoiseDampener(pos.symbol);

      return { pos, score };
    });

    // Sort by score and take top 5
    scored.sort((a, b) => b.score - a.score);

    const top5 = scored.slice(0, 5).map(({ pos, score }) => ({
      mint: pos.mint,
      symbol: pos.symbol,
      logoURI: pos.logoURI,
      color: pos.color,
      score,
      direction: pos.position >= 0 ? 'long' : 'short',
      change: pos.position,
    } as MoverData));

    setTopMovers(top5);
  }, [positions, metric]);

  const rankLabels = ['1ST', '2ND', '3RD', '4TH', '5TH'];
  const rankColors = ['text-cfl-pink', 'text-gray-400', 'text-amber-600', 'text-cfl-text-muted', 'text-cfl-text-muted'];
  const borderColors = ['border-cfl-pink', 'border-gray-400', 'border-amber-600', 'border-cfl-border', 'border-cfl-border'];

  if (topMovers.length === 0) {
    return (
      <div className="flex flex-col h-full relative">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center justify-between mb-2 w-full hover:opacity-80 transition-opacity"
        >
          <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
            <span className="text-cfl-pink">★</span> {TITLES[metric]}
            <span className="text-cfl-text-muted text-[6px]">ⓘ</span>
          </h2>
          <span className="font-pixel text-[6px] text-cfl-text-muted">{DESCRIPTIONS[metric]}</span>
        </button>

        <div className="flex-1 flex items-center justify-center text-cfl-text-muted relative">
          <p className="font-pixel text-[8px]">TRACKING...</p>

          {showInfo && (
            <div className="absolute bottom-0 left-0 right-0 bg-cfl-card border-2 border-cfl-pink rounded-lg p-2 shadow-lg animate-slideFromBottom z-10">
              <p className="font-pixel-body text-[10px] text-cfl-text-muted leading-relaxed">
                {INFO_DETAILS[metric]}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
                className="font-pixel text-[6px] text-cfl-pink mt-1 hover:underline"
              >
                GOT IT
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="flex items-center justify-between mb-2 w-full hover:opacity-80 transition-opacity"
      >
        <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
          <span className="text-cfl-pink">★</span> {TITLES[metric]}
          <span className="text-cfl-text-muted text-[6px]">ⓘ</span>
        </h2>
        <span className="font-pixel text-[6px] text-cfl-text-muted">{DESCRIPTIONS[metric]}</span>
      </button>

      {/* Horizontal scrollable cards */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden relative">
        <div className="flex gap-2 h-full min-w-max">
          {topMovers.map((mover, index) => {
            const isSelected = selectedToken === mover.mint;
            const absValue = Math.abs(mover.change);
            const barHeight = Math.min((absValue / 3) * 100, 100);

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

                  {/* Bottom: Badge + Change */}
                  <div className="flex flex-col items-center">
                    <span className={clsx(
                      'font-pixel text-[6px] px-1.5 py-0.5 rounded',
                      mover.direction === 'long' ? 'bg-cfl-green/30 text-cfl-green' : 'bg-cfl-red/30 text-cfl-red'
                    )}>
                      {mover.direction === 'long' ? 'LONG' : 'SHORT'}
                    </span>

                    <span className={clsx(
                      'font-pixel text-[8px] whitespace-nowrap mt-0.5',
                      mover.change >= 0 ? 'text-cfl-green' : 'text-cfl-red'
                    )}>
                      {mover.change >= 0 ? '+' : ''}{mover.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {showInfo && (
          <div className="absolute bottom-0 left-0 right-0 bg-cfl-card border-2 border-cfl-pink rounded-lg p-2 shadow-lg animate-slideFromBottom z-10">
            <p className="font-pixel-body text-[10px] text-cfl-text-muted leading-relaxed">
              {INFO_DETAILS[metric]}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
              className="font-pixel text-[6px] text-cfl-pink mt-1 hover:underline"
            >
              GOT IT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
