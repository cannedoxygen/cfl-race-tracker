import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';

const JACKPOT_WALLET = '5bY2BoRtUjEmDpTtRv6Z5CGWg3WW7WDEqXM4mnnLKEhd';
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

    // Get top users by subscription count from database
    let { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('wallet_address, subscription_count')
      .order('subscription_count', { ascending: false })
      .limit(10);

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
    }

    // Also get all subscriptions for user calculations if users table is empty
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('wallet_address, amount_lamports');

    // If users table is empty but we have subscriptions, compute from subscriptions
    if ((!usersData || usersData.length === 0) && subsData && subsData.length > 0) {
      const userCounts: Record<string, number> = {};
      for (const sub of subsData) {
        userCounts[sub.wallet_address] = (userCounts[sub.wallet_address] || 0) + 1;
      }
      usersData = Object.entries(userCounts)
        .map(([wallet_address, subscription_count]) => ({
          wallet_address,
          subscription_count,
        }))
        .sort((a, b) => b.subscription_count - a.subscription_count)
        .slice(0, 10);
    }

    console.log('Jackpot API response:', {
      onChainBalance,
      usersCount: usersData?.length
    });

    return NextResponse.json({
      totalLamports: onChainBalance,
      topUsers: usersData || [],
    });
  } catch (error) {
    console.error('Jackpot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
