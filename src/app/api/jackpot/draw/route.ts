import { NextRequest, NextResponse } from 'next/server';
import { performJackpotDraw } from '@/lib/jackpot';

export async function POST(request: NextRequest) {
  try {
    const adminKey = process.env.REFERRAL_ADMIN_KEY;
    if (!adminKey) {
      console.error('REFERRAL_ADMIN_KEY not configured');
      return NextResponse.json(
        { success: false, message: 'Server misconfigured' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('x-admin-key');
    if (authHeader !== adminKey) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await performJackpotDraw();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Jackpot draw error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to perform jackpot draw' },
      { status: 500 }
    );
  }
}
