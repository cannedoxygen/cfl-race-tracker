import { create } from 'zustand';
import { RaceStatus, RacePosition, Token, MatchMode, MomentumSignal, TrackType } from '@/types';
import { DEFAULT_TOKENS, getTokenColor, getTokensByTrack } from '@/lib/tokens';

interface PriceUpdate {
  mint: string;
  symbol: string;
  boost: number;
  startPrice: number;
  currentPrice: number;
  percentChange: number;  // Rolling 60s change (used for ranking)
  totalChange?: number;   // Total change from race start (for reference)
}

interface RaceStore {
  // Race state
  status: RaceStatus;
  startTime: number | null;
  elapsedTime: number; // in seconds
  matchMode: MatchMode; // Long or Short match mode
  selectedTrack: TrackType | 'all'; // Track filter

  // Token positions (now based on % price change)
  positions: Map<string, RacePosition>;

  // Alerts
  alerts: Alert[];

  // Actions
  startRace: () => void;
  pauseRace: () => void;
  resetRace: () => void;
  updatePrices: (updates: PriceUpdate[]) => void;
  updateElapsedTime: () => void;
  initializePositions: (tokens: Token[]) => void;
  setMatchMode: (mode: MatchMode) => void;
  setSelectedTrack: (track: TrackType | 'all') => void;
  dismissAlert: (id: string) => void;
}

interface Alert {
  id: string;
  type: 'big_mover' | 'momentum_shift' | 'leader_change';
  symbol: string;
  message: string;
  timestamp: number;
}

const MAX_ALERTS = 10;

