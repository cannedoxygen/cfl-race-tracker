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
    <header className="flex items-center justify-between px-2 md:px-3 py-2 border-b-2 border-cfl-border flex-shrink-0 bg-cfl-card gap-2 md:gap-3 overflow-x-hidden">
      {/* Left: Logo + Quick Actions */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-sm md:text-base shadow-pixel-sm',
              matchMode === 'long'
                ? 'bg-gradient-to-br from-cfl-green to-green-700'
                : 'bg-gradient-to-br from-cfl-red to-red-700'
            )}
          >
            {matchMode === 'long' ? '📈' : '📉'}
          </div>
          <h1 className="font-pixel text-[7px] md:text-[8px] text-cfl-gold hidden sm:block tracking-wide">
            CFL RACE
          </h1>
        </div>

        {/* Quick Actions - Desktop only */}
        <div className="hidden lg:flex items-center gap-1.5">
          <button
            onClick={() => copyToClipboard(TIP_USERNAME, 'tip')}
            className={clsx(
              'px-2.5 py-1.5 rounded-lg font-pixel-body text-sm font-bold transition-all border',
              copiedTip
                ? 'bg-cfl-green/20 text-cfl-green border-cfl-green/50'
                : 'bg-cfl-purple/20 text-cfl-purple border-cfl-purple/30 hover:bg-cfl-purple/30 hover:shadow-purple-glow'
            )}
            title="Copy username to tip on CFL"
          >
            {copiedTip ? 'Copied!' : `Tip ${TIP_USERNAME}`}
          </button>
          <button
            onClick={() => copyToClipboard(REFERRAL_CODE, 'code')}
            className={clsx(
              'px-2.5 py-1.5 rounded-lg font-pixel-body text-sm font-bold transition-all border',
              copiedCode
                ? 'bg-cfl-green/20 text-cfl-green border-cfl-green/50'
                : 'bg-cfl-orange/20 text-cfl-orange border-cfl-orange/30 hover:bg-cfl-orange/30 hover:shadow-orange-glow'
            )}
            title="Copy referral code"
          >
            {copiedCode ? 'Copied!' : `Code: ${REFERRAL_CODE}`}
          </button>
        </div>
      </div>

      {/* Center: Race Controls (only on race tab) */}
      {activeTab === 'race' && (
        <div className="flex items-center gap-2 md:gap-3 flex-1 justify-center min-w-0">
          {/* Track Selector - Desktop only */}
          <div className="hidden lg:flex rounded-lg overflow-hidden border-2 border-cfl-border shadow-pixel-sm">
            {TRACK_CONFIG.map((track) => (
              <button
                key={track.id}
                onClick={() => setSelectedTrack(track.id)}
                disabled={status === 'racing'}
                className={clsx(
                  'px-2 py-1.5 font-pixel text-[7px] transition-all',
                  selectedTrack === track.id
                    ? `${track.color} text-white shadow-inner`
                    : 'bg-cfl-bg text-cfl-text-muted hover:text-white hover:bg-cfl-border',
                  status === 'racing' && 'opacity-50 cursor-not-allowed'
                )}
              >
                {track.label}
              </button>
            ))}
          </div>

          {/* Timer */}
          <div className="timer-pixel flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5">
            <div
              className={clsx(
                'w-2 h-2 md:w-2.5 md:h-2.5 rounded-full',
                status === 'racing'
                  ? 'bg-cfl-green animate-pulse shadow-green-glow'
                  : status === 'paused'
                  ? 'bg-cfl-gold'
                  : 'bg-cfl-text-muted'
              )}
            />
            <span className="text-cfl-gold text-xs md:text-sm">
              {formatTime(elapsedTime)}
            </span>
          </div>

          {/* Play/Pause/Reset */}
          <div className="flex gap-1 md:gap-1.5">
            {status === 'idle' && (
              <button
                onClick={startRace}
                className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 bg-cfl-green hover:bg-green-400 rounded-lg text-white font-pixel text-[7px] md:text-[8px] transition-all shadow-pixel-sm hover:shadow-green-glow"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="hidden sm:inline">PLAY</span>
              </button>
            )}

            {status === 'racing' && (
              <button
                onClick={pauseRace}
                className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 bg-cfl-gold hover:bg-yellow-400 rounded-lg text-black font-pixel text-[7px] md:text-[8px] transition-all shadow-pixel-sm hover:shadow-gold-glow"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                <span className="hidden sm:inline">PAUSE</span>
              </button>
            )}

            {status === 'paused' && (
              <button
                onClick={startRace}
                className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 bg-cfl-green hover:bg-green-400 rounded-lg text-white font-pixel text-[7px] md:text-[8px] transition-all shadow-pixel-sm hover:shadow-green-glow"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="hidden sm:inline">RESUME</span>
              </button>
            )}

            {(status === 'racing' || status === 'paused') && (
              <button
                onClick={resetRace}
                className="flex items-center gap-1 px-2 md:px-2.5 py-1.5 bg-cfl-border hover:bg-cfl-red/80 rounded-lg text-white transition-all shadow-pixel-sm"
              >
                <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="flex rounded-lg border-2 border-cfl-border overflow-hidden flex-shrink-0 shadow-pixel-sm">
        <button
          onClick={() => onTabChange('race')}
          className={clsx(
            'px-2 md:px-4 py-1.5 md:py-2 font-pixel text-[6px] md:text-[8px] transition-all',
            activeTab === 'race'
              ? 'bg-cfl-orange text-white shadow-orange-glow'
              : 'bg-cfl-bg text-cfl-text-muted hover:text-white hover:bg-cfl-border'
          )}
        >
          RACE
        </button>
        <button
          onClick={() => onTabChange('referral')}
          className={clsx(
            'px-2 md:px-4 py-1.5 md:py-2 font-pixel text-[6px] md:text-[8px] transition-all',
            activeTab === 'referral'
              ? 'bg-cfl-gold text-black shadow-gold-glow'
              : 'bg-cfl-bg text-cfl-text-muted hover:text-white hover:bg-cfl-border'
          )}
        >
          GIFT
        </button>
      </div>
    </header>
  );
}
