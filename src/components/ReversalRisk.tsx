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

interface ReversalData {
  mint: string;
  symbol: string;
  logoURI: string;
  color: string;
  reversalStrength: number;
  peakPoint: number; // The highest point it hit
  currentChange: number;
  addedAt: number;
}

interface TokenHistory {
  changes: number[];
  recentHigh: number;
  recentHighTime: number;
}

const WINDOW_SIZE = 60; // ~2 minutes of history at 2s updates
const REVERSAL_EXPIRE_MS = 300000; // Reversals expire after 5 minutes

export function ReversalRisk({ positions, selectedToken, onSelectToken }: Props) {
  const [reversals, setReversals] = useState<ReversalData[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());
  const activeReversals = useRef<Map<string, ReversalData>>(new Map());

  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    // Update history and track highs
    positions.forEach(pos => {
      const existing = historyRef.current.get(pos.mint);
      const currentChange = pos.position;

      if (existing) {
        const newChanges = [...existing.changes, currentChange];
        while (newChanges.length > WINDOW_SIZE) {
          newChanges.shift();
        }

        // Update recent high if we hit a new high
        let recentHigh = existing.recentHigh;
        let recentHighTime = existing.recentHighTime;

        if (currentChange > recentHigh) {
          recentHigh = currentChange;
          recentHighTime = now;
        }

        // Decay the high over time (forget old highs after 3 minutes)
        if (now - recentHighTime > 180000) {
          recentHigh = Math.max(...newChanges);
          recentHighTime = now;
        }

        historyRef.current.set(pos.mint, {
          changes: newChanges,
          recentHigh,
          recentHighTime,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          recentHigh: currentChange,
          recentHighTime: now,
        });
      }
    });

    // Find tokens showing reversal signs
    positions.forEach(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 5) return;

      const currentChange = pos.position;
      const recentHigh = history.recentHigh;
      const changes = history.changes;

      // Check if this is a reversal candidate:
      // 1. Had a significant pump (went above +0.3%)
      // 2. Current is below the high (pulling back)
      // 3. Has downward momentum (weakening)
      if (recentHigh <= 0.3) return;
      if (currentChange >= recentHigh) return;

      // Calculate pullback amount
      const pullback = recentHigh - currentChange;

      // Need at least 0.1% pullback to be considered
      if (pullback < 0.1) return;

      // Check recent momentum (last 5 points)
      const recentChanges = changes.slice(-5);
      if (recentChanges.length < 3) return;
      const recentVelocity = recentChanges[recentChanges.length - 1] - recentChanges[0];

      // Need negative or flat momentum to be a reversal candidate
      if (recentVelocity > 0.05) return;

      // Reversal strength = pullback amount * how far from peak
      const distanceFromPeak = (recentHigh - currentChange) / recentHigh;
      const reversalStrength = pullback * (1 + distanceFromPeak) * (1 - recentVelocity);

      const existingReversal = activeReversals.current.get(pos.mint);

      // Add or update reversal
      activeReversals.current.set(pos.mint, {
        mint: pos.mint,
        symbol: pos.symbol,
        logoURI: pos.logoURI,
        color: pos.color,
        reversalStrength,
        peakPoint: recentHigh,
        currentChange,
        addedAt: existingReversal?.addedAt || now,
      });
    });

    // Update current change for all active reversals
    activeReversals.current.forEach((reversal, mint) => {
      const pos = positions.find(p => p.mint === mint);
      if (pos) {
        reversal.currentChange = pos.position;
      }
    });

    // Remove expired reversals or those that have pumped back above their peak
    activeReversals.current.forEach((reversal, mint) => {
      const pos = positions.find(p => p.mint === mint);
      const expired = now - reversal.addedAt > REVERSAL_EXPIRE_MS;
      const pumpedBack = pos && pos.position >= reversal.peakPoint;

      if (expired || pumpedBack) {
        activeReversals.current.delete(mint);
      }
    });

    // Sort by reversal strength and take top 5
    const sortedReversals = Array.from(activeReversals.current.values())
      .sort((a, b) => b.reversalStrength - a.reversalStrength)
      .slice(0, 5);

    // Keep only top 5 in the active map
    const top5Mints = new Set(sortedReversals.map(r => r.mint));
    activeReversals.current.forEach((_, mint) => {
      if (!top5Mints.has(mint)) {
        activeReversals.current.delete(mint);
      }
    });

    setReversals(sortedReversals);
  }, [positions]);

  const rankLabels = ['1ST', '2ND', '3RD', '4TH', '5TH'];
  const rankColors = ['text-cfl-red', 'text-gray-400', 'text-amber-600', 'text-cfl-text-muted', 'text-cfl-text-muted'];
  const borderColors = ['border-cfl-red', 'border-gray-400', 'border-amber-600', 'border-cfl-border', 'border-cfl-border'];

  if (reversals.length === 0) {
    return (
      <div className="flex flex-col h-full relative">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center justify-between mb-2 w-full hover:opacity-80 transition-opacity"
        >
          <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
            <span className="text-cfl-red">⚠</span> REVERSAL RISK
            <span className="text-cfl-text-muted text-[6px]">ⓘ</span>
          </h2>
          <span className="font-pixel text-[6px] text-cfl-text-muted">5 min</span>
        </button>

        <div className="flex-1 flex items-center justify-center text-cfl-text-muted relative">
          <p className="font-pixel text-[8px]">NO REVERSALS</p>

          {showInfo && (
            <div className="absolute bottom-0 left-0 right-0 bg-cfl-card border-2 border-cfl-red rounded-lg p-2 shadow-lg animate-slideFromBottom z-10">
              <p className="font-pixel-body text-[10px] text-cfl-text-muted leading-relaxed">
                Tokens that pumped high and are now pulling back. Shows peak hit and current position. Good SHORT candidates for the next race.
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
                className="font-pixel text-[6px] text-cfl-red mt-1 hover:underline"
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
          <span className="text-cfl-red">⚠</span> REVERSAL RISK
          <span className="text-cfl-text-muted text-[6px]">ⓘ</span>
        </h2>
        <span className="font-pixel text-[6px] text-cfl-text-muted">5 min</span>
      </button>

      {/* Horizontal scrollable cards */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden relative">
        <div className="flex gap-2 h-full min-w-max">
          {reversals.map((token, index) => {
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

                  {/* SHORT badge - these are reversal/short candidates */}
                  <span className="font-pixel text-[6px] px-1.5 py-0.5 rounded mt-1 bg-cfl-red/30 text-cfl-red">
                    SHORT
                  </span>

                  {/* Peak + Current change stacked */}
                  <div className="flex flex-col items-center mt-0.5 w-full">
                    <span className="font-pixel text-[6px] text-cfl-green whitespace-nowrap">
                      PEAK {token.peakPoint.toFixed(1)}%
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
          <div className="absolute bottom-0 left-0 right-0 bg-cfl-card border-2 border-cfl-red rounded-lg p-2 shadow-lg animate-slideFromBottom z-10">
            <p className="font-pixel-body text-[10px] text-cfl-text-muted leading-relaxed">
              Tokens that pumped high and are now pulling back. Shows peak hit and current position. Good SHORT candidates for the next race.
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
              className="font-pixel text-[6px] text-cfl-red mt-1 hover:underline"
            >
              GOT IT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
