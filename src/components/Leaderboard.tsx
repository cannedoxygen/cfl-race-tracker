'use client';

import { VolatilityScore } from '@/types';
import { useAppStore } from '@/store/appStore';
import { formatPrice, formatPercentChange } from '@/lib/volatility';
import clsx from 'clsx';
import Image from 'next/image';

interface Props {
  scores: VolatilityScore[];
}

export function Leaderboard({ scores }: Props) {
  const { selectedToken, setSelectedToken } = useAppStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-lg font-bold text-white">Leaderboard</h2>
        <span className="text-xs text-gray-500">
          {scores.length} tokens
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {scores.map((score, index) => {
          const isSelected = selectedToken === score.mint;
          const rankColor =
            index === 0
              ? 'text-yellow-400'
              : index === 1
              ? 'text-gray-300'
              : index === 2
              ? 'text-orange-400'
              : 'text-gray-500';

          return (
            <button
              key={score.mint}
              onClick={() => setSelectedToken(isSelected ? null : score.mint)}
              className={clsx(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                'bg-cfl-card border border-transparent',
                'hover:border-cfl-border hover:bg-opacity-80',
                isSelected && 'border-cfl-purple ring-1 ring-cfl-purple'
              )}
            >
              {/* Rank */}
              <div
                className={clsx(
                  'w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm',
                  rankColor,
                  index < 3 ? 'bg-white bg-opacity-10' : 'bg-cfl-border'
                )}
              >
                {index + 1}
              </div>

              {/* Token logo */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: `${score.color}30` }}
              >
                {score.logoURI ? (
                  <Image
                    src={score.logoURI}
                    alt={score.symbol}
                    width={32}
                    height={32}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <span
                    className="text-sm font-bold"
                    style={{ color: score.color }}
                  >
                    {score.symbol.slice(0, 2)}
                  </span>
                )}
              </div>

              {/* Token info */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white truncate">
                    {score.symbol}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {score.name}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {formatPrice(score.currentPrice)}
                </div>
              </div>

              {/* Volatility & Changes */}
              <div className="text-right">
                <div
                  className="text-sm font-bold"
                  style={{ color: score.color }}
                >
                  {score.score.toFixed(2)}
                </div>
                <div className="flex gap-2 text-xs">
                  <span
                    className={
                      score.percentChange1m >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }
                  >
                    {formatPercentChange(score.percentChange1m)}
                  </span>
                  <span className="text-gray-500">1m</span>
                </div>
              </div>
            </button>
          );
        })}

        {scores.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>Loading token data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
