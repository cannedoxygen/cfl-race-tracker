import { NextResponse } from 'next/server';
import { getCurrentWeekEntries, getCurrentWeekId, getNextDrawingTime, REFERRAL_CODE } from '@/lib/referral';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const entries = await getCurrentWeekEntries();
    const weekId = getCurrentWeekId();
    const nextDrawing = getNextDrawingTime();

    return NextResponse.json({
      success: true,
      referralCode: REFERRAL_CODE,
      weekId,
      entryCount: entries.length,
      nextDrawing: nextDrawing.toISOString(),
      nextDrawingFormatted: nextDrawing.toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
    });
  } catch (error) {
    console.error('Get entries error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get entries' },
      { status: 500 }
    );
  }
}
