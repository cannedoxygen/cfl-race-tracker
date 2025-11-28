import { NextResponse } from 'next/server';
import { loadTokenList } from '@/lib/tokens';
import { fetchTokenPricesWithCache } from '@/lib/priceService';
import { calculateVolatilityScores } from '@/lib/volatility';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Load token list
    const tokens = await loadTokenList();

    // Fetch current prices
    const priceData = await fetchTokenPricesWithCache(tokens);

    // Calculate volatility scores
    const scores = calculateVolatilityScores(priceData, tokens);

    return NextResponse.json({
      scores,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Volatility API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch volatility data' },
      { status: 500 }
    );
  }
}
