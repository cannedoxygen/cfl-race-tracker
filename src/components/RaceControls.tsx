'use client';

import { RaceStatus, MatchMode, TrackType } from '@/types';
import clsx from 'clsx';

interface Props {
  status: RaceStatus;
  elapsedTime: number;
  matchMode: MatchMode;
  selectedTrack: TrackType | 'all';
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetMatchMode: (mode: MatchMode) => void;
  onSetTrack: (track: TrackType | 'all') => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const TRACK_CONFIG: { id: TrackType | 'all'; label: string; color: string; boost: string }[] = [
  { id: 'all', label: 'ALL', color: 'bg-gray-600', boost: '70-87' },
  { id: 'aggressive', label: 'AGG', color: 'bg-purple-600', boost: '85-87' },
  { id: 'balanced', label: 'BAL', color: 'bg-blue-600', boost: '81-84' },
  { id: 'moderate', label: 'MOD', color: 'bg-yellow-600', boost: '77-80' },
  { id: 'conservative', label: 'CON', color: 'bg-gray-500', boost: '70-76' },
];

export function RaceControls({
  status,
  elapsedTime,
  matchMode,
  selectedTrack,
  onStart,
  onPause,
  onReset,
  onSetMatchMode,
  onSetTrack,
}: Props) {
  return (
    <div className="flex items-center gap-2 p-2 bg-cfl-card rounded-xl flex-shrink-0">
      {/* Track Selector */}
      <div className="flex rounded-lg overflow-hidden border border-cfl-border">
        {TRACK_CONFIG.map((track) => (
          <button
            key={track.id}
            onClick={() => onSetTrack(track.id)}
            disabled={status === 'racing'}
            title={`Boost ${track.boost}`}
            className={clsx(
              'px-1.5 py-1 text-[9px] font-bold transition-all',
              selectedTrack === track.id
                ? `${track.color} text-white`
                : 'bg-cfl-bg text-gray-400 hover:text-white',
              status === 'racing' && 'opacity-50 cursor-not-allowed'
            )}
          >
            {track.label}
          </button>
        ))}
      </div>

      {/* Match Mode Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-cfl-border">
        <button
          onClick={() => onSetMatchMode('long')}
          disabled={status === 'racing'}
          className={clsx(
            'px-2 py-1 text-[10px] font-bold transition-all',
            matchMode === 'long'
              ? 'bg-green-600 text-white'
              : 'bg-cfl-bg text-gray-400 hover:text-white',
            status === 'racing' && 'opacity-50 cursor-not-allowed'
          )}
        >
          📈 LONG
        </button>
        <button
          onClick={() => onSetMatchMode('short')}
          disabled={status === 'racing'}
          className={clsx(
            'px-2 py-1 text-[10px] font-bold transition-all',
            matchMode === 'short'
              ? 'bg-red-600 text-white'
              : 'bg-cfl-bg text-gray-400 hover:text-white',
            status === 'racing' && 'opacity-50 cursor-not-allowed'
          )}
        >
          📉 SHORT
        </button>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-1.5">
        <div
          className={clsx(
            'w-2 h-2 rounded-full',
            status === 'racing'
              ? 'bg-green-500 animate-pulse'
              : status === 'paused'
              ? 'bg-yellow-500'
              : 'bg-gray-500'
          )}
        />
        <span className="text-lg font-mono font-bold text-white">
          {formatTime(elapsedTime)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex gap-1">
        {status === 'idle' && (
          <button
            onClick={onStart}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-white text-xs font-bold transition-all"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
          </button>
        )}

        {status === 'racing' && (
          <button
            onClick={onPause}
            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white text-xs font-bold transition-all"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            Pause
          </button>
        )}

        {status === 'paused' && (
          <button
            onClick={onStart}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-white text-xs font-bold transition-all"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Resume
          </button>
        )}

        {(status === 'racing' || status === 'paused') && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1.5 bg-cfl-border hover:bg-gray-700 rounded-lg text-white text-xs transition-all"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
