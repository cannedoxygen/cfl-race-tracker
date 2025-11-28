import { Token, TradeEvent } from '@/types';

// Helius API key
const HELIUS_API_KEY = '6ed0e579-53f4-43f8-a060-6cd930b55ef1';
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Known DEX program IDs for identifying swaps
const DEX_PROGRAMS = [
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter v6
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpool
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CLMM
];

// Birdeye API for trade data (polling fallback)
const BIRDEYE_API_URL = 'https://public-api.birdeye.so';

type TradeCallback = (trade: TradeEvent) => void;

class TradeStreamService {
  private ws: WebSocket | null = null;
  private callbacks: Set<TradeCallback> = new Set();
  private tokens: Map<string, Token> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastTradeTimestamps: Map<string, number> = new Map();

  setTokens(tokens: Token[]) {
    this.tokens.clear();
    for (const token of tokens) {
      this.tokens.set(token.mint, token);
    }
  }

  subscribe(callback: TradeCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private emit(trade: TradeEvent) {
    for (const callback of this.callbacks) {
      callback(trade);
    }
  }

  // Start streaming trades using polling (more reliable than WebSocket for this use case)
  async startPolling() {
    if (this.pollingInterval) return;

    console.log('Starting trade polling...');

    // Poll every 2 seconds
    this.pollingInterval = setInterval(() => {
      this.fetchRecentTrades();
    }, 2000);

    // Initial fetch
    this.fetchRecentTrades();
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async fetchRecentTrades() {
    const tokenMints = Array.from(this.tokens.keys());

    for (const mint of tokenMints) {
      try {
        // Use Birdeye trades endpoint
        const response = await fetch(
          `${BIRDEYE_API_URL}/defi/txs/token?address=${mint}&tx_type=swap&limit=10`,
          {
            headers: {
              'X-API-KEY': process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '',
              Accept: 'application/json',
            },
          }
        );

        if (!response.ok) continue;

        const data = await response.json();
        if (!data.success || !data.data?.items) continue;

        const token = this.tokens.get(mint);
        if (!token) continue;

        const lastTimestamp = this.lastTradeTimestamps.get(mint) || 0;

        for (const tx of data.data.items) {
          // Skip if we've already processed this trade
          if (tx.blockUnixTime <= lastTimestamp) continue;

          // Determine if it's a buy or sell based on token flow
          const isBuy = tx.to?.symbol === token.symbol || tx.side === 'buy';

          const trade: TradeEvent = {
            mint,
            symbol: token.symbol,
            type: isBuy ? 'buy' : 'sell',
            amountUsd: Math.abs(tx.volumeUSD || tx.volume || 0),
            timestamp: tx.blockUnixTime * 1000,
          };

          if (trade.amountUsd > 0) {
            this.emit(trade);
          }
        }

        // Update last timestamp
        if (data.data.items.length > 0) {
          this.lastTradeTimestamps.set(
            mint,
            Math.max(...data.data.items.map((tx: any) => tx.blockUnixTime))
          );
        }
      } catch (error) {
        // Silently continue on error
      }
    }
  }

  // Alternative: Use Helius transaction history
  async fetchHeliusTrades() {
    const tokenMints = Array.from(this.tokens.keys());

    for (const mint of tokenMints) {
      try {
        const response = await fetch(
          `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${HELIUS_API_KEY}&type=SWAP`
        );

        if (!response.ok) continue;

        const transactions = await response.json();
        const token = this.tokens.get(mint);
        if (!token) continue;

        const lastTimestamp = this.lastTradeTimestamps.get(mint) || 0;

        for (const tx of transactions.slice(0, 10)) {
          if (tx.timestamp <= lastTimestamp / 1000) continue;

          // Parse swap details
          if (tx.events?.swap) {
            const swap = tx.events.swap;
            const isBuy = swap.tokenOutputs?.some((t: any) => t.mint === mint);

            const trade: TradeEvent = {
              mint,
              symbol: token.symbol,
              type: isBuy ? 'buy' : 'sell',
              amountUsd: Math.abs(swap.nativeInput?.amount || swap.nativeOutput?.amount || 0) / 1e9 * 200, // Rough SOL price
              timestamp: tx.timestamp * 1000,
            };

            if (trade.amountUsd > 0) {
              this.emit(trade);
            }
          }
        }

        if (transactions.length > 0) {
          this.lastTradeTimestamps.set(mint, transactions[0].timestamp);
        }
      } catch (error) {
        // Silently continue
      }
    }
  }

  // WebSocket connection (for real-time updates if available)
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(HELIUS_WS_URL);

      this.ws.onopen = () => {
        console.log('Helius WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Subscribe to token accounts
        const tokenMints = Array.from(this.tokens.keys());
        for (const mint of tokenMints) {
          this.ws?.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'accountSubscribe',
              params: [mint, { encoding: 'jsonParsed' }],
            })
          );
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Process incoming transaction data
          if (data.params?.result?.value) {
            this.processTransaction(data.params.result.value);
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log('WebSocket closed');

        // Attempt reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  private processTransaction(tx: any) {
    // Parse transaction for trade events
    // This is a simplified version - real implementation would need more parsing
  }

  disconnect() {
    this.stopPolling();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const tradeService = new TradeStreamService();
