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

interface VelocityData {
  mint: string;
  symbol: string;
  logoURI: string;
  color: string;
  velocity: number; // Rate of change per second
  direction: 'accelerating' | 'decelerating' | 'steady';
  change: number;
}

interface TokenHistory {
  changes: number[];
  timestamps: number[];
}

const WINDOW_SIZE = 15; // 30 seconds at 2s updates

export function PreRaceVelocity({ positions, selectedToken, onSelectToken }: Props) {
  const [topVelocity, setTopVelocity] = useState<VelocityData[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());

  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    // Update history
    positions.forEach(pos => {
      const existing = historyRef.current.get(pos.mint);
      const currentChange = pos.position;

      if (existing) {
        const newChanges = [...existing.changes, currentChange];
        const newTimestamps = [...existing.timestamps, now];

        // Keep only last WINDOW_SIZE points
        while (newChanges.length > WINDOW_SIZE) {
          newChanges.shift();
          newTimestamps.shift();
        }

        historyRef.current.set(pos.mint, {
          changes: newChanges,
          timestamps: newTimestamps,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          timestamps: [now],
        });
      }
    });

    // Calculate velocity for each token
    const velocities = positions.map(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 3) {
        return { pos, velocity: 0, direction: 'steady' as const };
      }

      const changes = history.changes;
      const timestamps = history.timestamps;

      // Calculate velocity (change per second) over the window
      const timeDelta = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
      const changeDelta = changes[changes.length - 1] - changes[0];
      const velocity = timeDelta > 0 ? changeDelta / timeDelta : 0;

      // Determine if accelerating, decelerating, or steady
      let direction: 'accelerating' | 'decelerating' | 'steady' = 'steady';
      if (changes.length >= 6) {
        const mid = Math.floor(changes.length / 2);
        const firstHalfVelocity = (changes[mid] - changes[0]) / mid;
        const secondHalfVelocity = (changes[changes.length - 1] - changes[mid]) / (changes.length - mid);

        if (Math.abs(secondHalfVelocity) > Math.abs(firstHalfVelocity) * 1.2) {
          direction = 'accelerating';
        } else if (Math.abs(secondHalfVelocity) < Math.abs(firstHalfVelocity) * 0.8) {
          direction = 'decelerating';
        }
      }

      return { pos, velocity: Math.abs(velocity), direction, rawVelocity: velocity };
    });

    // Sort by absolute velocity and take top 5
    velocities.sort((a, b) => b.velocity - a.velocity);

    const top5 = velocities.slice(0, 5).map(({ pos, velocity, direction, rawVelocity }) => ({
      mint: pos.mint,
      symbol: pos.symbol,
      logoURI: pos.logoURI,
      color: pos.color,
      velocity: rawVelocity ?? velocity,
      direction,
      change: pos.position,
    } as VelocityData));

    setTopVelocity(top5);
  }, [positions]);

  const getDirectionIcon = (direction: string, velocity: number) => {
    if (direction === 'accelerating') return velocity >= 0 ? '⬆⬆' : '⬇⬇';
    if (direction === 'decelerating') return '→';
    return velocity >= 0 ? '⬆' : '⬇';
  };

  const getDirectionColor = (direction: string, velocity: number) => {
    if (direction === 'accelerating') return velocity >= 0 ? 'text-cfl-green' : 'text-cfl-red';
    if (direction === 'decelerating') return 'text-cfl-gold';
    return velocity >= 0 ? 'text-cfl-green' : 'text-cfl-red';
  };

  if (topVelocity.length === 0) {
    return (
      <div className="flex flex-col h-full relative">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center justify-between mb-2 w-full hover:opacity-80 transition-opacity"
        >
          <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
            <span className="text-cfl-teal">⚡</span> PRE-RACE VELOCITY
            <span className="text-cfl-text-muted text-[6px]">ⓘ</span>
          </h2>
          <span className="font-pixel text-[6px] text-cfl-text-muted">30s</span>
        </button>

        <div className="flex-1 flex items-center justify-center text-cfl-text-muted relative">
          <p className="font-pixel text-[8px]">TRACKING...</p>

          {showInfo && (
            <div className="absolute bottom-0 left-0 right-0 bg-cfl-card border-2 border-cfl-teal rounded-lg p-2 shadow-lg animate-slideFromBottom z-10">
              <p className="font-pixel-body text-[10px] text-cfl-text-muted leading-relaxed">
                Shows which tokens are moving fastest RIGHT NOW. High velocity = likely to continue in race. ⬆⬆ = accelerating, → = slowing down.
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
                className="font-pixel text-[6px] text-cfl-teal mt-1 hover:underline"
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
          <span className="text-cfl-teal">⚡</span> PRE-RACE VELOCITY
          <span className="text-cfl-text-muted text-[6px]">ⓘ</span>
        </h2>
        <span className="font-pixel text-[6px] text-cfl-text-muted">30s</span>
      </button>

      <div className="flex-1 flex flex-col gap-1 overflow-hidden relative">
        {topVelocity.map((token, index) => {
          const isSelected = selectedToken === token.mint;

          return (
            <button
              key={token.mint}
              onClick={() => onSelectToken(isSelected ? null : token.mint)}
              className={clsx(
                'flex items-center gap-2 px-2 py-1 rounded transition-all',
                'border bg-cfl-bg/50 hover:bg-cfl-border/30',
                index === 0 ? 'border-cfl-teal/50' : 'border-cfl-border/50',
                isSelected && 'ring-1 ring-cfl-pink'
              )}
            >
              {/* Rank */}
              <span className={clsx(
                'font-pixel text-[8px] w-4',
                index === 0 ? 'text-cfl-teal' : 'text-cfl-text-muted'
              )}>
                {index + 1}
              </span>

              {/* Logo */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ backgroundColor: `${token.color}30` }}
              >
                {token.logoURI ? (
                  <Image
                    src={token.logoURI}
                    alt={token.symbol}
                    width={16}
                    height={16}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <span className="font-pixel text-[6px]" style={{ color: token.color }}>
                    {token.symbol.slice(0, 2)}
                  </span>
                )}
              </div>

              {/* Symbol */}
              <span className="font-pixel-body text-xs text-white flex-1 text-left truncate">
                {token.symbol}
              </span>

              {/* Direction indicator */}
              <span className={clsx(
                'font-pixel text-[8px]',
                getDirectionColor(token.direction, token.velocity)
              )}>
                {getDirectionIcon(token.direction, token.velocity)}
              </span>

              {/* Velocity (change per second) */}
              <span className={clsx(
                'font-pixel text-[8px] w-14 text-right',
                token.velocity >= 0 ? 'text-cfl-green' : 'text-cfl-red'
              )}>
                {token.velocity >= 0 ? '+' : ''}{(token.velocity * 10).toFixed(2)}/s
              </span>
            </button>
          );
        })}

        {showInfo && (
          <div className="absolute bottom-0 left-0 right-0 bg-cfl-card border-2 border-cfl-teal rounded-lg p-2 shadow-lg animate-slideFromBottom z-10">
            <p className="font-pixel-body text-[10px] text-cfl-text-muted leading-relaxed">
              Shows which tokens are moving fastest RIGHT NOW. High velocity = likely to continue in race. ⬆⬆ = accelerating, → = slowing down.
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
              className="font-pixel text-[6px] text-cfl-teal mt-1 hover:underline"
            >
              GOT IT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
