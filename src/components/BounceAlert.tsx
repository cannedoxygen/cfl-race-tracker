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

  const rankLabels = ['1ST', '2ND', '3RD', '4TH', '5TH'];
  const rankColors = ['text-cfl-orange', 'text-gray-400', 'text-amber-600', 'text-cfl-text-muted', 'text-cfl-text-muted'];
  const borderColors = ['border-cfl-orange', 'border-gray-400', 'border-amber-600', 'border-cfl-border', 'border-cfl-border'];

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

      {/* Horizontal scrollable cards */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden relative">
        <div className="flex gap-2 h-full min-w-max">
          {bounces.map((token, index) => {
            const isSelected = selectedToken === token.mint;
            const absValue = Math.abs(token.currentChange);
            const barHeight = Math.min((absValue / 3) * 100, 100); // Max at 3%

            return (
              <button
                key={token.mint}
                onClick={() => onSelectToken(isSelected ? null : token.mint)}
                className={clsx(
                  'w-20 flex flex-col items-center justify-end p-2 rounded-lg transition-all relative overflow-hidden flex-shrink-0',
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
                    backgroundColor: token.currentChange >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  }}
                />

                {/* Content */}
                <div className="relative flex flex-col items-center">
                  <span className={clsx('font-pixel text-[8px] mb-1', rankColors[index])}>
                    {rankLabels[index]}
                  </span>

                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2"
                    style={{ backgroundColor: `${token.color}30`, borderColor: token.color }}
                  >
                    {token.logoURI ? (
                      <Image
                        src={token.logoURI}
                        alt={token.symbol}
                        width={32}
                        height={32}
                        className="rounded-full"
                        unoptimized
                      />
                    ) : (
                      <span className="font-pixel text-xs" style={{ color: token.color }}>
                        {token.symbol.slice(0, 2)}
                      </span>
                    )}
                  </div>

                  <span className="font-pixel-body text-sm text-white mt-1 truncate max-w-full">
                    {token.symbol}
                  </span>

                  {/* LONG badge - these are bounce/long candidates */}
                  <span className="font-pixel text-[6px] px-1.5 py-0.5 rounded mt-1 bg-cfl-green/30 text-cfl-green">
                    LONG
                  </span>

                  {/* Low + Current change stacked */}
                  <div className="flex flex-col items-center mt-0.5 w-full">
                    <span className="font-pixel text-[6px] text-cfl-red whitespace-nowrap">
                      LOW {token.lowPoint.toFixed(1)}%
                    </span>
                    <span className={clsx(
                      'font-pixel text-[8px] whitespace-nowrap',
                      token.currentChange >= 0 ? 'text-cfl-green' : 'text-cfl-red'
                    )}>
                      {token.currentChange >= 0 ? '+' : ''}{token.currentChange.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

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
