import React from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { RacePosition } from '../../types';

interface Props {
  positions: RacePosition[];
  selectedToken?: string | null;
  onSelectToken?: (mint: string | null) => void;
}

export function Leaderboard({ positions, selectedToken, onSelectToken }: Props) {
  const renderItem = ({ item, index }: { item: RacePosition; index: number }) => {
    const isPositive = item.position >= 0;
    const isSelected = selectedToken === item.mint;
    const isTop3 = index < 3;

    return (
      <TouchableOpacity
        style={[
          styles.row,
          isTop3 && styles.rowTop3,
          index === 0 && styles.rowFirst,
          isSelected && styles.rowSelected,
        ]}
        onPress={() => onSelectToken?.(isSelected ? null : item.mint)}
        activeOpacity={0.7}
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          <Text
            style={[
              styles.rank,
              index === 0 && styles.rankFirst,
              index === 1 && styles.rankSecond,
              index === 2 && styles.rankThird,
            ]}
          >
            {index + 1}
          </Text>
        </View>

        {/* Token Logo */}
        <View style={[styles.logoContainer, { borderColor: item.color }]}>
          {typeof item.logoURI === 'string' && item.logoURI.length > 0 ? (
            <Image source={{ uri: item.logoURI }} style={styles.logo} />
          ) : (
            <Text style={[styles.logoFallback, { color: item.color }]}>
              {item.symbol.slice(0, 2)}
            </Text>
          )}
        </View>

        {/* Symbol */}
        <Text style={styles.symbol} numberOfLines={1}>
          {item.symbol}
        </Text>

        {/* Direction Badge */}
        <View style={[styles.directionBadge, isPositive ? styles.longBadge : styles.shortBadge]}>
          <Text style={[styles.directionText, isPositive ? styles.longText : styles.shortText]}>
            {isPositive ? 'L' : 'S'}
          </Text>
        </View>

        {/* Change % */}
        <Text style={[styles.change, isPositive ? styles.changePositive : styles.changeNegative]}>
          {isPositive ? '+' : ''}{item.position.toFixed(2)}%
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LEADERBOARD</Text>
        <Text style={styles.subtitle}>{positions.length} tokens</Text>
      </View>

      <FlatList
        data={positions.slice(0, 15)}
        renderItem={renderItem}
        keyExtractor={(item) => item.mint}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  title: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  rowTop3: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  rowFirst: {
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  rowSelected: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderWidth: 1,
    borderColor: COLORS.purple,
  },
  rankContainer: {
    width: 24,
    alignItems: 'center',
  },
  rank: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  rankFirst: {
    color: COLORS.gold,
    fontWeight: '700',
  },
  rankSecond: {
    color: '#C0C0C0',
  },
  rankThird: {
    color: '#CD7F32',
  },
  logoContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: SPACING.sm,
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  logoFallback: {
    fontSize: 10,
    fontWeight: '700',
  },
  symbol: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  directionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
  },
  longBadge: {
    backgroundColor: 'rgba(63,185,80,0.2)',
  },
  shortBadge: {
    backgroundColor: 'rgba(248,81,73,0.2)',
  },
  directionText: {
    fontSize: 9,
    fontWeight: '700',
  },
  longText: {
    color: COLORS.green,
  },
  shortText: {
    color: COLORS.red,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: 65,
    textAlign: 'right',
  },
  changePositive: {
    color: COLORS.green,
  },
  changeNegative: {
    color: COLORS.red,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
    opacity: 0.3,
  },
});
