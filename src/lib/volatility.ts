import { Token, TokenPriceData, VolatilityScore, PricePoint } from '@/types';
import { getTokenColor } from './tokens';

/**
 * Volatility Score Formula:
 *
 * volatility_score =
 *     abs(percent_change_1m) * 0.6
 *   + abs(percent_change_5m) * 0.4
 *   + (stddev_last_10m * normalized_factor * 0.2)
 *
 * The score emphasizes short-term volatility (1m) more heavily,
 * while still accounting for medium-term trends (5m) and
 * overall price variance (stddev).
 */

// Calculate standard deviation of prices
function calculateStdDev(prices: number[]): number {
  if (prices.length < 2) return 0;

  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const squareDiffs = prices.map((price) => Math.pow(price - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;

  return Math.sqrt(avgSquareDiff);
}

// Calculate coefficient of variation (stddev / mean) as percentage
function calculateCV(history: PricePoint[], timeWindowMs: number): number {
  const now = Date.now();
  const cutoff = now - timeWindowMs;
  const recentPrices = history.filter((p) => p.timestamp >= cutoff).map((p) => p.price);

  if (recentPrices.length < 2) return 0;

  const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  if (mean === 0) return 0;

  const stdDev = calculateStdDev(recentPrices);
  return (stdDev / mean) * 100; // As percentage
}

export function calculateVolatilityScores(
  priceData: TokenPriceData[],
  tokens: Token[]
): VolatilityScore[] {
  const scores: VolatilityScore[] = [];

  for (const data of priceData) {
    const token = tokens.find((t) => t.mint === data.mint);
    if (!token) continue;

    // Get absolute values of percent changes
    const absChange1m = Math.abs(data.percentChange1m);
    const absChange5m = Math.abs(data.percentChange5m);

    // Calculate coefficient of variation over 10 minutes
    const cv10m = calculateCV(data.priceHistory, 10 * 60 * 1000);

    // Compute raw volatility score
    const rawScore = absChange1m * 0.6 + absChange5m * 0.4 + cv10m * 0.2;

    scores.push({
      mint: data.mint,
      symbol: data.symbol,
      name: token.name,
      logoURI: token.logoURI,
      score: rawScore,
      normalizedScore: 0, // Will be normalized after all scores computed
      percentChange1m: data.percentChange1m,
      percentChange5m: data.percentChange5m,
      currentPrice: data.currentPrice,
      priceHistory: data.priceHistory,
      color: getTokenColor(token.symbol),
    });
  }

  // Normalize scores to 0-100 range
  const maxScore = Math.max(...scores.map((s) => s.score), 1);
  const minScore = Math.min(...scores.map((s) => s.score), 0);
  const range = maxScore - minScore || 1;

  for (const score of scores) {
    // Normalize to 0-100, with some padding for visual appeal
    score.normalizedScore = ((score.score - minScore) / range) * 80 + 10;
  }

  // Sort by volatility score descending
  scores.sort((a, b) => b.score - a.score);

  return scores;
}

// Generate chart data from volatility history
export function generateChartData(
  volatilityHistory: Map<number, VolatilityScore[]>,
  tokens: Token[]
): Array<{ timestamp: number; [key: string]: number }> {
  const chartData: Array<{ timestamp: number; [key: string]: number }> = [];

  const sortedTimestamps = Array.from(volatilityHistory.keys()).sort((a, b) => a - b);

  for (const timestamp of sortedTimestamps) {
    const scores = volatilityHistory.get(timestamp);
    if (!scores) continue;

    const dataPoint: { timestamp: number; [key: string]: number } = { timestamp };

    for (const score of scores) {
      dataPoint[score.symbol] = score.normalizedScore;
    }

    chartData.push(dataPoint);
  }

  return chartData;
}

// Format price for display
export function formatPrice(price: number): string {
  if (price === 0) return '$0.00';

  if (price < 0.0001) {
    return `$${price.toExponential(2)}`;
  }

  if (price < 1) {
    return `$${price.toFixed(6)}`;
  }

  if (price < 1000) {
    return `$${price.toFixed(2)}`;
  }

  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// Format percent change for display
export function formatPercentChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}
