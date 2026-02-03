'use client';

import { useState, useEffect } from 'react';
import { truncateAddress } from '@/lib/wallet';
import { formatSol } from '@/lib/subscription';

interface TopUser {
  wallet_address: string;
  subscription_count: number;
}

interface RecentWinner {
  weekId: string;
  winnerWallet: string;
  prizeSol: number;
  txSignature: string | null;
  status: string;
  drawnAt: string;
}

interface JackpotData {
  totalLamports: number;
  topUsers: TopUser[];
  recentWinner: RecentWinner | null;
  domainNames: Record<string, string>;
}

export function JackpotDisplay() {
  const [data, setData] = useState<JackpotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJackpot = async () => {
      try {
        const response = await fetch('/api/jackpot');
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch jackpot:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJackpot();
    const interval = setInterval(fetchJackpot, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-cfl-bg text-white p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-cfl-border rounded w-1/2 mx-auto" />
            <div className="h-24 bg-cfl-border rounded" />
            <div className="h-48 bg-cfl-border rounded" />
          </div>
        </div>
      </div>
    );
  }

  const totalTickets = data?.topUsers.reduce((sum, u) => sum + u.subscription_count, 0) || 0;

  const displayName = (wallet: string) => {
    const domain = data?.domainNames?.[wallet];
    return domain || truncateAddress(wallet, 6);
  };

  return (
    <div className="h-full overflow-y-auto bg-cfl-bg text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-pixel text-lg text-cfl-gold mb-3 animate-gold-shimmer">
            WEEKLY JACKPOT RAFFLE
          </h1>
          <p className="font-pixel-body text-xl text-cfl-text-muted">
            Buy a race pass, get a raffle ticket. Winner takes the jackpot!
          </p>
        </div>

        {/* Jackpot Amount Card */}
        <div className="card-pixel p-6 text-center">
          <div className="font-pixel text-[8px] text-cfl-text-muted mb-2">THIS WEEK'S JACKPOT</div>
          <div className="font-pixel text-3xl md:text-4xl text-cfl-gold animate-gold-shimmer">
            {formatSol(data?.totalLamports || 0)} SOL
          </div>
          <div className="mt-4 flex justify-center gap-6">
            <div>
              <div className="font-pixel text-sm text-cfl-green">{totalTickets}</div>
              <div className="font-pixel-body text-sm text-cfl-text-muted">Raffle Tickets</div>
            </div>
            <div>
              <div className="font-pixel text-sm text-cfl-orange">{data?.topUsers.length || 0}</div>
              <div className="font-pixel-body text-sm text-cfl-text-muted">Players Entered</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-cfl-bg rounded-lg border border-cfl-border space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-pixel text-[8px] text-cfl-text-muted">DRAWING:</span>
              <span className="font-pixel-body text-lg text-cfl-green">{getNextFriday()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-pixel text-[8px] text-cfl-text-muted">WALLET:</span>
              <a
                href="https://solscan.io/account/8BitSWGiGxqUA23gtLR6xPASE8dbU2tvCo9KL2NE26W2"
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel-body text-sm text-cfl-teal hover:text-cfl-green transition-colors underline"
              >
                8Bit...E26W2
              </a>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="card-pixel p-5">
          <h2 className="font-pixel text-[10px] text-cfl-orange mb-4">HOW IT WORKS</h2>
          <ol className="space-y-3 font-pixel-body text-lg text-cfl-text-muted">
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-cfl-orange/20 text-cfl-orange rounded font-pixel text-[8px] flex items-center justify-center">1</span>
              <span>Pay 0.02 SOL for a 24hr race pass</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-cfl-teal/20 text-cfl-teal rounded font-pixel text-[8px] flex items-center justify-center">🎟</span>
              <span><strong className="text-cfl-teal">Get 1 raffle ticket</strong> for each pass you buy</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-cfl-green/20 text-cfl-green rounded font-pixel text-[8px] flex items-center justify-center">+</span>
              <span>0.01 SOL from each pass goes into the jackpot pool</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-cfl-gold/20 text-cfl-gold rounded font-pixel text-[8px] flex items-center justify-center">$</span>
              <span><strong className="text-cfl-gold">Every Friday at noon</strong>, one ticket wins the entire jackpot!</span>
            </li>
          </ol>
        </div>

        {/* This Week's Entries */}
        <div className="card-pixel p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-pixel text-[10px] text-white flex items-center gap-2">
              <span>🎟</span> THIS WEEK'S ENTRIES
            </h2>
            <span className="font-pixel-body text-sm text-cfl-text-muted">
              {totalTickets} tickets / {data?.topUsers.length || 0} players
            </span>
          </div>

          {!data?.topUsers || data.topUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="font-pixel text-[8px] text-cfl-text-muted mb-2">NO ENTRIES YET</div>
              <div className="font-pixel-body text-lg text-cfl-text-muted">Be the first to enter the raffle!</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {data.topUsers.map((user, index) => (
                <div
                  key={user.wallet_address}
                  className="flex items-center justify-between p-3 rounded-lg bg-cfl-teal/10 border border-cfl-teal/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-pixel text-[10px] bg-cfl-teal/20 text-cfl-teal">
                      🎟
                    </span>
                    <div>
                      <div className="font-pixel-body text-lg text-white">
                        {displayName(user.wallet_address)}
                      </div>
                      <div className="font-pixel text-[7px] text-cfl-green">
                        ENTERED
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-pixel text-[10px] text-cfl-teal">
                      {user.subscription_count} {user.subscription_count === 1 ? 'TICKET' : 'TICKETS'}
                    </div>
                    <div className="font-pixel-body text-sm text-cfl-text-muted">
                      {((user.subscription_count / totalTickets) * 100).toFixed(1)}% chance
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Winner */}
        {data?.recentWinner && (
          <div className="card-pixel p-5">
            <h2 className="font-pixel text-[10px] text-cfl-gold mb-4">RECENT WINNER</h2>
            <div className="p-4 rounded-lg bg-cfl-gold/10 border border-cfl-gold/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-pixel text-[10px] bg-cfl-gold/20 text-cfl-gold">
                    🏆
                  </span>
                  <div>
                    <div className="font-pixel-body text-lg text-white">
                      {displayName(data.recentWinner.winnerWallet)}
                    </div>
                    <div className="font-pixel text-[7px] text-cfl-gold">
                      WINNER
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-pixel text-sm text-cfl-gold">
                    {data.recentWinner.prizeSol.toFixed(4)} SOL
                  </div>
                  <div className="font-pixel-body text-sm text-cfl-text-muted">
                    Week of {new Date(data.recentWinner.drawnAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
              {data.recentWinner.txSignature && (
                <a
                  href={`https://solscan.io/tx/${data.recentWinner.txSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center font-pixel text-[8px] text-cfl-teal hover:text-cfl-green transition-colors underline"
                >
                  VIEW TRANSACTION ON SOLSCAN →
                </a>
              )}
              {data.recentWinner.status === 'failed' && (
                <div className="text-center font-pixel text-[8px] text-cfl-orange mt-1">
                  PAYOUT PENDING
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fine Print */}
        <div className="text-center font-pixel-body text-sm text-cfl-text-muted px-4">
          <p>
            Drawing happens every Friday at noon (same time as referral giveaway).
            More tickets = higher chance to win!
          </p>
        </div>
      </div>
    </div>
  );
}
