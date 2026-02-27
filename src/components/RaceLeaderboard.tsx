'use client';

import { RacePosition, MatchMode, MomentumSignal, TrackType } from '@/types';
import clsx from 'clsx';
import Image from 'next/image';
import { getTrackFromBoost } from '@/lib/tokens';

// Track colors: yellow=conservative, blue=moderate, red=aggressive
function getTrackColor(track: TrackType): string {
  switch (track) {
    case 'aggressive':
      return '#EF4444'; // red-500
    case 'balanced':
      return '#F97316'; // orange-500
    case 'moderate':
      return '#3B82F6'; // blue-500
    case 'conservative':
      return '#EAB308'; // yellow-500
    default:
      return '#6B7280'; // gray-500
  }
}

function getTrackBgClass(track: TrackType): string {
  switch (track) {
    case 'aggressive':
      return 'bg-red-500/30';
    case 'balanced':
      return 'bg-orange-500/30';
    case 'moderate':
      return 'bg-blue-500/30';
    case 'conservative':
      return 'bg-yellow-500/30';
    default:
      return 'bg-gray-500/30';
  }
}

interface Props {
  positions: RacePosition[];
  selectedToken: string | null;
  onSelectToken: (mint: string | null) => void;
  matchMode: MatchMode;
  compact?: boolean;
}

function getMomentumIcon(momentum: MomentumSignal): string {
  switch (momentum) {
    case 'strong_buy':
      return '🚀';
    case 'buy':
      return '📈';
    case 'neutral':
      return '➡️';
    case 'sell':
      return '📉';
    case 'strong_sell':
      return '💥';
    default:
      return '➡️';
  }
}

