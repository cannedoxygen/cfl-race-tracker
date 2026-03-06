import { NextResponse, NextRequest } from 'next/server';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Connection, PublicKey } from '@solana/web3.js';
import { TldParser } from '@onsol/tldparser';
import { supabase } from '@/lib/supabase';
import { getRecentDrawing } from '@/lib/jackpot';

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

    // Get ALL users with tickets (no limit) so totals are accurate
    let { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('wallet_address, subscription_count')
      .gt('subscription_count', 0)
      .order('subscription_count', { ascending: false });

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

    // Get most recent jackpot drawing
    const recentWinner = await getRecentDrawing();

    // Use on-chain balance as source of truth (always accurate)
    // This ensures jackpot reflects all payments, even if verify-payment fails
    const jackpotLamports = onChainBalance;

    // Resolve .skr domain names for top wallets via AllDomains
    const rpcConnection = new Connection(RPC_ENDPOINT, 'confirmed');
    const parser = new TldParser(rpcConnection);
    const allWallets = (usersData || []).slice(0, 20).map(u => u.wallet_address);
    if (recentWinner && !allWallets.includes(recentWinner.winnerWallet)) {
      allWallets.push(recentWinner.winnerWallet);
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
