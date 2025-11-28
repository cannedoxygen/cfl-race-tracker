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
        <h2 className="text-sm font-bold text-white">
          🏆 Leaderboard
        </h2>
        <span className="text-[10px] text-yellow-400">
          Biggest % wins
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar min-h-0">
        {sortedPositions.map((pos, index) => {
          const isSelected = selectedToken === pos.mint;
          const rankColor =
            index === 0
              ? 'text-yellow-400'
              : index === 1
              ? 'text-gray-300'
              : index === 2
              ? 'text-orange-400'
              : 'text-gray-500';

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
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all relative overflow-hidden',
                  'border bg-gray-800/30 border-gray-700/50 hover:border-gray-600',
                  isSelected && 'ring-2 ring-yellow-400'
                )}
              >
                {/* Progress bar background */}
                <div
                  className="absolute left-0 top-0 bottom-0 opacity-30 transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: trackColor,
                  }}
                />

                {/* Content (above the bar) */}
                <div className="relative flex items-center gap-2 w-full">
                  {/* Rank */}
                  <div className={clsx('w-5 text-center font-bold text-xs', rankColor)}>
                    {index + 1}
                  </div>

                  {/* Token logo */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: `${pos.color}30` }}
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
                      <span className="text-[10px] font-bold" style={{ color: pos.color }}>
                        {pos.symbol.slice(0, 2)}
                      </span>
                    )}
                  </div>

                  {/* Symbol + Direction */}
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="font-bold text-white text-xs truncate">
                      {pos.symbol}
                    </span>
                    <span className={clsx(
                      'text-[9px] px-1 py-0.5 rounded',
                      isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    )}>
                      {isPositive ? 'LONG' : 'SHORT'}
                    </span>
                  </div>

                  {/* % - All displayed as positive (racing UP) */}
                  <div className="text-xs font-bold min-w-[60px] text-right text-yellow-400">
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
                'w-full flex flex-col gap-2 p-2.5 rounded-lg transition-all relative overflow-hidden',
                'border bg-gray-800/30 border-gray-700/50 hover:border-gray-600',
                isSelected && 'ring-2 ring-yellow-400'
              )}
            >
              {/* Progress bar background */}
              <div
                className="absolute left-0 top-0 bottom-0 opacity-30 transition-all duration-500"
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
                      'w-6 h-6 flex items-center justify-center rounded font-bold text-xs',
                      rankColor,
                      index < 3 ? 'bg-white bg-opacity-10' : 'bg-cfl-border'
                    )}
                  >
                    {index + 1}
                  </div>

                  {/* Token logo */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: `${pos.color}30` }}
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
                        className="text-xs font-bold"
                        style={{ color: pos.color }}
                      >
                        {pos.symbol.slice(0, 2)}
                      </span>
                    )}
                  </div>

                  {/* Token info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-white text-sm truncate">
                        {pos.symbol}
                      </span>
                      <span className="text-xs">
                        {getMomentumIcon(pos.momentum)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className={clsx(
                        'px-1 py-0.5 rounded',
                        isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      )}>
                        {isPositive ? 'LONG' : 'SHORT'}
                      </span>
                    </div>
                  </div>

                  {/* % - displayed as positive (racing UP) */}
                  <div className="text-right">
                    <div className="text-sm font-bold text-yellow-400">
                      {absValue.toFixed(2)}%
                    </div>
                    <div className="text-[9px] text-gray-500">60s rolling</div>
                  </div>
                </div>

                {/* Bottom Row: Price info if available */}
                {(pos.startPrice || pos.currentPrice) && (
                  <div className="flex items-center gap-2 px-1 pt-1.5 border-t border-cfl-border/30 text-[10px] text-gray-500 mt-2">
                    <span>Price: ${pos.currentPrice?.toFixed(6) || '?'}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {positions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <div className="text-2xl mb-1">🏎️</div>
            <p className="text-xs">Start the race</p>
          </div>
        )}
      </div>
    </div>
  );
}
