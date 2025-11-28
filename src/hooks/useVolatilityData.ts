'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Token, VolatilityScore } from '@/types';
import { useAppStore } from '@/store/appStore';

interface VolatilityResponse {
  scores: VolatilityScore[];
  timestamp: number;
}

async function fetchVolatility(): Promise<VolatilityResponse> {
  const response = await fetch('/api/volatility');
  if (!response.ok) {
    throw new Error('Failed to fetch volatility data');
  }
  return response.json();
}

export function useVolatilityData(tokens: Token[]) {
  const { addVolatilitySnapshot, setLoading, setError, latestScores, volatilityHistory } =
    useAppStore();

  const refreshInterval =
    typeof window !== 'undefined'
      ? parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '10000', 10)
      : 10000;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['volatility'],
    queryFn: fetchVolatility,
    refetchInterval: refreshInterval,
    staleTime: refreshInterval / 2,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update store when data changes
  useEffect(() => {
    if (data) {
      addVolatilitySnapshot(data.timestamp, data.scores);
    }
  }, [data, addVolatilitySnapshot]);

  // Update loading/error states
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    setError(error ? (error as Error).message : null);
  }, [error, setError]);

  // Generate chart data from history
  const chartData = useCallback(() => {
    const data: Array<{ timestamp: number; [key: string]: number }> = [];

    const sortedTimestamps = Array.from(volatilityHistory.keys()).sort((a, b) => a - b);

    for (const timestamp of sortedTimestamps) {
      const scores = volatilityHistory.get(timestamp);
      if (!scores) continue;

      const point: { timestamp: number; [key: string]: number } = { timestamp };

      for (const score of scores) {
        point[score.symbol] = score.normalizedScore;
      }

      data.push(point);
    }

    return data;
  }, [volatilityHistory]);

  return {
    scores: latestScores,
    chartData: chartData(),
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
