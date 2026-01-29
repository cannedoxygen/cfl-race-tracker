'use client';

import { useState, useEffect } from 'react';

const REFERRAL_CODE = 'LPG8Y6L';
const CFL_SIGNUP_URL = `https://cfl.fun/?ref=${REFERRAL_CODE}`;

interface CFLReferral {
  id: number;
  address: string;
  username: string;
  isLegends: boolean;
  isSeekerHolder: boolean;
  profilePic: string;
  mmr: number;
  referralEarnings: number;
  earnedThisWeek: number;
  snapshotEarnings: number;
  activeFrameUrl: string | null;
}

interface CFLData {
  success: boolean;
  stats: {
    username: string;
    profilePicture: string;
    referralCode: string;
    referralEarnings: number;
    trophies: number;
    rank: number;
  } | null;
  referrals: CFLReferral[];
  activeReferrals: CFLReferral[];
  totalReferrals: number;
  totalActive: number;
  totalEarnings: number;
  weeklyEarnings: number;
  hasSnapshot: boolean;
}

interface PastWinner {
  weekId: string;
  winner: string;
  prize: string;
  drawnAt: number;
  entryCount: number;
}

export function ReferralPage() {
  const [copied, setCopied] = useState(false);
  const [cflData, setCflData] = useState<CFLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pastWinners, setPastWinners] = useState<PastWinner[]>([]);

  useEffect(() => {
    fetchCFLData();
    fetchPastWinners();
  }, []);

  const fetchCFLData = async () => {
    try {
      const res = await fetch('/api/referral/cfl-data');
      const data = await res.json();
      if (data.success) {
        setCflData(data);
      }
    } catch (error) {
      console.error('Failed to fetch CFL data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPastWinners = async () => {
    try {
      const res = await fetch('/api/referral/draw');
      const data = await res.json();
      if (data.success && data.pastDrawings) {
        setPastWinners(data.pastDrawings);
      }
    } catch (error) {
      console.error('Failed to fetch past winners:', error);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(REFERRAL_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = REFERRAL_CODE;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getNextFriday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + daysUntilFriday);
    nextFriday.setHours(12, 0, 0, 0);
    if (dayOfWeek === 5 && now.getHours() >= 12) {
      nextFriday.setDate(nextFriday.getDate() + 7);
    }
    return nextFriday.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-cfl-bg text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-pixel text-lg text-cfl-gold mb-3 animate-gold-shimmer">
            WEEKLY GIVEAWAY
          </h1>
          <p className="font-pixel-body text-xl text-cfl-text-muted">
            Use my referral code, play CFL, and you're automatically entered to win 50% of the fees!
          </p>
        </div>

        {/* Stats Cards */}
        {cflData?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card-pixel p-4 text-center">
              <div className="font-pixel text-sm text-cfl-green">
                {cflData.weeklyEarnings.toFixed(5)}
              </div>
              <div className="font-pixel-body text-sm text-cfl-text-muted mt-1">SOL This Week</div>
            </div>
            <div className="card-pixel p-4 text-center">
              <div className="font-pixel text-sm text-cfl-orange">
                {cflData.totalReferrals}
              </div>
              <div className="font-pixel-body text-sm text-cfl-text-muted mt-1">Total Referrals</div>
            </div>
            <div className="card-pixel p-4 text-center">
              <div className="font-pixel text-sm text-cfl-teal">
                {cflData.totalActive}
              </div>
              <div className="font-pixel-body text-sm text-cfl-text-muted mt-1">
                {cflData.hasSnapshot ? 'Played This Week' : 'Played (All Time)'}
              </div>
            </div>
            <div className="card-pixel p-4 text-center">
              <div className="font-pixel text-sm text-cfl-gold text-gold-glow">
                {(cflData.weeklyEarnings * 0.5).toFixed(5)}
              </div>
              <div className="font-pixel-body text-sm text-cfl-text-muted mt-1">Prize Pool (50%)</div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="card-pixel p-5">
          <h2 className="font-pixel text-[10px] text-cfl-orange mb-4">HOW IT WORKS</h2>
          <ol className="space-y-3 font-pixel-body text-lg text-cfl-text-muted">
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-cfl-orange/20 text-cfl-orange rounded font-pixel text-[8px] flex items-center justify-center">1</span>
              <span>Sign up on CFL using my referral code below</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-cfl-orange/20 text-cfl-orange rounded font-pixel text-[8px] flex items-center justify-center">2</span>
              <span>Play at least one paid game (Rush or Tournament) this week</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-cfl-green/20 text-cfl-green rounded font-pixel text-[8px] flex items-center justify-center">✓</span>
              <span><strong className="text-cfl-green">You're automatically entered!</strong> No signup needed.</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-cfl-gold/20 text-cfl-gold rounded font-pixel text-[8px] flex items-center justify-center">$</span>
              <span>Every Friday at noon, one winner gets <strong className="text-cfl-gold">50% of that week's fees</strong>!</span>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-cfl-bg rounded-lg border border-cfl-border">
            <div className="flex justify-between items-center">
              <span className="font-pixel text-[8px] text-cfl-text-muted">NEXT DRAWING:</span>
              <span className="font-pixel-body text-lg text-cfl-green">{getNextFriday()}</span>
            </div>
          </div>
        </div>

        {/* Referral Code */}
        <div className="card-pixel p-5">
          <h2 className="font-pixel text-[10px] text-white mb-4">JOIN WITH MY CODE</h2>
          <div className="flex items-center gap-3 bg-cfl-bg rounded-lg p-4 border-2 border-cfl-orange/30">
            <span className="font-pixel text-lg text-cfl-orange flex-1 text-center tracking-wider">
              {REFERRAL_CODE}
            </span>
            <button
              onClick={copyCode}
              className={`px-4 py-2 rounded-lg font-pixel text-[8px] transition-all shadow-pixel-sm ${
                copied
                  ? 'bg-cfl-green/20 text-cfl-green border-2 border-cfl-green/50'
                  : 'bg-cfl-orange/20 text-cfl-orange border-2 border-cfl-orange/50 hover:bg-cfl-orange/30 hover:shadow-orange-glow'
              }`}
            >
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>
          <a
            href={CFL_SIGNUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-full text-center bg-gradient-to-r from-cfl-orange to-cfl-red text-white py-3 px-6 rounded-lg font-pixel text-[10px] hover:shadow-orange-glow transition-all shadow-pixel-sm"
          >
            SIGN UP ON CFL.FUN
          </a>
        </div>

        {/* This Week's Entries */}
        {cflData && (
          <div className="card-pixel p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-pixel text-[10px] text-white">THIS WEEK'S ENTRIES</h2>
              <span className="font-pixel-body text-sm text-cfl-text-muted">
                {cflData.totalActive} eligible / {cflData.totalReferrals} total
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8 text-cfl-text-muted font-pixel text-[8px]">LOADING...</div>
            ) : cflData.referrals.length === 0 ? (
              <div className="text-center py-8 text-cfl-text-muted font-pixel text-[8px]">NO REFERRALS YET. BE THE FIRST!</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {/* Active entries first - played this week */}
                {cflData.activeReferrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-cfl-green/10 border-2 border-cfl-green/30"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={referral.profilePic}
                        alt={referral.username}
                        className="w-8 h-8 rounded-full border border-cfl-green/50"
                      />
                      <div>
                        <div className="font-pixel-body text-lg text-white">{referral.username}</div>
                        <div className="font-pixel text-[7px] text-cfl-green">
                          ENTERED - PLAYED THIS WEEK
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-pixel text-[9px] text-cfl-green">
                        +{referral.earnedThisWeek.toFixed(5)} SOL
                      </div>
                      <div className="font-pixel text-[7px] text-cfl-text-muted">
                        {referral.referralEarnings.toFixed(5)} total
                      </div>
                    </div>
                  </div>
                ))}

                {/* Inactive referrals - didn't play this week */}
                {cflData.referrals
                  .filter(r => !cflData.activeReferrals.some(a => a.id === r.id))
                  .map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-cfl-bg border border-cfl-border opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={referral.profilePic}
                          alt={referral.username}
                          className="w-8 h-8 rounded-full border border-cfl-border"
                        />
                        <div>
                          <div className="font-pixel-body text-lg text-white">{referral.username}</div>
                          <div className="font-pixel text-[7px] text-cfl-text-muted">
                            NOT ENTERED - NEEDS TO PLAY
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-pixel text-[7px] text-cfl-text-muted">
                          {referral.referralEarnings.toFixed(5)} total
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Past Winners */}
        {pastWinners.length > 0 && (
          <div className="card-pixel p-5">
            <h2 className="font-pixel text-[10px] text-cfl-gold mb-4 flex items-center gap-2">
              <span>🏆</span> PAST WINNERS
            </h2>
            <div className="space-y-2">
              {pastWinners.map((winner, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 bg-cfl-bg rounded-lg border border-cfl-border"
                >
                  <div>
                    <div className="font-pixel-body text-lg text-cfl-green">{winner.winner}</div>
                    <div className="font-pixel text-[7px] text-cfl-text-muted">{winner.weekId}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-pixel text-[9px] text-cfl-gold">{winner.prize}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fine Print */}
        <div className="text-center font-pixel-body text-sm text-cfl-text-muted px-4">
          <p>
            Active players (those who played a paid game this week using my referral) are automatically entered.
            Winner is randomly selected every Friday at noon.
          </p>
        </div>
      </div>
    </div>
  );
}
