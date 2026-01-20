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
          <h1 className="text-2xl font-bold mb-2">Weekly Referral Giveaway</h1>
          <p className="text-gray-400 text-sm">
            Use my referral code, play CFL, and you're automatically entered to win 50% of the fees!
          </p>
        </div>

        {/* Stats Cards */}
        {cflData?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-cfl-card rounded-xl p-4 border border-cfl-border text-center">
              <div className="text-2xl font-bold text-green-400">
                {cflData.totalEarnings.toFixed(5)}
              </div>
              <div className="text-xs text-gray-400">SOL This Week</div>
            </div>
            <div className="bg-cfl-card rounded-xl p-4 border border-cfl-border text-center">
              <div className="text-2xl font-bold text-orange-400">
                {cflData.totalReferrals}
              </div>
              <div className="text-xs text-gray-400">Total Referrals</div>
            </div>
            <div className="bg-cfl-card rounded-xl p-4 border border-cfl-border text-center">
              <div className="text-2xl font-bold text-blue-400">
                {cflData.totalActive}
              </div>
              <div className="text-xs text-gray-400">Entries This Week</div>
            </div>
            <div className="bg-cfl-card rounded-xl p-4 border border-cfl-border text-center">
              <div className="text-2xl font-bold text-purple-400">
                {(cflData.totalEarnings * 0.5).toFixed(5)}
              </div>
              <div className="text-xs text-gray-400">Prize Pool (50%)</div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-cfl-card rounded-xl p-5 border border-cfl-border">
          <h2 className="text-lg font-semibold mb-3 text-orange-400">How It Works</h2>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Sign up on CFL using my referral code below</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Play at least one paid game (Rush or Tournament) this week</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold">✓</span>
              <span><strong className="text-green-400">You're automatically entered!</strong> No signup needed.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Every Friday at noon, one winner gets <strong className="text-green-400">50% of that week's fees</strong>!</span>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Next drawing:</span>
              <span className="text-green-400 font-medium">{getNextFriday()}</span>
            </div>
          </div>
        </div>

        {/* Referral Code */}
        <div className="bg-cfl-card rounded-xl p-5 border border-cfl-border">
          <h2 className="text-lg font-semibold mb-3">Join with My Code</h2>
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-3 border border-gray-700">
            <span className="text-xl font-mono font-bold text-orange-400 flex-1 text-center">
              {REFERRAL_CODE}
            </span>
            <button
              onClick={copyCode}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/50 hover:bg-orange-500/30'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <a
            href={CFL_SIGNUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-full text-center bg-gradient-to-r from-orange-500 to-red-500 text-white py-2.5 px-6 rounded-lg font-semibold text-sm hover:from-orange-600 hover:to-red-600 transition-colors"
          >
            Sign Up on CFL.fun
          </a>
        </div>

        {/* This Week's Entries */}
        {cflData && (
          <div className="bg-cfl-card rounded-xl p-5 border border-cfl-border">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">This Week's Entries</h2>
              <span className="text-sm text-gray-400">
                {cflData.totalActive} eligible / {cflData.totalReferrals} total
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : cflData.referrals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No referrals yet. Be the first!</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {/* Active entries first */}
                {cflData.activeReferrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={referral.profilePic}
                        alt={referral.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="font-medium text-sm">{referral.username}</div>
                        <div className="text-xs text-green-400">
                          Entered - played this week
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-green-400">
                        {referral.referralEarnings.toFixed(5)} SOL
                      </div>
                    </div>
                  </div>
                ))}

                {/* Inactive referrals */}
                {cflData.referrals
                  .filter(r => r.referralEarnings <= 0)
                  .map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={referral.profilePic}
                          alt={referral.username}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-sm">{referral.username}</div>
                          <div className="text-xs text-gray-500">
                            Not entered - needs to play a paid game
                          </div>
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
          <div className="bg-cfl-card rounded-xl p-5 border border-cfl-border">
            <h2 className="text-lg font-semibold mb-3">Past Winners</h2>
            <div className="space-y-2">
              {pastWinners.map((winner, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg"
                >
                  <div>
                    <div className="text-green-400 font-semibold text-sm">{winner.winner}</div>
                    <div className="text-xs text-gray-500">{winner.weekId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-orange-400 font-medium text-sm">{winner.prize}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fine Print */}
        <div className="text-center text-xs text-gray-600">
          <p>
            Active players (those who played a paid game this week using my referral) are automatically entered.
            Winner is randomly selected every Friday at noon.
          </p>
        </div>
      </div>
    </div>
  );
}
