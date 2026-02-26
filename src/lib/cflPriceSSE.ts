'use client';

// CFL Price Ingestor SSE Service
// Connects to CFL's real-time price stream

const CFL_PRICE_SSE_URL = 'https://price-ingestor-production.up.railway.app/sse/prices';

export interface PriceData {
  price: number;
  conf: number;
  expo: number;
  ts: number;
}

export interface ParsedPrice {
  pythLazerId: string;
  price: number; // Converted price (price * 10^expo)
  confidence: number;
  timestamp: number;
}

export type PriceUpdateCallback = (prices: Map<string, ParsedPrice>) => void;

export class CFLPriceSSE {
  private eventSource: EventSource | null = null;
  private prices: Map<string, ParsedPrice> = new Map();
  private callbacks: Set<PriceUpdateCallback> = new Set();
  private tokens: string[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Convert raw price to actual price using exponent
  private convertPrice(rawPrice: number, expo: number): number {
    return rawPrice * Math.pow(10, expo);
  }

  // Parse SSE message data
  private parseMessage(type: string, data: string): void {
    try {
      const parsed = JSON.parse(data) as Record<string, PriceData>;

      for (const [pythLazerId, priceData] of Object.entries(parsed)) {
        const convertedPrice: ParsedPrice = {
          pythLazerId,
          price: this.convertPrice(priceData.price, priceData.expo),
          confidence: this.convertPrice(priceData.conf, priceData.expo),
          timestamp: priceData.ts * 1000, // Convert to milliseconds
        };
        this.prices.set(pythLazerId, convertedPrice);
      }

      // Notify all callbacks
      this.notifyCallbacks();
    } catch (error) {
      console.error('[CFL SSE] Failed to parse message:', error);
    }
  }

  private notifyCallbacks(): void {
    for (const callback of this.callbacks) {
      try {
        callback(new Map(this.prices));
      } catch (error) {
        console.error('[CFL SSE] Callback error:', error);
      }
    }
  }

  // Connect to SSE stream
  connect(tokenSymbols: string[]): void {
    if (this.eventSource) {
      this.disconnect();
    }

    if (tokenSymbols.length === 0) {
      console.warn('[CFL SSE] No tokens to connect');
      return;
    }

    this.tokens = tokenSymbols;
    const url = `${CFL_PRICE_SSE_URL}?tokens=${tokenSymbols.join(',')}`;

    console.log('[CFL SSE] Connecting to:', url);

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('[CFL SSE] Connected');
      this.reconnectAttempts = 0;
    };

    // Handle snapshot (initial full state)
    this.eventSource.addEventListener('snapshot', (event) => {
      this.parseMessage('snapshot', event.data);
    });

    // Handle delta (incremental updates)
    this.eventSource.addEventListener('delta', (event) => {
      this.parseMessage('delta', event.data);
    });

    this.eventSource.onerror = (error) => {
      console.error('[CFL SSE] Error:', error);

      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.handleReconnect();
      }
    };
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[CFL SSE] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[CFL SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this.tokens.length > 0) {
        this.connect(this.tokens);
      }
    }, delay);
  }

  // Disconnect from SSE stream
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('[CFL SSE] Disconnected');
    }
  }

  // Subscribe to price updates
  subscribe(callback: PriceUpdateCallback): () => void {
    this.callbacks.add(callback);

    // Immediately send current prices if we have any
    if (this.prices.size > 0) {
      callback(new Map(this.prices));
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  // Get current prices
  getPrices(): Map<string, ParsedPrice> {
    return new Map(this.prices);
  }

  // Get single price by pythLazerId
  getPrice(pythLazerId: string): ParsedPrice | undefined {
    return this.prices.get(pythLazerId);
  }

  // Check if connected
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  // Clear all prices (for race reset)
  clearPrices(): void {
    this.prices.clear();
  }
}

// Singleton instance
let instance: CFLPriceSSE | null = null;

export function getCFLPriceSSE(): CFLPriceSSE {
  if (!instance) {
    instance = new CFLPriceSSE();
  }
  return instance;
}
