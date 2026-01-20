'use client';

import { useState } from 'react';
import { useRaceStore } from '@/store/raceStore';
import { TrackType } from '@/types';
import clsx from 'clsx';

type Tab = 'race' | 'referral';
const REFERRAL_CODE = 'LPG8Y6L';
const TIP_USERNAME = '8bit.skr';

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const TRACK_CONFIG: { id: TrackType | 'all'; label: string; color: string }[] = [
  { id: 'all', label: 'ALL', color: 'bg-gray-600' },
  { id: 'aggressive', label: 'AGG', color: 'bg-purple-600' },
  { id: 'balanced', label: 'BAL', color: 'bg-blue-600' },
  { id: 'moderate', label: 'MOD', color: 'bg-yellow-600' },
  { id: 'conservative', label: 'CON', color: 'bg-gray-500' },
];

export function Header({ activeTab, onTabChange }: Props) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedTip, setCopiedTip] = useState(false);

  const {
    status,
    matchMode,
    selectedTrack,
    elapsedTime,
    startRace,
    pauseRace,
    resetRace,
    setMatchMode,
    setSelectedTrack,
  } = useRaceStore();

  const copyToClipboard = async (text: string, type: 'code' | 'tip') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 1500);
      } else {
        setCopiedTip(true);
        setTimeout(() => setCopiedTip(false), 1500);
      }
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 1500);
      } else {
        setCopiedTip(true);
        setTimeout(() => setCopiedTip(false), 1500);
      }
    }
  };

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-cfl-border flex-shrink-0 bg-cfl-bg gap-3">
      {/* Left: Logo + Quick Actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
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
          <h1 className="text-sm font-bold text-white hidden sm:block">
            CFL Race Tracker
          </h1>
        </div>

        {/* Quick Actions */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => copyToClipboard(TIP_USERNAME, 'tip')}
            className={clsx(
              'px-2 py-1 rounded text-[10px] font-medium transition-all',
              copiedTip
                ? 'bg-green-500/20 text-green-400'
                : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
            )}
            title="Copy username to tip on CFL"
          >
            {copiedTip ? 'Copied!' : `Tip ${TIP_USERNAME}`}
          </button>
          <button
            onClick={() => copyToClipboard(REFERRAL_CODE, 'code')}
            className={clsx(
              'px-2 py-1 rounded text-[10px] font-medium transition-all',
              copiedCode
                ? 'bg-green-500/20 text-green-400'
                : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
            )}
            title="Copy referral code"
          >
            {copiedCode ? 'Copied!' : `Code: ${REFERRAL_CODE}`}
          </button>
        </div>
      </div>

      {/* Center: Race Controls (only on race tab) */}
      {activeTab === 'race' && (
        <div className="flex items-center gap-2 flex-1 justify-center">
          {/* Track Selector */}
          <div className="hidden md:flex rounded-lg overflow-hidden border border-cfl-border">
            {TRACK_CONFIG.map((track) => (
              <button
                key={track.id}
                onClick={() => setSelectedTrack(track.id)}
                disabled={status === 'racing'}
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

          {/* Long/Short Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-cfl-border">
            <button
              onClick={() => setMatchMode('long')}
              disabled={status === 'racing'}
              className={clsx(
                'px-2 py-1 text-[10px] font-bold transition-all',
                matchMode === 'long'
                  ? 'bg-green-600 text-white'
                  : 'bg-cfl-bg text-gray-400 hover:text-white',
                status === 'racing' && 'opacity-50 cursor-not-allowed'
              )}
            >
              LONG
            </button>
            <button
              onClick={() => setMatchMode('short')}
              disabled={status === 'racing'}
              className={clsx(
                'px-2 py-1 text-[10px] font-bold transition-all',
                matchMode === 'short'
                  ? 'bg-red-600 text-white'
                  : 'bg-cfl-bg text-gray-400 hover:text-white',
                status === 'racing' && 'opacity-50 cursor-not-allowed'
              )}
            >
              SHORT
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
            <span className="text-base font-mono font-bold text-white">
              {formatTime(elapsedTime)}
            </span>
          </div>

          {/* Play/Pause/Reset */}
          <div className="flex gap-1">
            {status === 'idle' && (
              <button
                onClick={startRace}
                className="flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-white text-xs font-bold transition-all"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="hidden sm:inline">Play</span>
              </button>
            )}

            {status === 'racing' && (
              <button
                onClick={pauseRace}
                className="flex items-center gap-1 px-2.5 py-1 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white text-xs font-bold transition-all"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                <span className="hidden sm:inline">Pause</span>
              </button>
            )}

            {status === 'paused' && (
              <button
                onClick={startRace}
                className="flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-white text-xs font-bold transition-all"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="hidden sm:inline">Resume</span>
              </button>
            )}

            {(status === 'racing' || status === 'paused') && (
              <button
                onClick={resetRace}
                className="flex items-center gap-1 px-2 py-1 bg-cfl-border hover:bg-gray-700 rounded-lg text-white text-xs transition-all"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      )}

      {/* Spacer when on referral tab */}
      {activeTab === 'referral' && <div className="flex-1" />}

      {/* Right: Tab Navigation */}
      <div className="flex bg-cfl-card rounded-lg border border-cfl-border overflow-hidden flex-shrink-0">
        <button
          onClick={() => onTabChange('race')}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium transition-colors',
            activeTab === 'race'
              ? 'bg-orange-500/20 text-orange-400'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          )}
        >
          Race
        </button>
        <button
          onClick={() => onTabChange('referral')}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium transition-colors',
            activeTab === 'referral'
              ? 'bg-orange-500/20 text-orange-400'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          )}
        >
          Referral
        </button>
      </div>
    </header>
  );
}
