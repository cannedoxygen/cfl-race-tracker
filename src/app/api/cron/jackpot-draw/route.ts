import { NextRequest, NextResponse } from 'next/server';
import { performJackpotDraw } from '@/lib/jackpot';

export async function GET(request: NextRequest) {
  // Verify this is a legitimate Vercel cron call
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await performJackpotDraw();
    console.log('Cron jackpot draw result:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron jackpot draw error:', error);
    return NextResponse.json({ error: 'Draw failed' }, { status: 500 });
  }
}
