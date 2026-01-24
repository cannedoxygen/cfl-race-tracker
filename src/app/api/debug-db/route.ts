import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  try {
    // Get all subscriptions
    const { data: allSubs, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // Get all users
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('subscription_count', { ascending: false })
      .limit(20);

    // Get jackpot
    const { data: jackpot, error: jackpotError } = await supabase
      .from('jackpot')
      .select('*');

    // If wallet provided, check specific subscription
    let walletSub = null;
    let walletSubError = null;
    if (wallet) {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('wallet_address', wallet)
        .gt('expires_at', now)
        .order('expires_at', { ascending: false })
        .limit(1);

      walletSub = data;
      walletSubError = error?.message;
    }

    return NextResponse.json({
      subscriptions: {
        count: allSubs?.length || 0,
        data: allSubs,
        error: subsError?.message
      },
      users: {
        count: allUsers?.length || 0,
        data: allUsers,
        error: usersError?.message
      },
      jackpot: {
        data: jackpot,
        error: jackpotError?.message
      },
      walletCheck: wallet ? {
        wallet,
        activeSubscription: walletSub,
        error: walletSubError
      } : null,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
