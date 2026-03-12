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
}

interface ReversalData {
  mint: string;
  symbol: string;
  logoURI: string;
  color: string;
  reversalStrength: number;
  peakPoint: number;
  currentChange: number;
  addedAt: number;
}

interface TokenHistory {
  changes: number[];
  recentHigh: number;
  recentHighTime: number;
}

const WINDOW_SIZE = 60;
const REVERSAL_EXPIRE_MS = 300000;
const RANK_LABELS = ['1ST', '2ND', '3RD', '4TH', '5TH'];
const RANK_COLORS = [COLORS.red, '#9CA3AF', '#D97706', COLORS.textMuted, COLORS.textMuted];
const BORDER_COLORS = [COLORS.red, '#9CA3AF', '#D97706', COLORS.border, COLORS.border];

export function ReversalRisk({ positions, selectedToken, onSelectToken }: Props) {
  const [reversals, setReversals] = useState<ReversalData[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());
  const activeReversals = useRef<Map<string, ReversalData>>(new Map());

  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    positions.forEach(pos => {
      const existing = historyRef.current.get(pos.mint);
      const currentChange = pos.position;

      if (existing) {
        const newChanges = [...existing.changes, currentChange];
        while (newChanges.length > WINDOW_SIZE) {
          newChanges.shift();
        }

        let recentHigh = existing.recentHigh;
        let recentHighTime = existing.recentHighTime;

        if (currentChange > recentHigh) {
          recentHigh = currentChange;
          recentHighTime = now;
        }

        if (now - recentHighTime > 180000) {
          recentHigh = Math.max(...newChanges);
          recentHighTime = now;
        }

        historyRef.current.set(pos.mint, {
          changes: newChanges,
          recentHigh,
          recentHighTime,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          recentHigh: currentChange,
          recentHighTime: now,
        });
      }
    });

    positions.forEach(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 5) return;

      const currentChange = pos.position;
      const recentHigh = history.recentHigh;
      const changes = history.changes;

      if (recentHigh <= 0.3) return;
      if (currentChange >= recentHigh) return;

      const pullback = recentHigh - currentChange;
      if (pullback < 0.1) return;

      const recentChanges = changes.slice(-5);
      if (recentChanges.length < 3) return;
      const recentVelocity = recentChanges[recentChanges.length - 1] - recentChanges[0];

      if (recentVelocity > 0.05) return;

      const distanceFromPeak = (recentHigh - currentChange) / recentHigh;
      const reversalStrength = pullback * (1 + distanceFromPeak) * (1 - recentVelocity);
      const existingReversal = activeReversals.current.get(pos.mint);

      activeReversals.current.set(pos.mint, {
        mint: pos.mint,
        symbol: pos.symbol,
        logoURI: pos.logoURI,
        color: pos.color,
        reversalStrength,
        peakPoint: recentHigh,
        currentChange,
        addedAt: existingReversal?.addedAt || now,
      });
    });

    activeReversals.current.forEach((reversal, mint) => {
      const pos = positions.find(p => p.mint === mint);
      if (pos) {
        reversal.currentChange = pos.position;
      }
    });

    activeReversals.current.forEach((reversal, mint) => {
      const pos = positions.find(p => p.mint === mint);
      const expired = now - reversal.addedAt > REVERSAL_EXPIRE_MS;
      const pumpedBack = pos && pos.position >= reversal.peakPoint;

      if (expired || pumpedBack) {
        activeReversals.current.delete(mint);
      }
    });

    const sortedReversals = Array.from(activeReversals.current.values())
      .sort((a, b) => b.reversalStrength - a.reversalStrength)
      .slice(0, 5);

    const top5Mints = new Set(sortedReversals.map(r => r.mint));
    activeReversals.current.forEach((_, mint) => {
      if (!top5Mints.has(mint)) {
        activeReversals.current.delete(mint);
      }
    });

    setReversals(sortedReversals);
  }, [positions]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setShowInfo(true)}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>⚠</Text>
          <Text style={styles.title}>REVERSAL RISK</Text>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </View>
        <Text style={styles.timeframe}>5 min</Text>
      </TouchableOpacity>

      {reversals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>NO REVERSALS</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {reversals.map((token, index) => {
            const isSelected = selectedToken === token.mint;
            const isPositive = token.currentChange >= 0;
            const barHeight = Math.min((Math.abs(token.currentChange) / 3) * 100, 100);

            return (
              <TouchableOpacity
                key={token.mint}
                style={[
                  styles.card,
                  { borderColor: BORDER_COLORS[index] },
                  isSelected && styles.cardSelected,
                ]}
                onPress={() => onSelectToken(isSelected ? null : token.mint)}
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
                    <View style={[styles.logoContainer, { borderColor: token.color }]}>
                      {typeof token.logoURI === 'string' && token.logoURI.length > 0 ? (
                        <Image source={{ uri: token.logoURI }} style={styles.logo} />
                      ) : (
                        <Text style={[styles.logoFallback, { color: token.color }]}>
                          {token.symbol.slice(0, 2)}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.symbol} numberOfLines={1}>{token.symbol}</Text>
                  </View>

                  <View style={styles.cardBottom}>
                    <View style={styles.shortBadge}>
                      <Text style={styles.shortText}>SHORT</Text>
                    </View>
                    <Text style={styles.peakText}>
                      PEAK {token.peakPoint.toFixed(1)}%
                    </Text>
                    <Text style={[styles.change, isPositive ? styles.changePositive : styles.changeNegative]}>
                      {isPositive ? '+' : ''}{token.currentChange.toFixed(2)}%
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
            <Text style={styles.modalTitle}>REVERSAL RISK</Text>
            <Text style={styles.modalText}>
              Tokens that pumped high and are now pulling back. Shows peak hit and current position. Good SHORT candidates for the next race.
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
  icon: {
    color: COLORS.red,
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
    shadowColor: COLORS.red,
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
  shortBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  shortText: {
    color: COLORS.red,
    fontSize: 7,
    fontWeight: '700',
  },
  peakText: {
    color: COLORS.green,
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
    borderColor: COLORS.red,
    padding: SPACING.lg,
    maxWidth: 300,
  },
  modalTitle: {
    color: COLORS.red,
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
    color: COLORS.red,
    fontSize: 10,
    fontWeight: '700',
  },
});
