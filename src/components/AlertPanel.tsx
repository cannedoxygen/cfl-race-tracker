'use client';

import { useState } from 'react';
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

const ALERT_INFO: Record<Alert['type'], { title: string; description: string }> = {
  big_mover: {
    title: 'Big Mover',
    description: 'A token just made a significant price move. Great for catching sudden pumps or dumps.',
  },
  leader_change: {
    title: 'Leader Change',
    description: 'A new token has taken the #1 spot in the race. The leaderboard just shifted!',
  },
  momentum_shift: {
    title: 'Momentum Shift',
    description: 'A token\'s momentum has changed direction - it was going up and now going down, or vice versa.',
  },
};

export function AlertPanel({ alerts, onDismiss, compact }: Props) {
  const [showInfo, setShowInfo] = useState(false);

  if (alerts.length === 0) return null;

  if (compact) {
    // Single-line compact alerts
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto relative">
        {/* Info button */}
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 bg-cfl-border/50 hover:bg-cfl-border transition-colors"
        >
          <span className="text-cfl-text-muted">ⓘ</span>
        </button>

        {alerts.slice(0, 3).map((alert) => (
          <button
            key={alert.id}
            onClick={() => setShowInfo(!showInfo)}
            className={clsx(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] flex-shrink-0 transition-all hover:scale-105',
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
            <span
              onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
              className="text-gray-500 hover:text-white ml-0.5"
            >
              ×
            </span>
          </button>
        ))}

        {/* Info popup */}
        {showInfo && (
          <div className="absolute top-full left-0 mt-2 w-72 bg-cfl-card border-2 border-cfl-purple rounded-lg p-3 shadow-lg animate-slideUp z-20">
            <h3 className="font-pixel text-[10px] text-cfl-purple mb-2">RACE ALERTS</h3>
            <div className="space-y-2">
              {Object.entries(ALERT_INFO).map(([type, info]) => (
                <div key={type} className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">
                    {type === 'big_mover' && '📈'}
                    {type === 'leader_change' && '🏆'}
                    {type === 'momentum_shift' && '🔄'}
                  </span>
                  <div>
                    <span className="font-pixel text-[8px] text-white">{info.title}</span>
                    <p className="font-pixel-body text-[10px] text-cfl-text-muted leading-relaxed">
                      {info.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="font-pixel text-[8px] text-cfl-purple mt-2 hover:underline"
            >
              GOT IT
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 relative">
      {/* Info button */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm bg-cfl-border/50 hover:bg-cfl-border transition-colors"
      >
        <span className="text-cfl-text-muted">ⓘ</span>
      </button>

      {alerts.slice(0, 5).map((alert) => (
        <button
          key={alert.id}
          onClick={() => setShowInfo(!showInfo)}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm animate-pulse transition-all hover:scale-105',
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
          <span
            onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
            className="ml-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </button>
      ))}

      {/* Info popup */}
      {showInfo && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-cfl-card border-2 border-cfl-purple rounded-lg p-3 shadow-lg animate-slideUp z-20">
          <h3 className="font-pixel text-[10px] text-cfl-purple mb-2">RACE ALERTS</h3>
          <div className="space-y-2">
            {Object.entries(ALERT_INFO).map(([type, info]) => (
              <div key={type} className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">
                  {type === 'big_mover' && '📈'}
                  {type === 'leader_change' && '🏆'}
                  {type === 'momentum_shift' && '🔄'}
                </span>
                <div>
                  <span className="font-pixel text-[10px] text-white">{info.title}</span>
                  <p className="font-pixel-body text-xs text-cfl-text-muted leading-relaxed">
                    {info.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowInfo(false)}
            className="font-pixel text-[8px] text-cfl-purple mt-2 hover:underline"
          >
            GOT IT
          </button>
        </div>
      )}
    </div>
  );
}
