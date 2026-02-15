import { NextRequest, NextResponse } from 'next/server';
import { performJackpotDraw } from '@/lib/jackpot';

export async function GET(request: NextRequest) {
  // Verify this is a legitimate Vercel cron call - MANDATORY
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('Cron jackpot-draw: CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('Cron jackpot-draw: unauthorized — auth header mismatch');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Cron jackpot-draw: starting draw...');
    const result = await performJackpotDraw();
    console.log('Cron jackpot-draw result:', JSON.stringify(result));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron jackpot-draw error:', error);
    return NextResponse.json({ error: 'Draw failed', details: String(error) }, { status: 500 });
  }
}
