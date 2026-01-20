import { NextResponse } from 'next/server';

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
        // Active = has generated any referral earnings (played paid games)
        activeReferrals = referrals.filter((r: CFLFriend) => r.referralEarnings > 0);
      }
    }

    // Get list of active usernames for validation
    const activeUsernames = activeReferrals.map((r: CFLFriend) => r.username.toLowerCase());

    return NextResponse.json({
      success: true,
      stats,
      referrals,
      activeReferrals,
      activeUsernames,
      totalReferrals: referrals.length,
      totalActive: activeReferrals.length,
      totalEarnings: stats?.referralEarnings || 0,
    });
  } catch (error) {
    console.error('CFL data fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch CFL data' },
      { status: 500 }
    );
  }
}
