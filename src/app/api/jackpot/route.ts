import { NextResponse, NextRequest } from 'next/server';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Connection, PublicKey } from '@solana/web3.js';
import { TldParser } from '@onsol/tldparser';
import { supabase } from '@/lib/supabase';
import { getRecentDrawing, getAllDrawings } from '@/lib/jackpot';

const JACKPOT_WALLET = '8BitDWkraozroK1yfVf2pW3T2kkCrzRVA9rEh5gL8f3m';
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

export async function GET() {
  try {
    // Get actual on-chain balance of jackpot wallet
    let onChainBalance = 0;
    try {
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const jackpotPubkey = new PublicKey(JACKPOT_WALLET);
      onChainBalance = await connection.getBalance(jackpotPubkey);
      console.log('Jackpot on-chain balance:', onChainBalance, 'lamports');
    } catch (rpcError) {
      console.error('Failed to fetch on-chain balance:', rpcError);
    }

    // Get the most recent drawing to filter entries created AFTER it
    const recentDrawingForFilter = await getRecentDrawing();
    const lastDrawingTime = recentDrawingForFilter?.drawnAt
      ? new Date(recentDrawingForFilter.drawnAt).toISOString()
      : null;

    // If no drawing yet, fall back to week start (Sunday)
    let entryCutoff: string;
    if (lastDrawingTime) {
      entryCutoff = lastDrawingTime;
      console.log('Jackpot: Filtering entries after last drawing:', lastDrawingTime);
    } else {
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      const weekStart = new Date(now);
      weekStart.setUTCDate(now.getUTCDate() - dayOfWeek);
      weekStart.setUTCHours(0, 0, 0, 0);
      entryCutoff = weekStart.toISOString();
      console.log('Jackpot: No previous drawing, using week start:', entryCutoff);
    }

    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('wallet_address')
      .gt('created_at', entryCutoff);

    if (subsError) {
      console.error('Failed to fetch subscriptions:', subsError);
    }

    // Count tickets per wallet for this week
    const ticketCounts: Record<string, number> = {};
    for (const sub of subscriptions || []) {
      ticketCounts[sub.wallet_address] = (ticketCounts[sub.wallet_address] || 0) + 1;
    }

    // Convert to array sorted by ticket count
    const usersData = Object.entries(ticketCounts)
      .map(([wallet, count]) => ({
        wallet_address: wallet,
        subscription_count: count,
      }))
      .sort((a, b) => b.subscription_count - a.subscription_count);

    // Note: Now using subscriptions table with created_at filter
    // Only shows users who purchased THIS WEEK, not stale subscription_count

    console.log('Jackpot API response:', {
      onChainBalance,
      usersCount: usersData?.length
    });

    // Get jackpot drawings (most recent and all history)
    const recentWinner = await getRecentDrawing();
    const allWinners = await getAllDrawings();

    // Use on-chain balance as source of truth (always accurate)
    // This ensures jackpot reflects all payments, even if verify-payment fails
    const jackpotLamports = onChainBalance;

    // Resolve .skr domain names for top wallets and all winners via AllDomains
    const rpcConnection = new Connection(RPC_ENDPOINT, 'confirmed');
    const parser = new TldParser(rpcConnection);
    const allWallets = (usersData || []).slice(0, 20).map(u => u.wallet_address);
    // Add all winner wallets to domain resolution
    for (const winner of allWinners) {
      if (!allWallets.includes(winner.winnerWallet)) {
        allWallets.push(winner.winnerWallet);
      }
    }

    const domainMap: Record<string, string> = {};
    await Promise.all(
      allWallets.map(async (wallet) => {
        try {
          const domains = await parser.getParsedAllUserDomainsFromTld(
            new PublicKey(wallet),
            'skr'
          );
          if (domains && domains.length > 0) {
            domainMap[wallet] = domains[0].domain;
          }
        } catch {
          // No .skr domain for this wallet, skip
        }
      })
    );

    return NextResponse.json({
      totalLamports: jackpotLamports,
      topUsers: usersData || [],
      recentWinner,
      allWinners,
      domainNames: domainMap,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      }
    });
  } catch (error) {
    console.error('Jackpot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
