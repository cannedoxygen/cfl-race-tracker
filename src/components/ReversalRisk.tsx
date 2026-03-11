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

      <div className="flex-1 flex flex-col gap-1 overflow-hidden relative">
        {reversals.map((token, index) => {
          const isSelected = selectedToken === token.mint;

          return (
            <button
              key={token.mint}
              onClick={() => onSelectToken(isSelected ? null : token.mint)}
              className={clsx(
                'flex items-center gap-2 px-2 py-1 rounded transition-all',
                'border bg-cfl-bg/50 hover:bg-cfl-border/30',
                index === 0 ? 'border-cfl-red/50' : 'border-cfl-border/50',
                isSelected && 'ring-1 ring-cfl-pink'
              )}
            >
              {/* Rank */}
              <span className={clsx(
                'font-pixel text-[8px] w-4',
                index === 0 ? 'text-cfl-red' : 'text-cfl-text-muted'
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

              {/* Peak point */}
              <span className="font-pixel text-[6px] text-cfl-green">
                ↑{token.peakPoint.toFixed(2)}%
              </span>

              {/* Current change */}
              <span className={clsx(
                'font-pixel text-[8px] w-12 text-right',
                token.currentChange >= 0 ? 'text-cfl-green' : 'text-cfl-red'
              )}>
                {token.currentChange >= 0 ? '+' : ''}{token.currentChange.toFixed(2)}%
              </span>
            </button>
          );
        })}

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
