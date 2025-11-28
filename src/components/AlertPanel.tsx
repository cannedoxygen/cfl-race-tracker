'use client';

import clsx from 'clsx';

interface Alert {
  id: string;
  type: 'big_mover' | 'momentum_shift' | 'leader_change';
  symbol: string;
  message: string;
  timestamp: number;
}

interface Props {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  compact?: boolean;
}

export function AlertPanel({ alerts, onDismiss, compact }: Props) {
  if (alerts.length === 0) return null;

  if (compact) {
    // Single-line compact alerts
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {alerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className={clsx(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] flex-shrink-0',
              alert.type === 'big_mover' && 'bg-yellow-500/20',
              alert.type === 'leader_change' && 'bg-purple-500/20',
              alert.type === 'momentum_shift' && 'bg-blue-500/20'
            )}
          >
            <span className="text-xs">
              {alert.type === 'big_mover' && '📈'}
              {alert.type === 'leader_change' && '🏆'}
              {alert.type === 'momentum_shift' && '🔄'}
            </span>
            <span className="text-white">{alert.symbol}</span>
            <button
              onClick={() => onDismiss(alert.id)}
              className="text-gray-500 hover:text-white ml-0.5"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {alerts.slice(0, 5).map((alert) => (
        <div
          key={alert.id}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm animate-pulse',
            alert.type === 'big_mover' && 'bg-yellow-500/20 border border-yellow-500/50',
            alert.type === 'leader_change' && 'bg-purple-500/20 border border-purple-500/50',
            alert.type === 'momentum_shift' && 'bg-blue-500/20 border border-blue-500/50'
          )}
        >
          <span className="text-lg">
            {alert.type === 'big_mover' && '📈'}
            {alert.type === 'leader_change' && '🏆'}
            {alert.type === 'momentum_shift' && '🔄'}
          </span>
          <span className="text-white font-medium">{alert.message}</span>
          <button
            onClick={() => onDismiss(alert.id)}
            className="ml-1 text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
