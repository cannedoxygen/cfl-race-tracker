import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { RacePosition } from '../../types';

interface Props {
  positions: RacePosition[];
  selectedToken: string | null;
  onSelectToken: (mint: string | null) => void;
  intervalMinutes: number;
  topCount: number;
}

interface MoverData {
  mint: string;
  symbol: string;
  logoURI: string;
  color: string;
  score: number;
  maxMove: number;
  currentChange: number;
  direction: 'long' | 'short';
}

interface TokenHistory {
  changes: number[];
  maxMove: number;
  lastUpdate: number;
}

const RANK_LABELS = ['1ST', '2ND', '3RD', '4TH', '5TH'];
const RANK_COLORS = [COLORS.gold, '#9CA3AF', '#D97706', COLORS.textMuted, COLORS.textMuted];
const BORDER_COLORS = [COLORS.gold, '#9CA3AF', '#D97706', COLORS.border, COLORS.border];

// Decay rate: score reduces by this much per second of inactivity
const DECAY_RATE = 0.02; // 2% per second
const MAX_HISTORY = 150;

// Noisy tokens - low liquidity causes oracle price oscillation without real trades
const NOISY_TOKENS: Record<string, number> = {
  'babydoge': 0.3,  // 70% reduction - oracle noise without real volume
};

const getNoiseDampener = (symbol: string): number => {
  return NOISY_TOKENS[symbol.toLowerCase()] ?? 1.0;
};

