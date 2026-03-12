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

interface BounceData {
  mint: string;
  symbol: string;
  logoURI: string;
  color: string;
  bounceStrength: number;
  lowPoint: number;
  currentChange: number;
  addedAt: number; // When this bounce was detected
}

interface TokenHistory {
  changes: number[];
  recentLow: number;
  recentLowTime: number;
}

const WINDOW_SIZE = 60; // ~2 minutes of history at 2s updates
const BOUNCE_EXPIRE_MS = 300000; // Bounces expire after 5 minutes

export function BounceAlert({ positions, selectedToken, onSelectToken }: Props) {
  const [bounces, setBounces] = useState<BounceData[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());
  const activeBounces = useRef<Map<string, BounceData>>(new Map());

  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    // Update history and track lows
    positions.forEach(pos => {
      const existing = historyRef.current.get(pos.mint);
      const currentChange = pos.position;

      if (existing) {
        const newChanges = [...existing.changes, currentChange];
        while (newChanges.length > WINDOW_SIZE) {
          newChanges.shift();
        }

        // Update recent low if we hit a new low
        let recentLow = existing.recentLow;
        let recentLowTime = existing.recentLowTime;

        if (currentChange < recentLow) {
          recentLow = currentChange;
          recentLowTime = now;
        }

        // Decay the low over time (forget old lows after 3 minutes)
        if (now - recentLowTime > 180000) {
          recentLow = Math.min(...newChanges);
          recentLowTime = now;
        }

        historyRef.current.set(pos.mint, {
          changes: newChanges,
          recentLow,
          recentLowTime,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          recentLow: currentChange,
          recentLowTime: now,
        });
      }
    });

    // Find new bouncing tokens
    positions.forEach(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 5) return;

      const currentChange = pos.position;
      const recentLow = history.recentLow;
      const changes = history.changes;

      // Check if this is a bounce candidate:
      // 1. Had a significant dip (went below -0.2%)
      // 2. Current is above the low
      // 3. Has upward momentum
      if (recentLow >= -0.2) return;
      if (currentChange <= recentLow) return;

      // Calculate recovery amount
      const recovery = currentChange - recentLow;

      // Check recent momentum (last 5 points)
      const recentChanges = changes.slice(-5);
      if (recentChanges.length < 3) return;
      const recentVelocity = recentChanges[recentChanges.length - 1] - recentChanges[0];

      // Need positive momentum to be a bounce
      if (recentVelocity <= 0) return;

      // Bounce strength = recovery * momentum
      const bounceStrength = recovery * (1 + recentVelocity);

      const existingBounce = activeBounces.current.get(pos.mint);

      // Add or update bounce
      activeBounces.current.set(pos.mint, {
        mint: pos.mint,
        symbol: pos.symbol,
        logoURI: pos.logoURI,
        color: pos.color,
        bounceStrength,
        lowPoint: recentLow,
        currentChange,
        addedAt: existingBounce?.addedAt || now,
      });
    });

    // Update current change for all active bounces
    activeBounces.current.forEach((bounce, mint) => {
      const pos = positions.find(p => p.mint === mint);
      if (pos) {
        bounce.currentChange = pos.position;
      }
    });

    // Remove expired bounces or those that have gone negative again
    activeBounces.current.forEach((bounce, mint) => {
      const pos = positions.find(p => p.mint === mint);
      const expired = now - bounce.addedAt > BOUNCE_EXPIRE_MS;
      const goneNegativeAgain = pos && pos.position < bounce.lowPoint;

      if (expired || goneNegativeAgain) {
        activeBounces.current.delete(mint);
      }
    });

    // Sort by bounce strength and take top 5
    const sortedBounces = Array.from(activeBounces.current.values())
      .sort((a, b) => b.bounceStrength - a.bounceStrength)
      .slice(0, 5);

    // Keep only top 5 in the active map
    const top5Mints = new Set(sortedBounces.map(b => b.mint));
    activeBounces.current.forEach((_, mint) => {
      if (!top5Mints.has(mint)) {
        activeBounces.current.delete(mint);
      }
    });

    setBounces(sortedBounces);
  }, [positions]);

  if (bounces.length === 0) {
    return (
      <div className="flex flex-col h-full relative">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center justify-between mb-2 w-full hover:opacity-80 transition-opacity"
        >
          <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
            <span className="text-cfl-orange">↩</span> BOUNCE ALERT
            <span className="text-cfl-text-muted text-[6px]">ⓘ</span>
          </h2>
          <span className="font-pixel text-[6px] text-cfl-text-muted">5 min</span>
        </button>

        <div className="flex-1 flex items-center justify-center text-cfl-text-muted relative">
          <p className="font-pixel text-[8px]">NO BOUNCES</p>

          {showInfo && (
            <div className="absolute bottom-0 left-0 right-0 bg-cfl-card border-2 border-cfl-orange rounded-lg p-2 shadow-lg animate-slideFromBottom z-10">
              <p className="font-pixel-body text-[10px] text-cfl-text-muted leading-relaxed">
                Tokens that dipped negative and are now recovering. Shows the low point hit and current position. Strong bounces often continue into the race.
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
                className="font-pixel text-[6px] text-cfl-orange mt-1 hover:underline"
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
          <span className="text-cfl-orange">↩</span> BOUNCE ALERT
          <span className="text-cfl-text-muted text-[6px]">ⓘ</span>
        </h2>
        <span className="font-pixel text-[6px] text-cfl-text-muted">5 min</span>
      </button>

      <div className="flex-1 flex flex-col gap-1 overflow-hidden relative">
        {bounces.map((token, index) => {
          const isSelected = selectedToken === token.mint;
          const absValue = Math.abs(token.currentChange);
          const barWidth = Math.min((absValue / 3) * 100, 100); // Max at 3%

          return (
            <button
              key={token.mint}
              onClick={() => onSelectToken(isSelected ? null : token.mint)}
              className={clsx(
                'flex items-center gap-2 px-2 py-1 rounded transition-all relative overflow-hidden',
                'border bg-cfl-bg/50 hover:bg-cfl-border/30',
                index === 0 ? 'border-cfl-orange/50' : 'border-cfl-border/50',
                isSelected && 'ring-1 ring-cfl-pink'
              )}
            >
              {/* Progress bar */}
              <div
                className="absolute left-0 top-0 bottom-0 transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: token.currentChange >= 0 ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                }}
              />

              {/* Content */}
              <div className="relative flex items-center gap-2 w-full">
                {/* Rank */}
                <span className={clsx(
                  'font-pixel text-[8px] w-4',
                  index === 0 ? 'text-cfl-orange' : 'text-cfl-text-muted'
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

                {/* Low point */}
                <span className="font-pixel text-[6px] text-cfl-red">
                  ↓{token.lowPoint.toFixed(2)}%
                </span>

                {/* Current change */}
                <span className={clsx(
                  'font-pixel text-[8px] w-12 text-right',
                  token.currentChange >= 0 ? 'text-cfl-green' : 'text-cfl-red'
                )}>
                  {token.currentChange >= 0 ? '+' : ''}{token.currentChange.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}

        {showInfo && (
          <div className="absolute bottom-0 left-0 right-0 bg-cfl-card border-2 border-cfl-orange rounded-lg p-2 shadow-lg animate-slideFromBottom z-10">
            <p className="font-pixel-body text-[10px] text-cfl-text-muted leading-relaxed">
              Tokens that dipped negative and are now recovering. Shows the low point hit and current position. Strong bounces often continue into the race.
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
              className="font-pixel text-[6px] text-cfl-orange mt-1 hover:underline"
            >
              GOT IT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
