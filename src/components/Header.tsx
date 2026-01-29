'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRaceStore } from '@/store/raceStore';
import { TrackType } from '@/types';
import clsx from 'clsx';
import { SubscriptionModal } from './SubscriptionModal';

type Tab = 'race' | 'jackpot' | 'referral';
const REFERRAL_CODE = 'LPG8Y6L';
const TIP_USERNAME = '8bit.skr';
const TWITTER_CANNED = 'cannedoxygen83';
const TWITTER_MICROPERPS = 'microperps';

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
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [checkedWallet, setCheckedWallet] = useState<string | null>(null);

  const { publicKey, connected } = useWallet();

  // Auto-check subscription when wallet connects
  useEffect(() => {
    const checkSub = async () => {
      if (!publicKey) {
        setIsSubscribed(false);
        setCheckedWallet(null);
        return;
      }

      const walletStr = publicKey.toBase58();

      // Don't re-check the same wallet
      if (checkedWallet === walletStr) return;

      setIsCheckingSubscription(true);
      try {
        console.log('Header: Checking subscription for:', walletStr);
        const response = await fetch(`/api/subscription?wallet=${walletStr}`);
        const data = await response.json();
        console.log('Header: Subscription response:', data);

        if (data.active) {
          setIsSubscribed(true);
        } else {
          setIsSubscribed(false);
        }
        setCheckedWallet(walletStr);
      } catch (err) {
        console.error('Failed to check subscription:', err);
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    if (connected && publicKey) {
      checkSub();
    } else {
      setIsSubscribed(false);
      setCheckedWallet(null);
    }
  }, [connected, publicKey, checkedWallet]);

  const copyToClipboard = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopiedItem(item);
    setTimeout(() => setCopiedItem(null), 1500);
  };

  const openTwitter = (username: string) => {
    window.open(`https://twitter.com/${username}`, '_blank');
    setShowMenu(false);
  };

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

  // Check subscription and start race
  // ALWAYS re-verify with the API - never trust cached state
  const handlePlayClick = useCallback(async () => {
    if (publicKey) {
      setIsCheckingSubscription(true);
      try {
        const response = await fetch(
          `/api/subscription?wallet=${publicKey.toBase58()}`
        );
        const data = await response.json();

        if (data.active) {
          setIsSubscribed(true);
          setCheckedWallet(publicKey.toBase58());
          setIsCheckingSubscription(false);
          startRace();
          return;
        } else {
          // Subscription may have expired - reset cached state
          setIsSubscribed(false);
        }
      } catch (err) {
        console.error('Failed to check subscription:', err);
      } finally {
        setIsCheckingSubscription(false);
      }
    }

    // Not subscribed or no wallet, show modal
    setShowSubscriptionModal(true);
  }, [publicKey, startRace]);

  // Called when payment succeeds
  const handleSubscriptionSuccess = () => {
    setIsSubscribed(true);
    startRace();
  };

  return (
    <>
    <header className="flex items-center justify-between px-2 md:px-3 py-2 border-b-2 border-cfl-border flex-shrink-0 bg-cfl-card gap-2 overflow-x-hidden">
      {/* Left: Logo */}
      <h1 className="font-pixel text-[10px] md:text-[12px] tracking-wide flex-shrink-0">
        <span className="text-cfl-gold">CFL</span>
        <span className="text-cfl-teal">ADV</span>
      </h1>

      {/* Center: Race Controls (only on race tab) */}
      {activeTab === 'race' && (
        <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
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
          <div className="timer-pixel flex items-center gap-1.5 px-2 py-1">
            <div
              className={clsx(
                'w-2 h-2 rounded-full',
                status === 'racing'
                  ? 'bg-cfl-green animate-pulse shadow-green-glow'
                  : status === 'paused'
                  ? 'bg-cfl-gold'
                  : 'bg-cfl-text-muted'
              )}
            />
            <span className="text-cfl-gold text-xs">
              {formatTime(elapsedTime)}
            </span>
          </div>

          {/* Play/Pause/Reset */}
          <div className="flex gap-1">
            {status === 'idle' && (
              <button
                onClick={handlePlayClick}
                disabled={isCheckingSubscription}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1.5 rounded-lg text-white font-pixel text-[7px] transition-all shadow-pixel-sm",
                  isCheckingSubscription
                    ? "bg-cfl-border cursor-wait"
                    : "bg-cfl-green hover:bg-green-400"
                )}
              >
                {isCheckingSubscription ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
                <span className="hidden sm:inline">{isCheckingSubscription ? 'CHECKING...' : 'PLAY'}</span>
              </button>
            )}

            {status === 'racing' && (
              <button
                onClick={pauseRace}
                className="flex items-center gap-1 px-2 py-1.5 bg-cfl-gold hover:bg-yellow-400 rounded-lg text-black font-pixel text-[7px] transition-all shadow-pixel-sm"
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
                className="flex items-center gap-1 px-2 py-1.5 bg-cfl-green hover:bg-green-400 rounded-lg text-white font-pixel text-[7px] transition-all shadow-pixel-sm"
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
                className="flex items-center gap-1 px-2 py-1.5 bg-cfl-border hover:bg-cfl-red/80 rounded-lg text-white transition-all shadow-pixel-sm"
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

      {/* Spacer when not on race tab */}
      {activeTab !== 'race' && <div className="flex-1" />}

      {/* Right: Menu Button */}
      <div className="flex-shrink-0">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 rounded-lg bg-cfl-bg border border-cfl-border hover:border-cfl-text-muted transition-colors"
        >
          <svg className="w-5 h-5 text-cfl-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Dropdown Menu - Rendered outside button container */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="fixed right-2 top-14 w-48 bg-cfl-card border-2 border-cfl-border rounded-lg shadow-pixel overflow-hidden z-50">
              {/* Navigation */}
              <div className="border-b-2 border-cfl-border">
                <button
                  onClick={() => { onTabChange('race'); setShowMenu(false); }}
                  className={clsx(
                    'w-full px-4 py-3 font-pixel text-[8px] transition-all text-left',
                    activeTab === 'race'
                      ? 'bg-cfl-orange text-white'
                      : 'text-cfl-text-muted hover:bg-cfl-orange/20 hover:text-cfl-orange'
                  )}
                >
                  RACE
                </button>
                <button
                  onClick={() => { onTabChange('jackpot'); setShowMenu(false); }}
                  className={clsx(
                    'w-full px-4 py-3 font-pixel text-[8px] transition-all text-left',
                    activeTab === 'jackpot'
                      ? 'bg-cfl-green text-white'
                      : 'text-cfl-text-muted hover:bg-cfl-green/20 hover:text-cfl-green'
                  )}
                >
                  JACKPOT
                </button>
                <button
                  onClick={() => { onTabChange('referral'); setShowMenu(false); }}
                  className={clsx(
                    'w-full px-4 py-3 font-pixel text-[8px] transition-all text-left',
                    activeTab === 'referral'
                      ? 'bg-cfl-gold text-black'
                      : 'text-cfl-text-muted hover:bg-cfl-gold/20 hover:text-cfl-gold'
                  )}
                >
                  REFERRALS
                </button>
              </div>

              {/* Quick Copy */}
              <div className="border-b-2 border-cfl-border">
                <button
                  onClick={() => { copyToClipboard(REFERRAL_CODE, 'code'); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 font-pixel text-[7px] text-left text-cfl-orange hover:bg-cfl-border transition-all"
                >
                  {copiedItem === 'code' ? 'COPIED!' : `REF: ${REFERRAL_CODE}`}
                </button>
                <button
                  onClick={() => { copyToClipboard(TIP_USERNAME, 'tip'); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 font-pixel text-[7px] text-left text-cfl-purple hover:bg-cfl-border transition-all"
                >
                  {copiedItem === 'tip' ? 'COPIED!' : `TIP: ${TIP_USERNAME}`}
                </button>
              </div>

              {/* Social Links */}
              <div>
                <button
                  onClick={() => openTwitter(TWITTER_CANNED)}
                  className="w-full px-4 py-2.5 font-pixel text-[7px] text-left text-cfl-teal hover:bg-cfl-border transition-all"
                >
                  @{TWITTER_CANNED}
                </button>
                <button
                  onClick={() => openTwitter(TWITTER_MICROPERPS)}
                  className="w-full px-4 py-2.5 font-pixel text-[7px] text-left text-cfl-teal hover:bg-cfl-border transition-all"
                >
                  @{TWITTER_MICROPERPS}
                </button>
              </div>
            </div>
          </>
        )}
    </header>

    <SubscriptionModal
      isOpen={showSubscriptionModal}
      onClose={() => setShowSubscriptionModal(false)}
      onSuccess={handleSubscriptionSuccess}
    />
    </>
  );
}
