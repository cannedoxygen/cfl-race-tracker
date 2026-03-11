import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
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

// Decay rate: score reduces by this much per second of inactivity
const DECAY_RATE = 0.02; // 2% per second

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

      // Apply time decay - reduce score for tokens that haven't updated recently
      const timeSinceUpdate = now - history.lastUpdate;
      const decayFactor = Math.max(0, 1 - (DECAY_RATE * timeSinceUpdate / 1000));
      score *= decayFactor;

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
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={() => setShowInfo(true)}>
        <View style={styles.titleRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.title}>{TITLES[metric]}</Text>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </View>
        <Text style={styles.timeframe}>5 min</Text>
      </TouchableOpacity>

      {/* Content */}
      {topMovers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>TRACKING...</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {topMovers.map((mover, index) => {
            const isSelected = selectedToken === mover.mint;
            const isPositive = mover.change >= 0;

            return (
              <TouchableOpacity
                key={mover.mint}
                style={[
                  styles.row,
                  index === 0 && styles.rowFirst,
                  isSelected && styles.rowSelected,
                ]}
                onPress={() => onSelectToken(isSelected ? null : mover.mint)}
              >
                <Text style={[styles.rank, index === 0 && styles.rankFirst]}>
                  {index + 1}
                </Text>

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

                <View style={[styles.directionBadge, isPositive ? styles.longBadge : styles.shortBadge]}>
                  <Text style={[styles.directionText, isPositive ? styles.longText : styles.shortText]}>
                    {isPositive ? 'L' : 'S'}
                  </Text>
                </View>

                <Text style={[styles.change, isPositive ? styles.changePositive : styles.changeNegative]}>
                  {isPositive ? '+' : ''}{mover.change.toFixed(2)}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Info Modal */}
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
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,17,23,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(48,54,61,0.5)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  rowFirst: {
    borderColor: 'rgba(251,191,36,0.5)',
  },
  rowSelected: {
    borderColor: COLORS.pink,
    borderWidth: 2,
  },
  rank: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    width: 16,
    textAlign: 'center',
  },
  rankFirst: {
    color: COLORS.gold,
  },
  logoContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 6,
  },
  logo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  logoFallback: {
    fontSize: 7,
    fontWeight: '700',
  },
  symbol: {
    flex: 1,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '500',
  },
  directionBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 6,
  },
  longBadge: {
    backgroundColor: 'rgba(63,185,80,0.3)',
  },
  shortBadge: {
    backgroundColor: 'rgba(248,81,73,0.3)',
  },
  directionText: {
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
    width: 55,
    textAlign: 'right',
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
