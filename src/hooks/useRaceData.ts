'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRaceStore } from '@/store/raceStore';
import { MatchMode, TrackType, Token } from '@/types';
import { DEFAULT_TOKENS, getTokensByTrack, getTokens } from '@/lib/tokens';
import { getCFLPriceSSE, ParsedPrice } from '@/lib/cflPriceSSE';

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

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const raceStartTimeRef = useRef<number | null>(null);
  const startPricesRef = useRef<Map<string, number>>(new Map());
  const lazerIdToTokenRef = useRef<Map<string, Token>>(new Map());
  const sseUnsubscribeRef = useRef<(() => void) | null>(null);

  // Build pythLazerId -> Token lookup
  const buildTokenLookup = useCallback(() => {
    const tokens = getTokens();
    const lookup = new Map<string, Token>();
    for (const token of tokens) {
      if (token.pythLazerId) {
        lookup.set(token.pythLazerId, token);
      }
    }
    lazerIdToTokenRef.current = lookup;
    return tokens;
  }, []);

  // Initialize positions on mount
  useEffect(() => {
    initializePositions(DEFAULT_TOKENS);
    buildTokenLookup();
  }, [initializePositions, buildTokenLookup]);

  // Handle SSE price updates
  const handleSSEPriceUpdate = useCallback((ssePrices: Map<string, ParsedPrice>) => {
    if (status !== 'racing') return;

    const lookup = lazerIdToTokenRef.current;
    const startPrices = startPricesRef.current;
    const priceUpdates: PriceUpdate[] = [];

    for (const [pythLazerId, priceData] of ssePrices) {
      const token = lookup.get(pythLazerId);
      if (!token) continue;

      // Set start price if not already set
      if (!startPrices.has(pythLazerId)) {
        startPrices.set(pythLazerId, priceData.price);
      }

      const startPrice = startPrices.get(pythLazerId) || priceData.price;
      const percentChange = startPrice > 0
        ? ((priceData.price - startPrice) / startPrice) * 100
        : 0;

      priceUpdates.push({
        mint: token.mint,
        symbol: token.symbol,
        boost: token.boost,
        startPrice,
        currentPrice: priceData.price,
        percentChange,
      });
    }

    if (priceUpdates.length > 0) {
      updatePrices(priceUpdates);
    }
  }, [status, updatePrices]);

  // Start race with SSE connection
  const startRace = useCallback(async () => {
    const now = Date.now();
    raceStartTimeRef.current = now;

    // Clear start prices for new race
    startPricesRef.current.clear();

    // Build token lookup
    const tokens = buildTokenLookup();

    // Get token symbols for SSE connection
    const symbols = tokens
      .filter(t => t.pythLazerId)
      .map(t => t.symbol);

    if (symbols.length === 0) {
      console.error('No tokens with pythLazerId found');
      return;
    }

    // Connect to CFL SSE
    const sse = getCFLPriceSSE();

    // Subscribe to price updates
    sseUnsubscribeRef.current = sse.subscribe(handleSSEPriceUpdate);

    // Connect to SSE with token symbols
    sse.connect(symbols);

    console.log('[Race] Started with SSE connection, tokens:', symbols.length);

    // Start the race in the store
    storeStartRace();
  }, [storeStartRace, buildTokenLookup, handleSSEPriceUpdate]);

  // Reset race
  const resetRace = useCallback(async () => {
    raceStartTimeRef.current = null;

    // Clear start prices
    startPricesRef.current.clear();

    // Disconnect SSE
    if (sseUnsubscribeRef.current) {
      sseUnsubscribeRef.current();
      sseUnsubscribeRef.current = null;
    }
    const sse = getCFLPriceSSE();
    sse.disconnect();
    sse.clearPrices();

    console.log('[Race] Reset, SSE disconnected');

    // Reset in store
    storeResetRace();
  }, [storeResetRace]);

  // Manage SSE connection based on race status
  useEffect(() => {
    if (status === 'racing') {
      // Store the start time if resuming
      if (!raceStartTimeRef.current && startTime) {
        raceStartTimeRef.current = startTime;
      }

      // Update elapsed time every second
      timerRef.current = setInterval(updateElapsedTime, 1000);

    } else if (status === 'paused') {
      // Keep SSE connected but stop timer when paused
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      // Idle state - disconnect SSE
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, startTime, updateElapsedTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
      }
      const sse = getCFLPriceSSE();
      sse.disconnect();
    };
  }, []);

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
