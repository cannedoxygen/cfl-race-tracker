import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { takeEarningsSnapshot } from '@/lib/referral';

const CFL_API_BASE = 'https://v12-cfl-backend-production.up.railway.app';
const USER_PUBLIC_KEY = '8VdX3RKQSTa98vaJsQiMoktcjYXNwaRcM3144KuodPcD';
const ADMIN_KEY = process.env.REFERRAL_ADMIN_KEY || 'cfl-admin-2024';

function getCurrentWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

// POST - Perform the drawing (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('x-admin-key');
    if (authHeader !== ADMIN_KEY) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch active referrals from CFL
    const listRes = await fetch(`${CFL_API_BASE}/user/referral/list?userPublicKey=${USER_PUBLIC_KEY}&cursor=`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!listRes.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch referral list from CFL' },
        { status: 500 }
      );
    }

    const listData = await listRes.json();
    if (!listData.success || !listData.data.friends) {
      return NextResponse.json(
        { success: false, message: 'Invalid response from CFL API' },
        { status: 500 }
      );
    }

    // Filter for active referrals (those who have played paid games)
    const activeReferrals = listData.data.friends.filter(
      (r: { referralEarnings: number }) => r.referralEarnings > 0
    );

    if (activeReferrals.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No active entries this week!' },
        { status: 400 }
      );
    }

    // Random selection
    const winnerIndex = Math.floor(Math.random() * activeReferrals.length);
    const winner = activeReferrals[winnerIndex];
    const weekId = getCurrentWeekId();

    // Calculate prize (50% of total earnings)
    const totalEarnings = activeReferrals.reduce(
      (sum: number, r: { referralEarnings: number }) => sum + r.referralEarnings,
      0
    );
    const prize = `${(totalEarnings * 0.5).toFixed(5)} SOL`;

    // Save to Supabase
    const { error } = await supabase
      .from('weekly_drawings')
      .insert({
        week_id: weekId,
        winner_id: winner.id.toString(),
        winner_username: winner.username,
        entry_count: activeReferrals.length,
        prize: prize,
      });

    if (error) {
      console.error('Supabase drawing error:', error);
      // Continue anyway - drawing was successful even if save failed
    }

    // Snapshot ALL referrals' earnings (not just active ones)
    // This becomes the baseline for next week's eligibility check
    const allReferrals = listData.data.friends.map(
      (r: { username: string; referralEarnings: number }) => ({
        username: r.username,
        referralEarnings: r.referralEarnings,
      })
    );
    const snapshotResult = await takeEarningsSnapshot(weekId, allReferrals);
    console.log(`Snapshot taken: ${snapshotResult.count} referrals recorded for ${weekId}`);

    return NextResponse.json({
      success: true,
      message: `Winner selected: ${winner.username}!`,
      winner: {
        username: winner.username,
        address: winner.address,
        profilePic: winner.profilePic,
      },
      prize,
      weekId,
      totalEntries: activeReferrals.length,
      snapshotCount: snapshotResult.count,
    });
  } catch (error) {
    console.error('Drawing error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to perform drawing' },
      { status: 500 }
    );
  }
}

// GET - Get past drawings
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('weekly_drawings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Supabase fetch drawings error:', error);
      return NextResponse.json({ success: true, pastDrawings: [] });
    }

    const pastDrawings = data.map(row => ({
      weekId: row.week_id,
      winner: row.winner_username,
      prize: row.prize,
      drawnAt: new Date(row.created_at).getTime(),
      entryCount: row.entry_count,
    }));

    return NextResponse.json({
      success: true,
      pastDrawings,
    });
  } catch (error) {
    console.error('Get drawings error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get past drawings' },
      { status: 500 }
    );
  }
}
