import { NextRequest, NextResponse } from 'next/server';
import { performJackpotDraw } from '@/lib/jackpot';

export async function GET(request: NextRequest) {
  // Verify this is a legitimate Vercel cron call
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret) {
    // If CRON_SECRET is configured, enforce it
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Cron jackpot-draw: unauthorized — auth header mismatch');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    // No CRON_SECRET configured — allow Vercel cron but log a warning
    console.warn('Cron jackpot-draw: CRON_SECRET not set — skipping auth check. Set CRON_SECRET in Vercel env vars for security.');
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
