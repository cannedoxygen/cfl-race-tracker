import { NextRequest, NextResponse } from 'next/server';
import { addEntry } from '@/lib/referral';

const CFL_API_BASE = 'https://api.cfl.fun';
const USER_PUBLIC_KEY = '8VdX3RKQSTa98vaJsQiMoktcjYXNwaRcM3144KuodPcD';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cflUsername, discordUsername, twitterHandle } = body;

    if (!cflUsername || typeof cflUsername !== 'string') {
      return NextResponse.json(
        { success: false, message: 'CFL username is required' },
        { status: 400 }
      );
    }

    const trimmedUsername = cflUsername.trim();
    if (trimmedUsername.length < 2 || trimmedUsername.length > 50) {
      return NextResponse.json(
        { success: false, message: 'Username must be between 2 and 50 characters' },
        { status: 400 }
      );
    }

    // Verify user is in referral list and is active
    try {
      const listRes = await fetch(`${CFL_API_BASE}/list?userPublicKey=${USER_PUBLIC_KEY}&cursor=`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.success && listData.data.friends) {
          const referrals = listData.data.friends;

          // Find the user in the referral list (case-insensitive)
          const foundUser = referrals.find(
            (r: { username: string }) => r.username.toLowerCase() === trimmedUsername.toLowerCase()
          );

          if (!foundUser) {
            return NextResponse.json(
              { success: false, message: 'You must sign up using referral code LPG8Y6L first!' },
              { status: 400 }
            );
          }

          // Check if user is active (has generated referral earnings)
          if (foundUser.referralEarnings <= 0) {
            return NextResponse.json(
              { success: false, message: 'You must play at least one paid tournament this week to enter!' },
              { status: 400 }
            );
          }
        }
      }
    } catch (verifyError) {
      console.error('CFL verification error:', verifyError);
      // If CFL API fails, allow entry but log it
    }

    const result = await addEntry(
      trimmedUsername,
      discordUsername?.trim() || undefined,
      twitterHandle?.trim() || undefined
    );

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('Referral entry error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process entry' },
      { status: 500 }
    );
  }
}
