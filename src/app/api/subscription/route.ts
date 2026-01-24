import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing wallet parameter' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Get the latest active subscription for this wallet
    const { data, error } = await supabase
      .from('subscriptions')
      .select('expires_at')
      .eq('wallet_address', walletAddress)
      .gt('expires_at', now)
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({
        active: false,
        expiresAt: null,
      });
    }

    return NextResponse.json({
      active: true,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
