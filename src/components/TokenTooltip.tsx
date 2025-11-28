'use client';

import { VolatilityScore } from '@/types';
import { formatPrice, formatPercentChange } from '@/lib/volatility';
import Image from 'next/image';

interface Props {
  score: VolatilityScore;
  onClose: () => void;
}

export function TokenTooltip({ score, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-cfl-card border border-cfl-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: `${score.color}30` }}
          >
            {score.logoURI ? (
              <Image
                src={score.logoURI}
                alt={score.symbol}
                width={48}
                height={48}
                className="rounded-full"
                unoptimized
              />
            ) : (
              <span
                className="text-2xl font-bold"
                style={{ color: score.color }}
              >
                {score.symbol.slice(0, 2)}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{score.symbol}</h3>
            <p className="text-gray-400">{score.name}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Price</span>
            <span className="text-white font-medium">
              {formatPrice(score.currentPrice)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400">Volatility Score</span>
            <span
              className="font-bold text-lg"
              style={{ color: score.color }}
            >
              {score.score.toFixed(2)}
            </span>
          </div>

          <div className="h-px bg-cfl-border" />

          <div className="flex justify-between items-center">
            <span className="text-gray-400">1m Change</span>
            <span
              className={
                score.percentChange1m >= 0 ? 'text-green-400' : 'text-red-400'
              }
            >
              {formatPercentChange(score.percentChange1m)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400">5m Change</span>
            <span
              className={
                score.percentChange5m >= 0 ? 'text-green-400' : 'text-red-400'
              }
            >
              {formatPercentChange(score.percentChange5m)}
            </span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-cfl-border rounded-xl text-white font-medium hover:bg-opacity-80 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}