export const useRaceStore = create<RaceStore>((set, get) => ({
  status: 'idle',
  startTime: null,
  elapsedTime: 0,
  matchMode: 'long',
  selectedTrack: 'all',
  positions: new Map(),
  alerts: [],

  setMatchMode: (mode: MatchMode) => {
    set({ matchMode: mode });
  },

  setSelectedTrack: (track: TrackType | 'all') => {
    const tokens = getTokensByTrack(track);
    get().initializePositions(tokens);
    set({ selectedTrack: track });
  },

  dismissAlert: (id: string) => {
    const { alerts } = get();
    set({ alerts: alerts.filter(a => a.id !== id) });
  },

  initializePositions: (tokens: Token[]) => {
    const positions = new Map<string, RacePosition>();

    for (const token of tokens) {
      positions.set(token.mint, {
        mint: token.mint,
        symbol: token.symbol,
        name: token.name,
        logoURI: token.logoURI,
        color: getTokenColor(token.symbol),
        position: 0, // % price change
        normalizedPosition: 50,
        totalBuys: 0,
        totalSells: 0,
        tradeCount: 0,
        history: [],
        // Price tracking
        startPrice: 0,
        currentPrice: 0,
        boost: token.boost,
        // CFL metrics (simplified)
        buyCount: 0,
        sellCount: 0,
        buyRatio: 0.5,
        velocity: 0,
        momentum: 'neutral',
        volumeSpike: false,
        recentVolume: 0,
        avgTradeSize: 0,
        largestTrade: 0,
        lastTradeTime: 0,
      });
    }

    set({ positions });
  },

  startRace: () => {
    const { positions } = get();
    const now = Date.now();

    // Reset all positions to zero
    const resetPositions = new Map<string, RacePosition>();
    for (const [mint, pos] of positions) {
      resetPositions.set(mint, {
        ...pos,
        position: 0,
        normalizedPosition: 50,
        totalBuys: 0,
        totalSells: 0,
        tradeCount: 0,
        history: [{ timestamp: now, position: 0 }],
        startPrice: 0,
        currentPrice: 0,
        velocity: 0,
        momentum: 'neutral',
      });
    }

    set({
      status: 'racing',
      startTime: now,
      elapsedTime: 0,
      positions: resetPositions,
      alerts: [],
    });
  },

  pauseRace: () => {
    set({ status: 'paused' });
  },

  resetRace: () => {
    const { positions } = get();

    // Reset all positions
    const resetPositions = new Map<string, RacePosition>();
    for (const [mint, pos] of positions) {
      resetPositions.set(mint, {
        ...pos,
        position: 0,
        normalizedPosition: 50,
        totalBuys: 0,
        totalSells: 0,
        tradeCount: 0,
        history: [],
        startPrice: 0,
        currentPrice: 0,
        velocity: 0,
        momentum: 'neutral',
      });
    }

    set({
      status: 'idle',
      startTime: null,
      elapsedTime: 0,
      positions: resetPositions,
      alerts: [],
    });
  },

  updatePrices: (updates: PriceUpdate[]) => {
    const { status, positions, alerts } = get();

    if (status !== 'racing') return;

    const now = Date.now();
    const newPositions = new Map(positions);
    const newAlerts = [...alerts];

    // Track previous leader for leader change alerts
    const sortedBefore = Array.from(positions.values())
      .sort((a, b) => b.position - a.position);
    const previousLeader = sortedBefore[0]?.symbol;

    for (const update of updates) {
      const pos = newPositions.get(update.mint);
      if (!pos) continue;

      // Calculate velocity over 5-minute window
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const historicalEntry = pos.history.find(h => h.timestamp >= fiveMinutesAgo) || pos.history[0];
      const basePosition = historicalEntry?.position ?? 0;
      const velocity = update.percentChange - basePosition;

      // Determine momentum based on velocity
      let momentum: MomentumSignal = 'neutral';
      if (velocity > 0.1) momentum = velocity > 0.5 ? 'strong_buy' : 'buy';
      else if (velocity < -0.1) momentum = velocity < -0.5 ? 'strong_sell' : 'sell';

      // Update position
      const updatedPosition: RacePosition = {
        ...pos,
        position: update.percentChange, // Rolling 60s % change (what we rank by)
        startPrice: update.startPrice,
        currentPrice: update.currentPrice,
        boost: update.boost,
        totalChange: update.totalChange, // Total change from race start
        velocity,
        momentum,
        history: [
          ...pos.history,
          { timestamp: now, position: update.percentChange },
        ],
        lastTradeTime: now,
      };

      newPositions.set(update.mint, updatedPosition);

      // Big mover alert (> 2% change in single update)
      if (Math.abs(velocity) > 2) {
        const direction = velocity > 0 ? '🚀' : '📉';
        newAlerts.unshift({
          id: `mover-${now}-${update.mint}`,
          type: 'big_mover',
          symbol: update.symbol,
          message: `${direction} ${update.symbol} ${velocity > 0 ? '+' : ''}${velocity.toFixed(2)}%`,
          timestamp: now,
        });
      }
    }

    // Check for leader change
    const sortedAfter = Array.from(newPositions.values())
      .sort((a, b) => b.position - a.position);
    const newLeader = sortedAfter[0]?.symbol;

    if (previousLeader && newLeader && previousLeader !== newLeader) {
      newAlerts.unshift({
        id: `leader-${now}`,
        type: 'leader_change',
        symbol: newLeader,
        message: `🏆 ${newLeader} takes the lead!`,
        timestamp: now,
      });
    }

    // Trim alerts
    while (newAlerts.length > MAX_ALERTS) {
      newAlerts.pop();
    }

    // Normalize positions for display
    const allPositionValues = Array.from(newPositions.values()).map((p) => p.position);
    const maxPos = Math.max(...allPositionValues, 1);
    const minPos = Math.min(...allPositionValues, -1);
    const range = Math.max(maxPos - minPos, 1);

    for (const [mint, pos] of newPositions) {
      pos.normalizedPosition = ((pos.position - minPos) / range) * 80 + 10;
    }

    set({
      positions: newPositions,
      alerts: newAlerts,
    });
  },

  updateElapsedTime: () => {
    const { status, startTime } = get();
    if (status === 'racing' && startTime) {
      set({ elapsedTime: Math.floor((Date.now() - startTime) / 1000) });
    }
  },
}));

// Initialize with default tokens
if (typeof window !== 'undefined') {
  useRaceStore.getState().initializePositions(DEFAULT_TOKENS);
}
