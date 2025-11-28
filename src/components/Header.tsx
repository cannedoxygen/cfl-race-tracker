'use client';

import { useRaceStore } from '@/store/raceStore';
import { MatchMode } from '@/types';
import clsx from 'clsx';

interface Props {
  matchMode: MatchMode;
}

export function Header({ matchMode }: Props) {
  const { status } = useRaceStore();

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-cfl-border flex-shrink-0">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2">
        <div
          className={clsx(
            'w-7 h-7 rounded-lg flex items-center justify-center text-sm',
            matchMode === 'long'
              ? 'bg-gradient-to-br from-green-500 to-green-700'
              : 'bg-gradient-to-br from-red-500 to-red-700'
          )}
        >
          {matchMode === 'long' ? '📈' : '📉'}
        </div>
        <h1 className="text-sm font-bold text-white">
          CFL Race Tracker
        </h1>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-2">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <div
            className={clsx(
              'w-1.5 h-1.5 rounded-full',
              status === 'racing'
                ? 'bg-green-500 animate-pulse'
                : status === 'paused'
                ? 'bg-yellow-500'
                : 'bg-gray-500'
            )}
          />
          <span className="text-[10px] text-gray-400">
            {status === 'racing' ? 'LIVE' : status === 'paused' ? 'PAUSED' : 'READY'}
          </span>
        </div>

        {/* Match mode badge */}
        <div
          className={clsx(
            'flex items-center px-2 py-0.5 rounded',
            matchMode === 'long' ? 'bg-green-500/20' : 'bg-red-500/20'
          )}
        >
          <span
            className={clsx(
              'text-[10px] font-bold',
              matchMode === 'long' ? 'text-green-400' : 'text-red-400'
            )}
          >
            {matchMode === 'long' ? 'LONG' : 'SHORT'}
          </span>
        </div>
      </div>
    </header>
  );
}
