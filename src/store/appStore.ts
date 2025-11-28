import { create } from 'zustand';
import { ChartViewMode, VolatilityScore } from '@/types';

interface AppStore {
  // UI State
  selectedToken: string | null;
  viewMode: ChartViewMode;
  isLoading: boolean;
  error: string | null;

  // Volatility data history (timestamp -> scores)
  volatilityHistory: Map<number, VolatilityScore[]>;
  latestScores: VolatilityScore[];

  // Actions
  setSelectedToken: (mint: string | null) => void;
  setViewMode: (mode: ChartViewMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addVolatilitySnapshot: (timestamp: number, scores: VolatilityScore[]) => void;
  clearHistory: () => void;
}

const MAX_HISTORY_SIZE = 60; // ~10 minutes at 10s intervals

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  selectedToken: null,
  viewMode: 'volatility',
  isLoading: true,
  error: null,
  volatilityHistory: new Map(),
  latestScores: [],

  // Actions
  setSelectedToken: (mint) => set({ selectedToken: mint }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  addVolatilitySnapshot: (timestamp, scores) => {
    const history = new Map(get().volatilityHistory);

    // Add new snapshot
    history.set(timestamp, scores);

    // Remove old entries if exceeding max size
    const timestamps = Array.from(history.keys()).sort((a, b) => a - b);
    while (timestamps.length > MAX_HISTORY_SIZE) {
      const oldestTimestamp = timestamps.shift();
      if (oldestTimestamp) {
        history.delete(oldestTimestamp);
      }
    }

    set({
      volatilityHistory: history,
      latestScores: scores,
    });
  },

  clearHistory: () =>
    set({
      volatilityHistory: new Map(),
      latestScores: [],
    }),
}));
