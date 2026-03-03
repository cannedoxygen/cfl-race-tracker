import { create } from 'zustand';
import { RaceStatus, RacePosition, Token, MatchMode, MomentumSignal, TrackType } from '../types';

// Token colors for chart display
const TOKEN_COLORS = [
  '#3fb950', '#58a6ff', '#a855f7', '#f97316', '#fbbf24',
  '#f85149', '#ec4899', '#22d3ee', '#84cc16', '#fb923c',
  '#e879f9', '#38bdf8', '#facc15', '#4ade80', '#f472b6',
];

export function getTokenColor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TOKEN_COLORS[Math.abs(hash) % TOKEN_COLORS.length];
}

interface PriceUpdate {
  mint: string;
  symbol: string;
  boost: number;
  startPrice: number;
  currentPrice: number;
  percentChange: number;
  totalChange?: number;
}

interface Alert {
  id: string;
  type: 'big_mover' | 'momentum_shift' | 'leader_change';
  symbol: string;
  message: string;
  timestamp: number;
}

interface RaceStore {
  status: RaceStatus;
  startTime: number | null;
  elapsedTime: number;
  matchMode: MatchMode;
  selectedTrack: TrackType | 'all';
  positions: Map<string, RacePosition>;
  alerts: Alert[];

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
        logoURI: token.logoURI || undefined,
        color: getTokenColor(token.symbol),
        position: 0,
        normalizedPosition: 50,
        totalBuys: 0,
        totalSells: 0,
        tradeCount: 0,
        history: [],
        startPrice: 0,
        currentPrice: 0,
        boost: token.boost,
        buyCount: 0,
        sellCount: 0,
        buyRatio: 0.5,
        velocity: 0,
        volatility5m: 0,
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
        volatility5m: 0,
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
        volatility5m: 0,
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

    const sortedBefore = Array.from(positions.values())
      .sort((a, b) => b.position - a.position);
    const previousLeader = sortedBefore[0]?.symbol;

    for (const update of updates) {
      const pos = newPositions.get(update.mint);
      if (!pos) continue;

      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const historicalEntry = pos.history.find(h => h.timestamp >= fiveMinutesAgo) || pos.history[0];
      const basePosition = historicalEntry?.position ?? 0;
      const velocity = update.percentChange - basePosition;

      const recentHistory = pos.history.filter(h => h.timestamp >= fiveMinutesAgo);
      let volatility5m = 0;
      for (let i = 1; i < recentHistory.length; i++) {
        volatility5m += Math.abs(recentHistory[i].position - recentHistory[i - 1].position);
      }
      if (recentHistory.length > 0) {
        volatility5m += Math.abs(update.percentChange - recentHistory[recentHistory.length - 1].position);
      }

      let momentum: MomentumSignal = 'neutral';
      if (velocity > 0.1) momentum = velocity > 0.5 ? 'strong_buy' : 'buy';
      else if (velocity < -0.1) momentum = velocity < -0.5 ? 'strong_sell' : 'sell';

      let upMoves = 0;
      let downMoves = 0;
      for (let i = 1; i < recentHistory.length; i++) {
        const diff = recentHistory[i].position - recentHistory[i - 1].position;
        if (diff > 0.001) upMoves++;
        else if (diff < -0.001) downMoves++;
      }
      if (recentHistory.length > 0) {
        const lastDiff = update.percentChange - recentHistory[recentHistory.length - 1].position;
        if (lastDiff > 0.001) upMoves++;
        else if (lastDiff < -0.001) downMoves++;
      }

      const totalMoves = upMoves + downMoves;
      const derivedBuyRatio = totalMoves > 0 ? upMoves / totalMoves : 0.5;

      const tenMinutesAgo = now - 10 * 60 * 1000;
      const trimmedHistory = pos.history.filter(h => h.timestamp >= tenMinutesAgo);

      const updatedPosition: RacePosition = {
        ...pos,
        position: update.percentChange,
        startPrice: update.startPrice,
        currentPrice: update.currentPrice,
        boost: update.boost,
        totalChange: update.totalChange,
        velocity,
        volatility5m,
        momentum,
        buyCount: upMoves,
        sellCount: downMoves,
        buyRatio: derivedBuyRatio,
        history: [
          ...trimmedHistory,
          { timestamp: now, position: update.percentChange },
        ],
        lastTradeTime: now,
      };

      newPositions.set(update.mint, updatedPosition);

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

    while (newAlerts.length > MAX_ALERTS) {
      newAlerts.pop();
    }

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