export function TopMovers({ positions, selectedToken, onSelectToken, intervalMinutes, topCount }: Props) {
  const [topMovers, setTopMovers] = useState<MoverData[]>([]);
  const [timeRemaining, setTimeRemaining] = useState('60:00');
  const [showInfo, setShowInfo] = useState(false);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());
  const intervalStartTime = useRef<number>(Date.now());
  const intervalMs = intervalMinutes * 60 * 1000;

  // Reset tracking at each interval
  useEffect(() => {
    const checkReset = () => {
      const now = Date.now();
      const elapsed = now - intervalStartTime.current >= intervalMs;

      if (elapsed) {
        historyRef.current.clear();
        intervalStartTime.current = now;
      }
    };

    const interval = setInterval(checkReset, 10000);
    return () => clearInterval(interval);
  }, [intervalMs]);

  // Track history and calculate scores with decay
  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    // Update history for each position
    positions.forEach(pos => {
      const existing = historyRef.current.get(pos.mint);
      const currentChange = pos.position;
      const absChange = Math.abs(currentChange);

      if (existing) {
        const newChanges = [...existing.changes, currentChange];
        if (newChanges.length > MAX_HISTORY) {
          newChanges.shift();
        }

        // Apply decay to maxMove, then update with new value if higher
        const timeSinceUpdate = now - existing.lastUpdate;
        const decayFactor = Math.max(0, 1 - (DECAY_RATE * timeSinceUpdate / 1000));
        const decayedMax = existing.maxMove * decayFactor;

        historyRef.current.set(pos.mint, {
          changes: newChanges,
          maxMove: Math.max(decayedMax, absChange),
          lastUpdate: now,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          maxMove: absChange,
          lastUpdate: now,
        });
      }
    });

    // Calculate volatility score for each token
    const scored = positions.map(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 3) {
        return { pos, score: 0, maxMove: 0 };
      }

      const changes = history.changes;

      // Calculate volatility: sum of absolute differences
      let volatilityScore = 0;
      for (let i = 1; i < changes.length; i++) {
        volatilityScore += Math.abs(changes[i] - changes[i - 1]);
      }

      // Weight recent changes more heavily
      const recentChanges = changes.slice(-10);
      let recentVolatility = 0;
      for (let i = 1; i < recentChanges.length; i++) {
        recentVolatility += Math.abs(recentChanges[i] - recentChanges[i - 1]);
      }

      // Combine overall + recent (recent weighted 2x)
      let score = volatilityScore + (recentVolatility * 2);

      // Apply time decay to score
      const timeSinceUpdate = now - history.lastUpdate;
      const decayFactor = Math.max(0, 1 - (DECAY_RATE * timeSinceUpdate / 1000));
      score *= decayFactor;

      // Apply noise dampening for known noisy tokens
      score *= getNoiseDampener(pos.symbol);

      return { pos, score, maxMove: history.maxMove };
    });

    // Sort by score and take top N
    scored.sort((a, b) => b.score - a.score);

    const topN = scored.slice(0, topCount).map(({ pos, score, maxMove }) => ({
      mint: pos.mint,
      symbol: pos.symbol,
      logoURI: pos.logoURI,
      color: pos.color,
      score,
      maxMove,
      currentChange: pos.position,
      direction: pos.position >= 0 ? 'long' : 'short',
    } as MoverData));

    setTopMovers(topN);
  }, [positions, topCount]);

  // Update timer
  useEffect(() => {
    const getTimeRemaining = () => {
      const elapsed = Date.now() - intervalStartTime.current;
      const remaining = Math.max(0, intervalMs - elapsed);
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [intervalMs]);

  const title = intervalMinutes === 60 ? 'HOURLY' : `${intervalMinutes} MIN`;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setShowInfo(true)}>
        <View style={styles.titleRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.title}>{title} TOP MOVERS</Text>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </View>
        <Text style={styles.timer}>{timeRemaining}</Text>
      </TouchableOpacity>

      {topMovers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>TRACKING...</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {topMovers.map((mover, index) => {
            const isSelected = selectedToken === mover.mint;
            const isPositive = mover.currentChange >= 0;
            const barHeight = Math.min((Math.abs(mover.currentChange) / 3) * 100, 100);

            return (
              <TouchableOpacity
                key={mover.mint}
                style={[
                  styles.card,
                  { borderColor: BORDER_COLORS[index] },
                  isSelected && styles.cardSelected,
                ]}
                onPress={() => onSelectToken(isSelected ? null : mover.mint)}
              >
                <View
                  style={[
                    styles.progressBar,
                    {
                      height: `${barHeight}%`,
                      backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                    }
                  ]}
                />

                <View style={styles.cardContent}>
                  <Text style={[styles.rank, { color: RANK_COLORS[index] }]}>
                    {RANK_LABELS[index]}
                  </Text>

                  <View style={styles.cardMiddle}>
                    <View style={[styles.logoContainer, { borderColor: mover.color }]}>
                      {typeof mover.logoURI === 'string' && mover.logoURI.length > 0 ? (
                        <Image source={{ uri: mover.logoURI }} style={styles.logo} />
                      ) : (
                        <Text style={[styles.logoFallback, { color: mover.color }]}>
                          {mover.symbol.slice(0, 2)}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.symbol} numberOfLines={1}>{mover.symbol}</Text>
                  </View>

                  <View style={styles.cardBottom}>
                    <View style={[styles.badge, isPositive ? styles.longBadge : styles.shortBadge]}>
                      <Text style={[styles.badgeText, isPositive ? styles.longText : styles.shortText]}>
                        {isPositive ? 'LONG' : 'SHORT'}
                      </Text>
                    </View>
                    <Text style={styles.peakText}>
                      MAX {mover.maxMove.toFixed(1)}%
                    </Text>
                    <Text style={[styles.change, isPositive ? styles.changePositive : styles.changeNegative]}>
                      {isPositive ? '+' : ''}{mover.currentChange.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={showInfo} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowInfo(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{title} TOP MOVERS</Text>
            <Text style={styles.modalText}>
              Tokens with the most cumulative price movement over the hour. High volatility = more trading opportunities. MAX shows the highest % move seen.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowInfo(false)}>
              <Text style={styles.modalButtonText}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  star: {
    color: COLORS.gold,
    fontSize: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  infoIcon: {
    color: COLORS.textMuted,
    fontSize: 8,
  },
  timer: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  scrollContent: {
    gap: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  card: {
    width: 80,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    backgroundColor: 'rgba(13,17,23,0.5)',
    padding: SPACING.sm,
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: COLORS.text,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rank: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardMiddle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  logoFallback: {
    fontSize: 10,
    fontWeight: '700',
  },
  symbol: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    maxWidth: '100%',
  },
  cardBottom: {
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  longBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  shortBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  badgeText: {
    fontSize: 7,
    fontWeight: '700',
  },
  longText: {
    color: COLORS.green,
  },
  shortText: {
    color: COLORS.red,
  },
  peakText: {
    color: COLORS.gold,
    fontSize: 8,
    marginTop: 2,
  },
  change: {
    fontSize: 10,
    fontWeight: '600',
  },
  changePositive: {
    color: COLORS.green,
  },
  changeNegative: {
    color: COLORS.red,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.gold,
    padding: SPACING.lg,
    maxWidth: 300,
  },
  modalTitle: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  modalText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  modalButton: {
    alignSelf: 'flex-start',
  },
  modalButtonText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '700',
  },
});
