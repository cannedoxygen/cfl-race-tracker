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
  bounceStrength: number; // How strong the recovery is
  lowPoint: number; // The lowest point it hit
  currentChange: number;
  recoveryPercent: number; // How much of the dip it's recovered
}

interface TokenHistory {
  changes: number[];
  recentLow: number;
  recentLowTime: number;
}

const WINDOW_SIZE = 30; // ~1 minute of history at 2s updates

export function BounceAlert({ positions, selectedToken, onSelectToken }: Props) {
  const [bounces, setBounces] = useState<BounceData[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());

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

        // Decay the low over time (forget old lows after 2 minutes)
        if (now - recentLowTime > 120000) {
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

    // Find tokens that are bouncing (were down, now recovering)
    const bouncingTokens = positions.map(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 5) {
        return null;
      }

      const currentChange = pos.position;
      const recentLow = history.recentLow;
      const changes = history.changes;

      // Only interested in tokens that:
      // 1. Had a significant dip (went below -0.3%)
      // 2. Are now recovering (current > low)
      // 3. Are moving upward in recent readings
      if (recentLow >= -0.3) return null;
      if (currentChange <= recentLow) return null;

      // Calculate recovery
      const recovery = currentChange - recentLow;
      const recoveryPercent = recentLow < 0 ? (recovery / Math.abs(recentLow)) * 100 : 0;

      // Only show if recovered at least 20% of the dip
      if (recoveryPercent < 20) return null;

      // Calculate bounce strength (velocity of recovery over last 5 points)
      const recentChanges = changes.slice(-5);
      if (recentChanges.length < 3) return null;

      const recentVelocity = recentChanges[recentChanges.length - 1] - recentChanges[0];

      // Only show if actually moving up
      if (recentVelocity <= 0) return null;

      const bounceStrength = recentVelocity * recoveryPercent;

      return {
        mint: pos.mint,
        symbol: pos.symbol,
        logoURI: pos.logoURI,
        color: pos.color,
        bounceStrength,
        lowPoint: recentLow,
        currentChange,
        recoveryPercent,
      } as BounceData;
    }).filter(Boolean) as BounceData[];

    // Sort by bounce strength
    bouncingTokens.sort((a, b) => b.bounceStrength - a.bounceStrength);

    setBounces(bouncingTokens.slice(0, 5));
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
          <span className="font-pixel text-[6px] text-cfl-text-muted">1 min</span>
        </button>

        <div className="flex-1 flex items-center justify-center text-cfl-text-muted relative">
          <p className="font-pixel text-[8px]">NO BOUNCES</p>

          {showInfo && (
            <div className="absolute bottom-0 left-0 right-0 bg-cfl-card border-2 border-cfl-orange rounded-lg p-2 shadow-lg animate-slideFromBottom z-10">
              <p className="font-pixel-body text-[10px] text-cfl-text-muted leading-relaxed">
                Tokens that dipped and are now recovering. Strong bounces often continue into the race. Shows low point and recovery %.
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
        <span className="font-pixel text-[6px] text-cfl-text-muted">1 min</span>
      </button>

      <div className="flex-1 flex flex-col gap-1 overflow-hidden relative">
        {bounces.map((token, index) => {
          const isSelected = selectedToken === token.mint;

          return (
            <button
              key={token.mint}
              onClick={() => onSelectToken(isSelected ? null : token.mint)}
              className={clsx(
                'flex items-center gap-2 px-2 py-1 rounded transition-all',
                'border bg-cfl-bg/50 hover:bg-cfl-border/30',
                index === 0 ? 'border-cfl-orange/50' : 'border-cfl-border/50',
                isSelected && 'ring-1 ring-cfl-pink'
              )}
            >
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
                ↓{token.lowPoint.toFixed(1)}%
              </span>

              {/* Recovery % */}
              <span className="font-pixel text-[8px] text-cfl-green w-10 text-right">
                +{Math.round(token.recoveryPercent)}%
              </span>
            </button>
          );
        })}

        {showInfo && (
          <div className="absolute bottom-0 left-0 right-0 bg-cfl-card border-2 border-cfl-orange rounded-lg p-2 shadow-lg animate-slideFromBottom z-10">
            <p className="font-pixel-body text-[10px] text-cfl-text-muted leading-relaxed">
              Tokens that dipped and are now recovering. Strong bounces often continue into the race. Shows low point and recovery %.
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
