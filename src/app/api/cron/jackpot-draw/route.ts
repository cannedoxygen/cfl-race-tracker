import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime (not Edge) for Solana packages
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate Vercel cron call
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('Cron jackpot-draw: CRON_SECRET not configured');
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Cron jackpot-draw: unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Dynamic import to catch any module loading errors
    let performJackpotDraw;
    try {
      const jackpotModule = await import('@/lib/jackpot');
      performJackpotDraw = jackpotModule.performJackpotDraw;
    } catch (importError) {
      console.error('Cron jackpot-draw: Failed to import jackpot module:', importError);
      return NextResponse.json({
        error: 'Module import failed',
        details: String(importError)
      }, { status: 500 });
    }

    console.log('Cron jackpot-draw: starting draw...');
    const result = await performJackpotDraw();
    console.log('Cron jackpot-draw result:', JSON.stringify(result));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron jackpot-draw error:', error);
    return NextResponse.json({
      error: 'Draw failed',
      details: String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
