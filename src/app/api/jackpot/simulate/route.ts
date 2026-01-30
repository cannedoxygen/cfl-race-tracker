import { NextRequest, NextResponse } from 'next/server';
import { pickWinner, getJackpotBalance } from '@/lib/jackpot';
import { supabase } from '@/lib/supabase';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const ADMIN_KEY = process.env.REFERRAL_ADMIN_KEY || 'cfl-admin-2024';
const JACKPOT_PER_TICKET_LAMPORTS = 10_000_000; // 0.01 SOL

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-key');
  if (authHeader !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all eligible users
    const { data: allUsers } = await supabase
      .from('users')
      .select('wallet_address, subscription_count')
      .gt('subscription_count', 0);

    const totalTickets = allUsers?.reduce((sum, u) => sum + u.subscription_count, 0) ?? 0;
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
