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

    // Get ALL users with tickets (no limit) so totals are accurate
    let { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('wallet_address, subscription_count')
      .gt('subscription_count', 0)
      .order('subscription_count', { ascending: false });

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
    }

    // Note: After a jackpot drawing, user tickets reset to 0
    // We only show users with actual current tickets, not historical subscriptions

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
