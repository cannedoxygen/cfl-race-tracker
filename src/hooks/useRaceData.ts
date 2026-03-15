'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRaceStore } from '@/store/raceStore';
import { Token } from '@/types';
import { getTokens, loadTokenList, setCurrentWallet } from '@/lib/tokens';
import { getCFLPriceSSE, ParsedPrice } from '@/lib/cflPriceSSE';
import { PRICE_CONFIG, isCflSSEEnabled } from '@/lib/priceConfig';

interface PriceUpdate {
  mint: string;
  symbol: string;
  boost: number;
  startPrice: number;
  currentPrice: number;
  percentChange: number;
}

export function useRaceData() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

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

  // Update global wallet state for token API calls
  useEffect(() => {
    setCurrentWallet(walletAddress);
  }, [walletAddress]);

  // SSE-specific refs
  const startPricesRef = useRef<Map<string, number>>(new Map());
  const lazerIdToTokenRef = useRef<Map<string, Token>>(new Map());
  const sseUnsubscribeRef = useRef<(() => void) | null>(null);

  // Build pythLazerId -> Token lookup (for SSE mode)
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

  // Initialize positions when wallet is available - fetch tokens with wallet for auth
  useEffect(() => {
    async function loadTokens() {
      if (!walletAddress) return; // Wait for wallet to be connected
      const tokens = await loadTokenList();
      if (tokens.length > 0) {
        initializePositions(tokens);
        buildTokenLookup();
      }
    }
    loadTokens();
  }, [initializePositions, buildTokenLookup, walletAddress]);

  // ============================================
  // SSE Mode: Handle price updates from CFL SSE
  // ============================================
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

  // ============================================
  // Polling Mode: Fetch prices from Pyth API
  // ============================================
  const fetchPrices = useCallback(async () => {
    if (status !== 'racing' || !raceStartTimeRef.current) return;

    try {
      const walletParam = walletAddress ? `&wallet=${walletAddress}` : '';
      const response = await fetch(`/api/race-prices?startTime=${raceStartTimeRef.current}${walletParam}`);

      if (!response.ok) return;

      const data = await response.json();

      if (data.prices && data.prices.length > 0) {
        updatePrices(data.prices as PriceUpdate[]);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  }, [status, updatePrices, walletAddress]);

  // ============================================
  // Start Race
  // ============================================
  const startRace = useCallback(async () => {
    const now = Date.now();
    raceStartTimeRef.current = now;

    if (isCflSSEEnabled()) {
      // SSE Mode: Connect to CFL price stream
      console.log('[Race] Starting with CFL SSE mode');

      startPricesRef.current.clear();
      const tokens = buildTokenLookup();
      const symbols = tokens.filter(t => t.pythLazerId).map(t => t.symbol);

      if (symbols.length === 0) {
        console.error('No tokens with pythLazerId found');
        return;
      }

      const sse = getCFLPriceSSE();
      sseUnsubscribeRef.current = sse.subscribe(handleSSEPriceUpdate);
      sse.connect(symbols);

    } else {
      // Polling Mode: Initialize race in API
      console.log('[Race] Starting with Pyth polling mode');

      try {
        const walletParam = walletAddress ? `&wallet=${walletAddress}` : '';
        await fetch(`/api/race-prices?action=start&startTime=${now}${walletParam}`);
      } catch (error) {
        console.error('Failed to start race in API:', error);
      }
    }

    storeStartRace();
  }, [storeStartRace, buildTokenLookup, handleSSEPriceUpdate, walletAddress]);

  // ============================================
  // Reset Race
  // ============================================
  const resetRace = useCallback(async () => {
    raceStartTimeRef.current = null;

    if (isCflSSEEnabled()) {
      // SSE Mode: Disconnect
      startPricesRef.current.clear();
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
        sseUnsubscribeRef.current = null;
      }
      const sse = getCFLPriceSSE();
      sse.disconnect();
      sse.clearPrices();
    } else {
      // Polling Mode: Reset API state
      try {
        const walletParam = walletAddress ? `&wallet=${walletAddress}` : '';
        await fetch(`/api/race-prices?action=reset${walletParam}`);
      } catch (error) {
        console.error('Failed to reset race in API:', error);
      }
    }

    storeResetRace();
  }, [storeResetRace, walletAddress]);

  // ============================================
  // Manage polling/timer based on race status
  // ============================================
  useEffect(() => {
    if (status === 'racing') {
      if (!raceStartTimeRef.current && startTime) {
        raceStartTimeRef.current = startTime;
      }

      // Always run elapsed time timer
      timerRef.current = setInterval(updateElapsedTime, 1000);

      // Only poll if NOT using SSE
      if (!isCflSSEEnabled()) {
        pollingRef.current = setInterval(fetchPrices, PRICE_CONFIG.pollingInterval);
        fetchPrices(); // Immediate fetch
      }

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
      }
      if (isCflSSEEnabled()) {
        const sse = getCFLPriceSSE();
        sse.disconnect();
      }
    };
  }, []);

  // ============================================
  // Chart data generation
  // ============================================
  const chartData = useCallback(() => {
    const data: Array<{ timestamp: number; [key: string]: number }> = [];
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    const allTimestamps = new Set<number>();
    for (const pos of positions.values()) {
      for (const point of pos.history) {
        if (point.timestamp >= tenMinutesAgo) {
          allTimestamps.add(point.timestamp);
        }
      }
    }

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    const step = Math.max(1, Math.floor(sortedTimestamps.length / 300));
    const sampledTimestamps = sortedTimestamps.filter((_, i) => i % step === 0);

    const lastValues: Map<string, number> = new Map();

    for (const timestamp of sampledTimestamps) {
      const point: { timestamp: number; [key: string]: number } = { timestamp };

      for (const [, pos] of positions) {
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

  // ============================================
  // Sorted positions for leaderboard
  // ============================================
  const sortedPositions = useCallback(() => {
    const posArray = Array.from(positions.values());

    if (matchMode === 'long') {
      return posArray.sort((a, b) => b.position - a.position);
    } else {
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
    recentTrades: [],
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
