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
  score: number;
  change: number;
  direction: 'long' | 'short';
}

interface TokenHistory {
  changes: number[];
  lastUpdate: number;
}

// Decay factor: score reduces by this much per second of inactivity
const DECAY_RATE = 0.02; // 2% per second
const MAX_HISTORY = 150; // Keep last 150 data points

export function HourlyTopMover({ positions, selectedToken, onSelectToken }: Props) {
  const [topMovers, setTopMovers] = useState<HourlyMoverData[]>([]);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());
  const hourStartTime = useRef<number>(Date.now());

  // Reset hourly tracking every hour
  useEffect(() => {
    const checkHourReset = () => {
      const now = Date.now();
      const hourElapsed = now - hourStartTime.current >= 3600000;

      if (hourElapsed) {
        historyRef.current.clear();
        hourStartTime.current = now;
      }
    };

    const interval = setInterval(checkHourReset, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate volatility score with decay
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
        historyRef.current.set(pos.mint, {
          changes: newChanges,
          lastUpdate: now,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          lastUpdate: now,
        });
      }
    });

    // Score each token based on recent volatility with decay
    const scored = positions.map(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 3) {
        return { pos, score: 0 };
      }

      const changes = history.changes;

      // Calculate volatility: sum of absolute differences (how much it's swinging)
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

      // Apply time decay - reduce score for tokens that haven't updated recently
      const timeSinceUpdate = now - history.lastUpdate;
      const decayFactor = Math.max(0, 1 - (DECAY_RATE * timeSinceUpdate / 1000));
      score *= decayFactor;

      return { pos, score };
    });

    // Sort by score and take top 3
    scored.sort((a, b) => b.score - a.score);

    const top3 = scored.slice(0, 3).map(({ pos, score }) => {
      const history = historyRef.current.get(pos.mint);
      const changes = history?.changes || [];
      const currentChange = changes.length > 0 ? changes[changes.length - 1] : pos.position;

      return {
        mint: pos.mint,
        symbol: pos.symbol,
        logoURI: pos.logoURI,
        color: pos.color,
        score,
        change: currentChange,
        direction: currentChange >= 0 ? 'long' : 'short',
      } as HourlyMoverData;
    });

    setTopMovers(top3);
  }, [positions]);

  // Time remaining
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

  const rankColors = ['border-cfl-gold', 'border-gray-400', 'border-amber-600'];
  const rankBgColors = ['from-cfl-gold/20', 'from-gray-400/20', 'from-amber-600/20'];
  const rankLabels = ['1ST', '2ND', '3RD'];

  if (topMovers.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
            <span className="text-cfl-pink">★</span> HOURLY TOP MOVERS
          </h2>
          <span className="font-pixel-body text-[10px] text-cfl-pink">{timeRemaining}</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-cfl-text-muted">
          <p className="font-pixel text-[8px]">TRACKING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
          <span className="text-cfl-pink">★</span> HOURLY TOP MOVERS
        </h2>
        <span className="font-pixel-body text-[10px] text-cfl-pink">{timeRemaining}</span>
      </div>

      {/* 3 big icons side by side */}
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
              {/* Rank label */}
              <span className={clsx(
                'font-pixel text-[8px] mb-1',
                index === 0 ? 'text-cfl-gold' : index === 1 ? 'text-gray-400' : 'text-amber-600'
              )}>
                {rankLabels[index]}
              </span>

              {/* Token logo */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2"
                style={{
                  backgroundColor: `${mover.color}30`,
                  borderColor: mover.color
                }}
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

              {/* Symbol */}
              <span className="font-pixel-body text-sm text-white mt-1 truncate max-w-full">
                {mover.symbol}
              </span>

              {/* Direction */}
              <span className={clsx(
                'font-pixel text-[6px] px-1.5 py-0.5 rounded mt-1',
                mover.direction === 'long'
                  ? 'bg-cfl-green/30 text-cfl-green'
                  : 'bg-cfl-red/30 text-cfl-red'
              )}>
                {mover.direction === 'long' ? 'LONG' : 'SHORT'}
              </span>

              {/* Current % */}
              <span className={clsx(
                'font-pixel text-[8px] mt-0.5',
                mover.change >= 0 ? 'text-cfl-green' : 'text-cfl-red'
              )}>
                {mover.change >= 0 ? '+' : ''}{mover.change.toFixed(2)}%
              </span>
            </button>
          );
        })}

        {/* Placeholder slots if less than 3 */}
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
