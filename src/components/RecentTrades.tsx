'use client';

import { TradeEvent } from '@/types';
import clsx from 'clsx';

interface Props {
  trades: TradeEvent[];
  compact?: boolean;
}

function formatUsd(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function RecentTrades({ trades, compact }: Props) {
  if (trades.length === 0) {
    return null;
  }

  if (compact) {
    // Horizontal scrolling ticker for compact mode
    return (
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        <span className="text-[10px] text-gray-500 flex-shrink-0">LIVE:</span>
        {trades.slice(0, 10).map((trade, index) => (
          <div
            key={`${trade.timestamp}-${index}`}
            className={clsx(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0',
              trade.type === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'
            )}
          >
            <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
              {trade.type === 'buy' ? '↑' : '↓'}
            </span>
            <span className="text-white font-medium">{trade.symbol}</span>
            <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
              {formatUsd(trade.amountUsd)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Standard vertical list
  return (
    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
      {trades.slice(0, 10).map((trade, index) => (
        <div
          key={`${trade.timestamp}-${index}`}
          className={clsx(
            'flex items-center justify-between px-2 py-1.5 rounded text-xs',
            trade.type === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
              {trade.type === 'buy' ? '↑' : '↓'}
            </span>
            <span className="font-medium text-white">{trade.symbol}</span>
          </div>
          <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
            {formatUsd(trade.amountUsd)}
          </span>
        </div>
      ))}
    </div>
  );
}
