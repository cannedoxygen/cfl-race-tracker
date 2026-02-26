'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getCFLPriceSSE, ParsedPrice } from '@/lib/cflPriceSSE';
import { getTokens } from '@/lib/tokens';
import { Token } from '@/types';

export interface TokenPrice {
  symbol: string;
  mint: string;
  pythLazerId: string;
  price: number;
  previousPrice: number;
  percentChange: number;
  boost: number;
}

interface UseCFLPricesOptions {
  enabled?: boolean;
  onPriceUpdate?: (prices: TokenPrice[]) => void;
}

export function useCFLPrices(options: UseCFLPricesOptions = {}) {
  const { enabled = true, onPriceUpdate } = options;

  const [prices, setPrices] = useState<Map<string, TokenPrice>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store start prices for % change calculation
  const startPricesRef = useRef<Map<string, number>>(new Map());
  const tokensRef = useRef<Token[]>([]);
  const lazerIdToTokenRef = useRef<Map<string, Token>>(new Map());

  // Build pythLazerId -> Token lookup
  const buildTokenLookup = useCallback(() => {
    const tokens = getTokens();
    tokensRef.current = tokens;

    const lookup = new Map<string, Token>();
    for (const token of tokens) {
      if (token.pythLazerId) {
        lookup.set(token.pythLazerId, token);
      }
    }
    lazerIdToTokenRef.current = lookup;

    return tokens;
  }, []);

  // Handle price updates from SSE
  const handlePriceUpdate = useCallback((ssePrice: Map<string, ParsedPrice>) => {
    const tokens = tokensRef.current;
    const lookup = lazerIdToTokenRef.current;
    const startPrices = startPricesRef.current;

    const newPrices = new Map<string, TokenPrice>();

    for (const [pythLazerId, priceData] of ssePrice) {
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

      newPrices.set(token.symbol, {
        symbol: token.symbol,
        mint: token.mint,
        pythLazerId,
        price: priceData.price,
        previousPrice: startPrice,
        percentChange,
        boost: token.boost,
      });
    }

    setPrices(newPrices);

    // Notify callback if provided
    if (onPriceUpdate) {
      onPriceUpdate(Array.from(newPrices.values()));
    }
  }, [onPriceUpdate]);

  // Connect to SSE
  useEffect(() => {
    if (!enabled) return;

    const tokens = buildTokenLookup();

    // Get token symbols for SSE connection
    const symbols = tokens
      .filter(t => t.pythLazerId)
      .map(t => t.symbol);

    if (symbols.length === 0) {
      setError('No tokens with pythLazerId found');
      return;
    }

    const sse = getCFLPriceSSE();

    // Subscribe to price updates
    const unsubscribe = sse.subscribe(handlePriceUpdate);

    // Connect to SSE
    sse.connect(symbols);
    setIsConnected(true);
    setError(null);

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      setIsConnected(sse.isConnected());
    }, 5000);

    return () => {
      unsubscribe();
      sse.disconnect();
      clearInterval(statusInterval);
      setIsConnected(false);
    };
  }, [enabled, buildTokenLookup, handlePriceUpdate]);

  // Reset start prices (for new race)
  const resetStartPrices = useCallback(() => {
    startPricesRef.current.clear();
    const sse = getCFLPriceSSE();
    sse.clearPrices();
  }, []);

  // Set current prices as start prices (for race start)
  const captureStartPrices = useCallback(() => {
    startPricesRef.current.clear();
    // Next price update will set the start prices
  }, []);

  // Get prices as array
  const pricesArray = useCallback(() => {
    return Array.from(prices.values());
  }, [prices]);

  return {
    prices,
    pricesArray: pricesArray(),
    isConnected,
    error,
    resetStartPrices,
    captureStartPrices,
  };
}
