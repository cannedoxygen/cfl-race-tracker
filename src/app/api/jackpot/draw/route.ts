import { NextRequest, NextResponse } from 'next/server';
import { performJackpotDraw } from '@/lib/jackpot';

const ADMIN_KEY = process.env.REFERRAL_ADMIN_KEY || 'cfl-admin-2024';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    if (authHeader !== ADMIN_KEY) {
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
