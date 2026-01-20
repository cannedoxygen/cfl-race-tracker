'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRaceStore } from '@/store/raceStore';
import { MatchMode, TrackType } from '@/types';
import { DEFAULT_TOKENS, getTokensByTrack } from '@/lib/tokens';

interface PriceUpdate {
  mint: string;
  symbol: string;
  boost: number;
  startPrice: number;
  currentPrice: number;
  percentChange: number;
}

export function useRaceData() {
  const {
    status,
    startTime,
    elapsedTime,
    matchMode,
    selectedTrack,
    positions,
    alerts,
    startRace: storeStartRace,
    pauseRace,
    resetRace: storeResetRace,
    updatePrices,
    updateElapsedTime,
    initializePositions,
    setMatchMode,
    setSelectedTrack,
    dismissAlert,
  } = useRaceStore();

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const raceStartTimeRef = useRef<number | null>(null);

  // Initialize positions on mount
  useEffect(() => {
    initializePositions(DEFAULT_TOKENS);
  }, [initializePositions]);

  // Fetch prices and calculate % changes
  const fetchPrices = useCallback(async () => {
    if (status !== 'racing' || !raceStartTimeRef.current) return;

    try {
      const response = await fetch(`/api/race-prices?startTime=${raceStartTimeRef.current}`);

      if (!response.ok) return;

      const data = await response.json();

      if (data.prices && data.prices.length > 0) {
        updatePrices(data.prices as PriceUpdate[]);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  }, [status, updatePrices]);

  // Start race with price baseline
  const startRace = useCallback(async () => {
    const now = Date.now();
    raceStartTimeRef.current = now;

    // Initialize race in the API (stores starting prices)
    try {
      await fetch(`/api/race-prices?action=start&startTime=${now}`);
    } catch (error) {
      console.error('Failed to start race in API:', error);
    }

    // Start the race in the store
    storeStartRace();
  }, [storeStartRace]);

  // Reset race
  const resetRace = useCallback(async () => {
    raceStartTimeRef.current = null;

    // Reset in API
    try {
      await fetch('/api/race-prices?action=reset');
    } catch (error) {
      console.error('Failed to reset race in API:', error);
    }

    // Reset in store
    storeResetRace();
  }, [storeResetRace]);

  // Start/stop polling based on race status
  useEffect(() => {
    if (status === 'racing') {
      // Store the start time if resuming
      if (!raceStartTimeRef.current && startTime) {
        raceStartTimeRef.current = startTime;
      }

      // Poll for prices every 2 seconds (Pyth updates ~400ms but we don't need that fast)
      pollingRef.current = setInterval(fetchPrices, 2000);

      // Update elapsed time every second
      timerRef.current = setInterval(updateElapsedTime, 1000);

      // Immediate fetch on start
      fetchPrices();
    } else {
      // Clear intervals when not racing
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, startTime, fetchPrices, updateElapsedTime]);

  // Generate chart data from position histories (limited to last 10 min)
  const chartData = useCallback(() => {
    const data: Array<{ timestamp: number; [key: string]: number }> = [];
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    // Get all unique timestamps across all tokens (last 10 min only)
    const allTimestamps = new Set<number>();
    for (const pos of positions.values()) {
      for (const point of pos.history) {
        if (point.timestamp >= tenMinutesAgo) {
          allTimestamps.add(point.timestamp);
        }
      }
    }

    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Limit to max 300 points for performance (10 min at 2s intervals = 300)
    const step = Math.max(1, Math.floor(sortedTimestamps.length / 300));
    const sampledTimestamps = sortedTimestamps.filter((_, i) => i % step === 0);

    // Build data points
    const lastValues: Map<string, number> = new Map();

    for (const timestamp of sampledTimestamps) {
      const point: { timestamp: number; [key: string]: number } = { timestamp };

      for (const [, pos] of positions) {
        // Find the position value at or before this timestamp
        const historyPoint = pos.history
          .filter((h) => h.timestamp <= timestamp)
          .pop();

        if (historyPoint) {
          lastValues.set(pos.symbol, historyPoint.position);
        }

        point[pos.symbol] = lastValues.get(pos.symbol) || 0;
      }

      data.push(point);
    }

    return data;
  }, [positions]);

  // Get sorted positions for leaderboard
  // In Long mode: highest % change wins (most positive)
  // In Short mode: lowest % change wins (most negative = best for shorting)
  const sortedPositions = useCallback(() => {
    const posArray = Array.from(positions.values());

    if (matchMode === 'long') {
      // Long match: highest % change wins
      return posArray.sort((a, b) => b.position - a.position);
    } else {
      // Short match: lowest % change wins (most negative = best short)
      return posArray.sort((a, b) => a.position - b.position);
    }
  }, [positions, matchMode]);

  return {
    status,
    startTime,
    elapsedTime,
    matchMode,
    selectedTrack,
    positions: sortedPositions(),
    recentTrades: [], // Kept for compatibility but no longer used
    alerts,
    chartData: chartData(),
    startRace,
    pauseRace,
    resetRace,
    setMatchMode,
    setSelectedTrack,
    dismissAlert,
  };
}
