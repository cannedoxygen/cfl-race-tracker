import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Manual endpoint to record or update a drawing
export async function POST(request: NextRequest) {
  try {
    const adminKey = process.env.REFERRAL_ADMIN_KEY;
    if (!adminKey) {
      return NextResponse.json({ error: 'Admin key not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('x-admin-key');
    if (authHeader !== adminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { weekId, winnerWallet, winnerTickets, totalTickets, prizeSol, txSignature, update } = body;

    if (!weekId) {
      return NextResponse.json({ error: 'Missing required field: weekId' }, { status: 400 });
    }

    // If update flag is set, just update the txSignature
    if (update) {
      const { data, error } = await supabase
        .from('jackpot_drawings')
        .update({ tx_signature: txSignature })
        .eq('week_id', weekId)
        .select();

      if (error) {
        console.error('Failed to update drawing:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated: true, data });
    }

    // Otherwise, insert new record
    if (!winnerWallet || !prizeSol) {
      return NextResponse.json({ error: 'Missing required fields: winnerWallet, prizeSol' }, { status: 400 });
    }

    const prizeLamports = Math.round(prizeSol * 1_000_000_000);

    const { data, error } = await supabase
      .from('jackpot_drawings')
      .insert({
        week_id: weekId,
        winner_wallet: winnerWallet,
        winner_tickets: winnerTickets || 1,
        total_tickets: totalTickets || 1,
        prize_lamports: prizeLamports,
        prize_sol: prizeSol,
        tx_signature: txSignature || null,
        status: 'paid',
      })
      .select();

    if (error) {
      console.error('Failed to record drawing:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Record drawing error:', error);
    return NextResponse.json({ error: 'Failed to record drawing' }, { status: 500 });
  }
}
