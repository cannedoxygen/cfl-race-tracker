import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
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

export function TopMovers({ positions, selectedToken, onSelectToken, intervalMinutes, topCount }: Props) {
  const [topMovers, setTopMovers] = useState<MoverData[]>([]);
  const [timeRemaining, setTimeRemaining] = useState('60:00');
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

  if (topMovers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.title}>{title} TOP MOVERS</Text>
          </View>
          <Text style={styles.timer}>{timeRemaining}</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>TRACKING...</Text>
        </View>
      </View>
    );
  }

  // Podium style for top 3
  if (topCount === 3) {
    const rankColors = [COLORS.gold, '#C0C0C0', '#CD7F32'];
    const rankLabels = ['1ST', '2ND', '3RD'];

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.title}>{title} TOP MOVERS</Text>
          </View>
          <Text style={styles.timer}>{timeRemaining}</Text>
        </View>

        <View style={styles.podium}>
          {topMovers.map((mover, index) => {
            const isSelected = selectedToken === mover.mint;
            const isPositive = mover.currentChange >= 0;

            return (
              <TouchableOpacity
                key={mover.mint}
                style={[
                  styles.podiumCard,
                  { borderColor: rankColors[index] },
                  isSelected && styles.podiumCardSelected,
                ]}
                onPress={() => onSelectToken(isSelected ? null : mover.mint)}
              >
                <Text style={[styles.podiumRank, { color: rankColors[index] }]}>
                  {rankLabels[index]}
                </Text>

                <View style={[styles.podiumLogo, { borderColor: mover.color }]}>
                  {typeof mover.logoURI === 'string' && mover.logoURI.length > 0 ? (
                    <Image source={{ uri: mover.logoURI }} style={styles.podiumLogoImg} />
                  ) : (
                    <Text style={[styles.logoFallback, { color: mover.color }]}>
                      {mover.symbol.slice(0, 2)}
                    </Text>
                  )}
                </View>

                <Text style={styles.podiumSymbol} numberOfLines={1}>{mover.symbol}</Text>

                <View style={[styles.directionBadge, isPositive ? styles.longBadge : styles.shortBadge]}>
                  <Text style={[styles.directionText, isPositive ? styles.longText : styles.shortText]}>
                    {isPositive ? 'LONG' : 'SHORT'}
                  </Text>
                </View>

                <Text style={[styles.podiumChange, isPositive ? styles.changePositive : styles.changeNegative]}>
                  {isPositive ? '+' : ''}{mover.currentChange.toFixed(2)}%
                </Text>
                <Text style={styles.podiumPeak}>
                  ⬆{mover.peakChange.toFixed(2)}%
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Empty slots */}
          {[...Array(3 - topMovers.length)].map((_, i) => (
            <View key={`empty-${i}`} style={styles.podiumCardEmpty}>
              <Text style={styles.emptyText}>—</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // List style for top 5
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.title}>{title} TOP MOVERS</Text>
        </View>
        <Text style={styles.timer}>{timeRemaining}</Text>
      </View>

      <View style={styles.list}>
        {topMovers.map((mover, index) => {
          const isSelected = selectedToken === mover.mint;
          const isPositive = mover.currentChange >= 0;

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

              <Text style={styles.peakText}>
                {mover.peakChange.toFixed(2)}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  timer: {
    color: COLORS.pink,
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
  podium: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flex: 1,
  },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    backgroundColor: 'rgba(13,17,23,0.5)',
  },
  podiumCardSelected: {
    borderColor: COLORS.text,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  podiumCardEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'rgba(48,54,61,0.3)',
    backgroundColor: 'rgba(13,17,23,0.3)',
  },
  podiumRank: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  podiumLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  podiumLogoImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  podiumSymbol: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    maxWidth: '100%',
  },
  podiumChange: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  podiumPeak: {
    color: COLORS.gold,
    fontSize: 8,
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
  changePositive: {
    color: COLORS.green,
  },
  changeNegative: {
    color: COLORS.red,
  },
  peakText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
});
