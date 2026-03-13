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

type MetricType = 'hot' | 'momentum' | 'volatile' | 'trending';

interface Props {
  positions: RacePosition[];
  selectedToken: string | null;
  onSelectToken: (mint: string | null) => void;
  metric: MetricType;
}

interface MoverData {
  mint: string;
  symbol: string;
  logoURI: string;
  color: string;
  score: number;
  direction: 'long' | 'short';
  change: number;
}

interface TokenHistory {
  changes: number[];
  lastPrice: number;
  lastUpdate: number;
}

const TITLES: Record<MetricType, string> = {
  hot: 'HOT NOW',
  momentum: 'MOMENTUM',
  volatile: 'VOLATILE',
  trending: 'TRENDING',
};

const INFO_DETAILS: Record<MetricType, string> = {
  hot: 'Tokens with the biggest price movement in the last 5 minutes. Great for catching sudden pumps or dumps.',
  momentum: 'Tokens where price is accelerating over 5 minutes. Moving slow then fast = high momentum.',
  volatile: 'Tokens with the most price swings in 5 minutes. High volatility = more opportunities but more risk.',
  trending: 'Tokens moving consistently in one direction over 5 minutes. Less choppy, more predictable.',
};

const RANK_LABELS = ['1ST', '2ND', '3RD', '4TH', '5TH'];
const RANK_COLORS = [COLORS.pink, '#9CA3AF', '#D97706', COLORS.textMuted, COLORS.textMuted];
const BORDER_COLORS = [COLORS.pink, '#9CA3AF', '#D97706', COLORS.border, COLORS.border];

// Noisy tokens - low liquidity causes oracle price oscillation without real trades
const NOISY_TOKENS: Record<string, number> = {
  'babydoge': 0.3,  // 70% reduction - oracle noise without real volume
};

const getNoiseDampener = (symbol: string): number => {
  return NOISY_TOKENS[symbol.toLowerCase()] ?? 1.0;
};

export function SmartMovers({ positions, selectedToken, onSelectToken, metric }: Props) {
  const [topMovers, setTopMovers] = useState<MoverData[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());
  const maxHistoryLength = 150;

  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    positions.forEach(pos => {
      const existing = historyRef.current.get(pos.mint);
      const currentChange = pos.position;

      if (existing) {
        const newChanges = [...existing.changes, currentChange];
        if (newChanges.length > maxHistoryLength) {
          newChanges.shift();
        }
        historyRef.current.set(pos.mint, {
          changes: newChanges,
          lastPrice: currentChange,
          lastUpdate: now,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          lastPrice: currentChange,
          lastUpdate: now,
        });
      }
    });

    const scored = positions.map(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 2) {
        return { pos, score: 0 };
      }

      let score = 0;
      const changes = history.changes;

      switch (metric) {
        case 'hot':
          const recentChanges = changes.slice(-5);
          if (recentChanges.length >= 2) {
            score = Math.abs(recentChanges[recentChanges.length - 1] - recentChanges[0]);
          }
          break;

        case 'momentum':
          if (changes.length >= 6) {
            const mid = Math.floor(changes.length / 2);
            const firstHalf = changes.slice(0, mid);
            const secondHalf = changes.slice(mid);
            const firstVelocity = (firstHalf[firstHalf.length - 1] - firstHalf[0]) / firstHalf.length;
            const secondVelocity = (secondHalf[secondHalf.length - 1] - secondHalf[0]) / secondHalf.length;
            score = Math.abs(secondVelocity) - Math.abs(firstVelocity);
            if (secondVelocity * firstVelocity > 0 && Math.abs(secondVelocity) > Math.abs(firstVelocity)) {
              score *= 1.5;
            }
          }
          break;

        case 'volatile':
          if (changes.length >= 3) {
            const diffs: number[] = [];
            for (let i = 1; i < changes.length; i++) {
              diffs.push(changes[i] - changes[i - 1]);
            }
            const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
            const variance = diffs.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / diffs.length;
            score = Math.sqrt(variance);
          }
          break;

        case 'trending':
          if (changes.length >= 5) {
            const netMove = changes[changes.length - 1] - changes[0];
            const direction = netMove >= 0 ? 1 : -1;
            let consistentMoves = 0;
            for (let i = 1; i < changes.length; i++) {
              const moveDir = changes[i] - changes[i - 1];
              if ((moveDir >= 0 && direction >= 0) || (moveDir < 0 && direction < 0)) {
                consistentMoves++;
              }
            }
            const consistency = consistentMoves / (changes.length - 1);
            score = Math.abs(netMove) * consistency;
          }
          break;
      }

      // Apply noise dampening for known noisy tokens
      score *= getNoiseDampener(pos.symbol);

      return { pos, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const top5 = scored.slice(0, 5).map(({ pos, score }) => ({
      mint: pos.mint,
      symbol: pos.symbol,
      logoURI: pos.logoURI,
      color: pos.color,
      score,
      direction: pos.position >= 0 ? 'long' : 'short',
      change: pos.position,
    } as MoverData));

    setTopMovers(top5);
  }, [positions, metric]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setShowInfo(true)}>
        <View style={styles.titleRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.title}>{TITLES[metric]}</Text>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </View>
        <Text style={styles.timeframe}>5 min</Text>
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
            const isPositive = mover.change >= 0;
            const barHeight = Math.min((Math.abs(mover.change) / 3) * 100, 100);

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
                {/* Progress bar from bottom */}
                <View
                  style={[
                    styles.progressBar,
                    {
                      height: `${barHeight}%`,
                      backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                    }
                  ]}
                />

                {/* Content spread vertically */}
                <View style={styles.cardContent}>
                  {/* Top: Rank */}
                  <Text style={[styles.rank, { color: RANK_COLORS[index] }]}>
                    {RANK_LABELS[index]}
                  </Text>

                  {/* Middle: Logo + Symbol */}
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

                  {/* Bottom: Badge + Change */}
                  <View style={styles.cardBottom}>
                    <View style={[styles.badge, isPositive ? styles.longBadge : styles.shortBadge]}>
                      <Text style={[styles.badgeText, isPositive ? styles.longText : styles.shortText]}>
                        {isPositive ? 'LONG' : 'SHORT'}
                      </Text>
                    </View>
                    <Text style={[styles.change, isPositive ? styles.changePositive : styles.changeNegative]}>
                      {isPositive ? '+' : ''}{mover.change.toFixed(2)}%
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
            <Text style={styles.modalTitle}>{TITLES[metric]}</Text>
            <Text style={styles.modalText}>{INFO_DETAILS[metric]}</Text>
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
    color: COLORS.pink,
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
  timeframe: {
    color: COLORS.textMuted,
    fontSize: 8,
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
    shadowColor: COLORS.pink,
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
  change: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
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
    borderColor: COLORS.pink,
    padding: SPACING.lg,
    maxWidth: 300,
  },
  modalTitle: {
    color: COLORS.pink,
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
    color: COLORS.pink,
    fontSize: 10,
    fontWeight: '700',
  },
});
