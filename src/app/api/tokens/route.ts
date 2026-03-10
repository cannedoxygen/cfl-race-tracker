import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CFL_TOKEN_API = 'https://v12-cfl-backend-production.up.railway.app/token/list?page=1&limit=500';

// Tokens to exclude from the game (low volume, erratic behavior, etc.)
const EXCLUDED_TOKENS = ['SATS'];

// Cache tokens in memory with short TTL to pick up new tokens quickly
let cachedTokens: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 1 minute - short to pick up new tokens faster

async function fetchTokensFromAPI(): Promise<any[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedTokens && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedTokens;
  }

  try {
    const response = await fetch(CFL_TOKEN_API, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`CFL API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      cachedTokens = data.data;
      cacheTimestamp = now;
      return data.data;
    }

    throw new Error('Invalid API response format');
  } catch (error) {
    console.error('[Tokens API] Failed to fetch from CFL backend:', error);

    // Return cached data even if expired, as fallback
    if (cachedTokens) {
      console.log('[Tokens API] Using stale cache as fallback');
      return cachedTokens;
    }

    throw error;
  }
}

export async function GET() {
  try {
    const allTokens = await fetchTokensFromAPI();

    // Filter out excluded tokens
    const tokens = allTokens.filter(
      (token: any) => !EXCLUDED_TOKENS.includes(token.tokenSymbol?.toUpperCase())
    );

    return NextResponse.json({
      success: true,
      data: tokens,
      count: tokens.length,
      cached: (Date.now() - cacheTimestamp) > 1000, // Was this from cache?
      timestamp: Date.now(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      }
    });
  } catch (error) {
    console.error('[Tokens API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tokens', data: [] },
      { status: 500 }
    );
  }
}
