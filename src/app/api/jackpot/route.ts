import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get jackpot total
    let { data: jackpotData, error: jackpotError } = await supabase
      .from('jackpot')
      .select('total_lamports')
      .eq('id', 1)
      .single();

    if (jackpotError) {
      console.error('Failed to fetch jackpot:', jackpotError);

      // Try to create the row if it doesn't exist
      if (jackpotError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('jackpot')
          .insert({ id: 1, total_lamports: 0 });

        if (insertError) {
          console.error('Failed to create jackpot row:', insertError);
        } else {
          jackpotData = { total_lamports: 0 };
        }
      }
    }

    // Get top users by subscription count
    let { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('wallet_address, subscription_count')
      .order('subscription_count', { ascending: false })
      .limit(10);

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
    }

    // Also get all subscriptions for backup calculations
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('wallet_address, amount_lamports');

    // Calculate jackpot from subscriptions (0.01 SOL = 10_000_000 lamports per sub)
    const calculatedJackpot = (subsData?.length || 0) * 10_000_000;

    // Use the higher value (in case jackpot table wasn't updated)
    const finalJackpot = Math.max(jackpotData?.total_lamports || 0, calculatedJackpot);

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
      tableValue: jackpotData?.total_lamports,
      calculatedFromSubs: calculatedJackpot,
      subsCount: subsData?.length,
      finalJackpot,
      usersCount: usersData?.length
    });

    return NextResponse.json({
      totalLamports: finalJackpot,
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
