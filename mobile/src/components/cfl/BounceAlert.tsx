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

interface BounceData {
  mint: string;
  symbol: string;
  logoURI: string;
  color: string;
  bounceStrength: number;
  lowPoint: number;
  currentChange: number;
  addedAt: number;
}

interface TokenHistory {
  changes: number[];
  recentLow: number;
  recentLowTime: number;
}

const WINDOW_SIZE = 60;
const BOUNCE_EXPIRE_MS = 300000;
const RANK_LABELS = ['1ST', '2ND', '3RD', '4TH', '5TH'];
const RANK_COLORS = [COLORS.orange, '#9CA3AF', '#D97706', COLORS.textMuted, COLORS.textMuted];
const BORDER_COLORS = [COLORS.orange, '#9CA3AF', '#D97706', COLORS.border, COLORS.border];

export function BounceAlert({ positions, selectedToken, onSelectToken }: Props) {
  const [bounces, setBounces] = useState<BounceData[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());
  const activeBounces = useRef<Map<string, BounceData>>(new Map());

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

        let recentLow = existing.recentLow;
        let recentLowTime = existing.recentLowTime;

        if (currentChange < recentLow) {
          recentLow = currentChange;
          recentLowTime = now;
        }

        if (now - recentLowTime > 180000) {
          recentLow = Math.min(...newChanges);
          recentLowTime = now;
        }

        historyRef.current.set(pos.mint, {
          changes: newChanges,
          recentLow,
          recentLowTime,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          recentLow: currentChange,
          recentLowTime: now,
        });
      }
    });

    positions.forEach(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 5) return;

      const currentChange = pos.position;
      const recentLow = history.recentLow;
      const changes = history.changes;

      if (recentLow >= -0.2) return;
      if (currentChange <= recentLow) return;

      const recovery = currentChange - recentLow;

      const recentChanges = changes.slice(-5);
      if (recentChanges.length < 3) return;
      const recentVelocity = recentChanges[recentChanges.length - 1] - recentChanges[0];

      if (recentVelocity <= 0) return;

      const bounceStrength = recovery * (1 + recentVelocity);
      const existingBounce = activeBounces.current.get(pos.mint);

      activeBounces.current.set(pos.mint, {
        mint: pos.mint,
        symbol: pos.symbol,
        logoURI: pos.logoURI,
        color: pos.color,
        bounceStrength,
        lowPoint: recentLow,
        currentChange,
        addedAt: existingBounce?.addedAt || now,
      });
    });

    activeBounces.current.forEach((bounce, mint) => {
      const pos = positions.find(p => p.mint === mint);
      if (pos) {
        bounce.currentChange = pos.position;
      }
    });

    activeBounces.current.forEach((bounce, mint) => {
      const pos = positions.find(p => p.mint === mint);
      const expired = now - bounce.addedAt > BOUNCE_EXPIRE_MS;
      const goneNegativeAgain = pos && pos.position < bounce.lowPoint;

      if (expired || goneNegativeAgain) {
        activeBounces.current.delete(mint);
      }
    });

    const sortedBounces = Array.from(activeBounces.current.values())
      .sort((a, b) => b.bounceStrength - a.bounceStrength)
      .slice(0, 5);

    const top5Mints = new Set(sortedBounces.map(b => b.mint));
    activeBounces.current.forEach((_, mint) => {
      if (!top5Mints.has(mint)) {
        activeBounces.current.delete(mint);
      }
    });

    setBounces(sortedBounces);
  }, [positions]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setShowInfo(true)}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>↩</Text>
          <Text style={styles.title}>BOUNCE ALERT</Text>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </View>
        <Text style={styles.timeframe}>5 min</Text>
      </TouchableOpacity>

      {bounces.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>NO BOUNCES</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {bounces.map((token, index) => {
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
                    <View style={styles.longBadge}>
                      <Text style={styles.longText}>LONG</Text>
                    </View>
                    <Text style={styles.lowText}>
                      LOW {token.lowPoint.toFixed(1)}%
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
            <Text style={styles.modalTitle}>BOUNCE ALERT</Text>
            <Text style={styles.modalText}>
              Tokens that dipped negative and are now recovering. Shows the low point hit and current position. Strong bounces often continue into the race.
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
    color: COLORS.orange,
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
    shadowColor: COLORS.orange,
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
  longBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  longText: {
    color: COLORS.green,
    fontSize: 7,
    fontWeight: '700',
  },
  lowText: {
    color: COLORS.red,
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
    borderColor: COLORS.orange,
    padding: SPACING.lg,
    maxWidth: 300,
  },
  modalTitle: {
    color: COLORS.orange,
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
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: '700',
  },
});
