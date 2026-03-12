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
  accumulatedVolatility: number;
  peakChange: number;
  currentChange: number;
  direction: 'long' | 'short';
}

const RANK_LABELS = ['1ST', '2ND', '3RD', '4TH', '5TH'];
const RANK_COLORS = [COLORS.gold, '#9CA3AF', '#D97706', COLORS.textMuted, COLORS.textMuted];
const BORDER_COLORS = [COLORS.gold, '#9CA3AF', '#D97706', COLORS.border, COLORS.border];

export function TopMovers({ positions, selectedToken, onSelectToken, intervalMinutes, topCount }: Props) {
  const [topMovers, setTopMovers] = useState<MoverData[]>([]);
  const [timeRemaining, setTimeRemaining] = useState('60:00');
  const [showInfo, setShowInfo] = useState(false);
  const volatilityAccumulator = useRef<Map<string, { volatility: number; peakChange: number; lastUpdate: number }>>(new Map());
  const intervalStartTime = useRef<number>(Date.now());
  const intervalMs = intervalMinutes * 60 * 1000;

  // Reset tracking at each interval
  useEffect(() => {
    const checkReset = () => {
      const now = Date.now();
      const elapsed = now - intervalStartTime.current >= intervalMs;

      if (elapsed) {
        volatilityAccumulator.current.clear();
        intervalStartTime.current = now;
      }
    };

    const interval = setInterval(checkReset, 10000);
    return () => clearInterval(interval);
  }, [intervalMs]);

  // Accumulate volatility data
  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    positions.forEach(pos => {
      const existing = volatilityAccumulator.current.get(pos.mint);
      const absChange = Math.abs(pos.position);

      if (existing) {
        volatilityAccumulator.current.set(pos.mint, {
          volatility: existing.volatility + absChange * 0.1,
          peakChange: Math.max(existing.peakChange, absChange),
          lastUpdate: now,
        });
      } else {
        volatilityAccumulator.current.set(pos.mint, {
          volatility: absChange,
          peakChange: absChange,
          lastUpdate: now,
        });
      }
    });

    const sortedMovers: { mint: string; volatility: number }[] = [];
    volatilityAccumulator.current.forEach((data, mint) => {
      sortedMovers.push({ mint, volatility: data.volatility });
    });
    sortedMovers.sort((a, b) => b.volatility - a.volatility);

    const topN = sortedMovers.slice(0, topCount).map(({ mint }) => {
      const pos = positions.find(p => p.mint === mint);
      const accData = volatilityAccumulator.current.get(mint);

      if (pos && accData) {
        return {
          mint: pos.mint,
          symbol: pos.symbol,
          logoURI: pos.logoURI,
          color: pos.color,
          accumulatedVolatility: accData.volatility,
          peakChange: accData.peakChange,
          currentChange: pos.position,
          direction: pos.position >= 0 ? 'long' : 'short',
        } as MoverData;
      }
      return null;
    }).filter((m): m is MoverData => m !== null);

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
                      PEAK {mover.peakChange.toFixed(1)}%
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
              Tokens with the most cumulative price movement over the hour. High volatility = more trading opportunities. Peak shows the highest % move seen.
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
