import { NextResponse } from 'next/server';
import { getLatestSnapshot } from '@/lib/referral';

export const dynamic = 'force-dynamic';

// Your wallet public key
const USER_PUBLIC_KEY = '8VdX3RKQSTa98vaJsQiMoktcjYXNwaRcM3144KuodPcD';
const CFL_API_BASE = 'https://v12-cfl-backend-production.up.railway.app';

interface CFLFriend {
  id: number;
  address: string;
  username: string;
  isLegends: boolean;
  isSeekerHolder: boolean;
  profilePic: string;
  mmr: number;
  referralEarnings: number;
  activeFrameUrl: string | null;
}

interface CFLStats {
  username: string;
  profilePicture: string;
  referralCode: string;
  referralEarnings: number;
  trophies: number;
  rank: number;
}

export async function GET() {
  try {
    // Fetch stats and referral list in parallel
    const [statsRes, listRes] = await Promise.all([
      fetch(`${CFL_API_BASE}/user/stats?userPublicKey=${USER_PUBLIC_KEY}&forceRefresh=false`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      }),
      fetch(`${CFL_API_BASE}/user/referral/list?userPublicKey=${USER_PUBLIC_KEY}&cursor=`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      }),
    ]);

    let stats: CFLStats | null = null;
    let referrals: CFLFriend[] = [];
    let activeReferrals: CFLFriend[] = [];

    if (statsRes.ok) {
      const statsData = await statsRes.json();
      if (statsData.success) {
        stats = {
          username: statsData.data.username,
          profilePicture: statsData.data.profilePicture,
          referralCode: statsData.data.referralCode,
          referralEarnings: statsData.data.referralEarnings,
          trophies: statsData.data.trophies,
          rank: statsData.data.rank,
        };
      }
    }

    if (listRes.ok) {
      const listData = await listRes.json();
      if (listData.success) {
        referrals = listData.data.friends || [];
      }
    }

    // Get last week's snapshot to determine who actually played THIS week
    const lastSnapshot = await getLatestSnapshot();
    const hasSnapshot = lastSnapshot.size > 0;

    // Build enriched referral data with weekly earnings
    const enrichedReferrals = referrals.map((r: CFLFriend) => {
      const snapshotEarnings = lastSnapshot.get(r.username.toLowerCase()) ?? 0;
      const earnedThisWeek = r.referralEarnings - snapshotEarnings;
      return {
        ...r,
        earnedThisWeek: Math.max(0, earnedThisWeek), // avoid negatives from rounding
        snapshotEarnings,
      };
    });

    // Active = earned MORE than their snapshot (played paid games this week)
    // If no snapshot exists yet, fall back to all-time earnings > 0
    activeReferrals = hasSnapshot
      ? enrichedReferrals.filter((r: { earnedThisWeek: number }) => r.earnedThisWeek > 0)
      : enrichedReferrals.filter((r: { referralEarnings: number }) => r.referralEarnings > 0);

    const activeUsernames = activeReferrals.map((r: CFLFriend) => r.username.toLowerCase());

    // Calculate this week's earnings
    const weeklyEarnings = enrichedReferrals.reduce(
      (sum: number, r: { earnedThisWeek: number }) => sum + r.earnedThisWeek, 0
    );

    return NextResponse.json({
      success: true,
      stats,
      referrals: enrichedReferrals,
      activeReferrals,
      activeUsernames,
      totalReferrals: referrals.length,
      totalActive: activeReferrals.length,
      totalEarnings: stats?.referralEarnings || 0,
      weeklyEarnings,
      hasSnapshot,
    });
  } catch (error) {
    console.error('CFL data fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch CFL data' },
      { status: 500 }
    );
  }
}