export function RaceLeaderboard({ positions, selectedToken, onSelectToken, matchMode, compact }: Props) {
  // Sort by ABSOLUTE value - biggest movers win regardless of direction
  const sortedPositions = [...positions].sort((a, b) => Math.abs(b.position) - Math.abs(a.position));

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h2 className="font-pixel text-[8px] text-white flex items-center gap-1.5">
          <span className="text-cfl-gold">🏆</span> LEADERBOARD
        </h2>
        <span className="font-pixel-body text-xs text-cfl-gold">
          Biggest % wins
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-0">
        {sortedPositions.map((pos, index) => {
          const isSelected = selectedToken === pos.mint;
          const rankColor =
            index === 0
              ? 'text-cfl-gold'
              : index === 1
              ? 'text-gray-300'
              : index === 2
              ? 'text-cfl-orange'
              : 'text-cfl-text-muted';

          const isPositive = pos.position >= 0;
          const absValue = Math.abs(pos.position);

          // Get track from boost
          const track = pos.boost ? getTrackFromBoost(pos.boost) : 'conservative';
          const trackColor = getTrackColor(track);

          // Calculate bar width (max 100% at say 5% price change)
          const maxPercent = 5;
          const barWidth = Math.min((absValue / maxPercent) * 100, 100);

          if (compact) {
            // Compact single-row layout - all racing UP (absolute values)
            return (
              <button
                key={pos.mint}
                onClick={() => onSelectToken(isSelected ? null : pos.mint)}
                className={clsx(
                  'w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all relative overflow-hidden',
                  'border-2 bg-cfl-bg/50 border-cfl-border hover:border-cfl-text-muted',
                  isSelected && 'ring-2 ring-cfl-gold shadow-gold-glow'
                )}
              >
                {/* Progress bar background */}
                <div
                  className="absolute left-0 top-0 bottom-0 opacity-40 transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: trackColor,
                  }}
                />

                {/* Content (above the bar) */}
                <div className="relative flex items-center gap-2 w-full">
                  {/* Rank */}
                  <div className={clsx('w-6 text-center font-pixel text-[8px]', rankColor)}>
                    {index === 0 ? '👑' : index + 1}
                  </div>

                  {/* Token logo */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border border-cfl-border"
                    style={{ backgroundColor: `${pos.color}20` }}
                  >
                    {pos.logoURI ? (
                      <Image
                        src={pos.logoURI}
                        alt={pos.symbol}
                        width={20}
                        height={20}
                        className="rounded-full"
                        unoptimized
                      />
                    ) : (
                      <span className="font-pixel text-[6px]" style={{ color: pos.color }}>
                        {pos.symbol.slice(0, 2)}
                      </span>
                    )}
                  </div>

                  {/* Symbol + Direction */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-pixel-body text-base text-white truncate">
                      {pos.symbol}
                    </span>
                    <span className={clsx(
                      'font-pixel text-[6px] px-1.5 py-0.5 rounded border',
                      isPositive
                        ? 'bg-cfl-green/20 text-cfl-green border-cfl-green/30'
                        : 'bg-cfl-red/20 text-cfl-red border-cfl-red/30'
                    )}>
                      {isPositive ? 'LONG' : 'SHORT'}
                    </span>
                  </div>

                  {/* % - All displayed as positive (racing UP) */}
                  <div className="font-pixel text-[8px] min-w-[60px] text-right text-cfl-gold">
                    {absValue.toFixed(2)}%
                  </div>
                </div>
              </button>
            );
          }

          // Full layout (non-compact) - all racing UP
          return (
            <button
              key={pos.mint}
              onClick={() => onSelectToken(isSelected ? null : pos.mint)}
              className={clsx(
                'w-full flex flex-col gap-2 p-3 rounded-lg transition-all relative overflow-hidden',
                'border-2 bg-cfl-bg/50 border-cfl-border hover:border-cfl-text-muted',
                isSelected && 'ring-2 ring-cfl-gold shadow-gold-glow'
              )}
            >
              {/* Progress bar background */}
              <div
                className="absolute left-0 top-0 bottom-0 opacity-40 transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: trackColor,
                }}
              />

              {/* Content (above the bar) */}
              <div className="relative">
                {/* Top Row: Rank, Logo, Symbol, % */}
                <div className="flex items-center gap-2">
                  {/* Rank */}
                  <div
                    className={clsx(
                      'w-7 h-7 flex items-center justify-center rounded font-pixel text-[8px]',
                      rankColor,
                      index < 3 ? 'bg-white/10' : 'bg-cfl-border'
                    )}
                  >
                    {index === 0 ? '👑' : index + 1}
                  </div>

                  {/* Token logo */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-cfl-border"
                    style={{ backgroundColor: `${pos.color}20` }}
                  >
                    {pos.logoURI ? (
                      <Image
                        src={pos.logoURI}
                        alt={pos.symbol}
                        width={24}
                        height={24}
                        className="rounded-full"
                        unoptimized
                      />
                    ) : (
                      <span
                        className="font-pixel text-[7px]"
                        style={{ color: pos.color }}
                      >
                        {pos.symbol.slice(0, 2)}
                      </span>
                    )}
                  </div>

                  {/* Token info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-pixel-body text-lg text-white truncate">
                        {pos.symbol}
                      </span>
                      <span className="text-sm">
                        {getMomentumIcon(pos.momentum)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={clsx(
                        'font-pixel text-[6px] px-1.5 py-0.5 rounded border',
                        isPositive
                          ? 'bg-cfl-green/20 text-cfl-green border-cfl-green/30'
                          : 'bg-cfl-red/20 text-cfl-red border-cfl-red/30'
                      )}>
                        {isPositive ? 'LONG' : 'SHORT'}
                      </span>
                    </div>
                  </div>

                  {/* % - displayed as positive (racing UP) */}
                  <div className="text-right">
                    <div className="font-pixel text-[10px] text-cfl-gold">
                      {absValue.toFixed(2)}%
                    </div>
                    <div className="font-pixel-body text-xs text-cfl-text-muted">60s rolling</div>
                  </div>
                </div>

                {/* Bottom Row: Price info if available */}
                {(pos.startPrice || pos.currentPrice) && (
                  <div className="flex items-center gap-2 px-1 pt-2 border-t border-cfl-border/30 font-pixel-body text-sm text-cfl-text-muted mt-2">
                    <span>Price: ${pos.currentPrice?.toFixed(6) || '?'}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {positions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-cfl-text-muted">
            <div className="text-3xl mb-2">🏎️</div>
            <p className="font-pixel text-[8px]">START THE RACE</p>
          </div>
        )}
      </div>
    </div>
  );
}
