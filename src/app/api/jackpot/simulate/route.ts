import { NextRequest, NextResponse } from 'next/server';
import { pickWinner, getJackpotBalance } from '@/lib/jackpot';
import { supabase } from '@/lib/supabase';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const JACKPOT_PER_TICKET_LAMPORTS = 50_000_000; // 0.05 SOL

export async function GET(request: NextRequest) {
  const adminKey = process.env.REFERRAL_ADMIN_KEY;
  if (!adminKey) {
    console.error('REFERRAL_ADMIN_KEY not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('x-admin-key');
  if (authHeader !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get subscriptions from THIS WEEK only (same logic as pickWinner)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - dayOfWeek);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekStartISO = weekStart.toISOString();

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('wallet_address')
      .gte('created_at', weekStartISO);

    // Count tickets per wallet
    const ticketCounts: Record<string, number> = {};
    for (const sub of subscriptions || []) {
      ticketCounts[sub.wallet_address] = (ticketCounts[sub.wallet_address] || 0) + 1;
    }

    const allUsers = Object.entries(ticketCounts).map(([wallet, count]) => ({
      wallet_address: wallet,
      subscription_count: count,
    }));

    const totalTickets = subscriptions?.length ?? 0;
    const payoutAmount = totalTickets * JACKPOT_PER_TICKET_LAMPORTS;

    // Get on-chain balance
    let onChainBalance = 0;
    try {
      onChainBalance = await getJackpotBalance();
    } catch (_) {}

    // Simulate 10 draws to show probability
    const wins: Record<string, number> = {};
    for (let i = 0; i < 10; i++) {
      const w = await pickWinner();
      if (w) {
        wins[w.wallet_address] = (wins[w.wallet_address] || 0) + 1;
      }
    }

    // Pick one "winner" for this simulation
    const winner = await pickWinner();

    return NextResponse.json({
      dryRun: true,
      noPayout: true,
      winner: winner ? {
        wallet: winner.wallet_address,
        tickets: winner.subscription_count,
        chance: `${((winner.subscription_count / totalTickets) * 100).toFixed(1)}%`,
      } : null,
      jackpot: {
        totalTickets,
        payoutLamports: payoutAmount,
        payoutSol: payoutAmount / LAMPORTS_PER_SOL,
        onChainBalanceLamports: onChainBalance,
        onChainBalanceSol: onChainBalance / LAMPORTS_PER_SOL,
        sufficient: onChainBalance >= payoutAmount + 5000,
      },
      allEntrants: allUsers?.map(u => ({
        wallet: u.wallet_address,
        tickets: u.subscription_count,
        chance: `${((u.subscription_count / totalTickets) * 100).toFixed(1)}%`,
      })) || [],
      simulatedDraws: Object.entries(wins).map(([wallet, count]) => ({
        wallet,
        winsOutOf10: count,
      })).sort((a, b) => b.winsOutOf10 - a.winsOutOf10),
    });
  } catch (error) {
    console.error('Simulate error:', error);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
