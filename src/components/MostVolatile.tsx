'use client';

import { RacePosition, TrackType } from '@/types';
import clsx from 'clsx';
import Image from 'next/image';
import { getTrackFromBoost } from '@/lib/tokens';

type VolatileFilter = 'all' | 'long' | 'short';

interface Props {
  positions: RacePosition[];
  onSelectToken: (mint: string | null) => void;
  selectedToken: string | null;
  filter?: VolatileFilter;
}

function getTrackColor(track: TrackType): string {
  switch (track) {
    case 'aggressive':
      return '#EF4444';
    case 'balanced':
      return '#F97316';
    case 'moderate':
      return '#3B82F6';
    case 'conservative':
      return '#EAB308';
    default:
      return '#6B7280';
  }
}

function getFilterConfig(filter: VolatileFilter) {
  switch (filter) {
    case 'long':
      return {
        title: 'Top Longs',
        subtitle: '5m gainers',
        icon: '↑',
        iconColor: 'text-green-400',
        filterFn: (pos: RacePosition) => pos.velocity > 0,
        sortFn: (a: RacePosition, b: RacePosition) => b.velocity - a.velocity,
      };
    case 'short':
      return {
        title: 'Top Shorts',
        subtitle: '5m losers',
        icon: '↓',
        iconColor: 'text-red-400',
        filterFn: (pos: RacePosition) => pos.velocity < 0,
        sortFn: (a: RacePosition, b: RacePosition) => a.velocity - b.velocity,
      };
    default:
      return {
        title: 'Most Volatile',
        subtitle: '5m accumulated',
        icon: '~',
        iconColor: 'text-orange-400',
        filterFn: () => true,
        sortFn: (a: RacePosition, b: RacePosition) => b.volatility5m - a.volatility5m,
        useVolatility: true,
      };
  }
}

export function MostVolatile({ positions, onSelectToken, selectedToken, filter = 'all' }: Props) {
  const config = getFilterConfig(filter);

  const sortedPositions = [...positions]
    .filter(config.filterFn)
    .sort(config.sortFn)
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-white flex items-center gap-1">
          <span className={config.iconColor}>{config.icon}</span> {config.title}
        </h2>
        <span className={clsx('text-[10px]', config.iconColor)}>
          {config.subtitle}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
        {sortedPositions.map((pos, index) => {
          const isSelected = selectedToken === pos.mint;
          const track = pos.boost ? getTrackFromBoost(pos.boost) : 'conservative';
          const trackColor = getTrackColor(track);
          const absVelocity = Math.abs(pos.velocity);
          const isUp = pos.velocity >= 0;

          return (
            <button
              key={pos.mint}
              onClick={() => onSelectToken(isSelected ? null : pos.mint)}
              className={clsx(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all',
                'border bg-gray-800/30 border-gray-700/50 hover:border-gray-600',
                isSelected && 'ring-2 ring-orange-400'
              )}
            >
              {/* Rank indicator */}
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: `${trackColor}30`, color: trackColor }}
              >
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

              {/* Symbol */}
              <span className="font-bold text-white text-xs flex-1 text-left truncate">
                {pos.symbol}
              </span>

              {/* Velocity/Volatility indicator */}
              <div className="flex items-center gap-1">
                {filter === 'all' ? (
                  <span className="text-xs font-bold text-orange-400">
                    {pos.volatility5m.toFixed(2)}%
                  </span>
                ) : (
                  <span className={clsx(
                    'text-xs font-bold',
                    isUp ? 'text-green-400' : 'text-red-400'
                  )}>
                    {isUp ? '+' : ''}{pos.velocity.toFixed(2)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {sortedPositions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-4 text-gray-500">
            <div className="text-xl mb-1">{config.icon}</div>
            <p className="text-[10px]">Waiting for data</p>
          </div>
        )}
      </div>
    </div>
  );
}
