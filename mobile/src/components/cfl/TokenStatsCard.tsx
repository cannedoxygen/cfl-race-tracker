import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  DimensionValue,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { RacePosition, MomentumSignal } from '../../types';

interface Props {
  token: RacePosition;
  onClose: () => void;
}

function getMomentumLabel(m: MomentumSignal): { text: string; color: string } {
  switch (m) {
    case 'strong_buy': return { text: 'STRONG BUY', color: COLORS.green };
    case 'buy': return { text: 'BUY', color: COLORS.green };
    case 'neutral': return { text: 'NEUTRAL', color: COLORS.textMuted };
    case 'sell': return { text: 'SELL', color: COLORS.red };
    case 'strong_sell': return { text: 'STRONG SELL', color: COLORS.red };
    default: return { text: 'NEUTRAL', color: COLORS.textMuted };
  }
}

function MiniSparkline({ history }: { history: Array<{ timestamp: number; position: number }> }) {
  if (!history || history.length < 2) return null;

  const values = history.map(h => h.position);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 160;
  const height = 40;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const lastVal = values[values.length - 1];
  const color = lastVal >= 0 ? COLORS.green : COLORS.red;

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TokenStatsCard({ token, onClose }: Props) {
  const momentum = getMomentumLabel(token.momentum);
  const buyPct = token.buyCount + token.sellCount > 0
    ? ((token.buyRatio) * 100).toFixed(0)
    : '50';
  const sellPct = (100 - Number(buyPct)).toFixed(0);
  const isPositive = token.position >= 0;

  return (
    <Modal visible={true} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.logoContainer, { backgroundColor: `${token.color}20` }]}>
                {typeof token.logoURI === 'string' && token.logoURI.length > 0 ? (
                  <Image source={{ uri: token.logoURI }} style={styles.logo} />
                ) : (
                  <Text style={[styles.logoFallback, { color: token.color }]}>
                    {token.symbol.slice(0, 2)}
                  </Text>
                )}
              </View>
              <View>
                <Text style={styles.symbol}>{token.symbol}</Text>
                <Text style={styles.name}>{token.name}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          {/* Price */}
          {token.currentPrice && (
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>PRICE</Text>
              <Text style={styles.priceValue}>
                ${token.currentPrice < 0.01 ? token.currentPrice.toFixed(8) : token.currentPrice.toFixed(4)}
              </Text>
            </View>
          )}

          {/* Sparkline */}
          <View style={styles.sparklineContainer}>
            <MiniSparkline history={token.history} />
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>60s CHANGE</Text>
              <Text style={[styles.statValue, isPositive ? styles.positive : styles.negative]}>
                {isPositive ? '+' : ''}{token.position.toFixed(3)}%
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>5m VELOCITY</Text>
              <Text style={[styles.statValue, token.velocity >= 0 ? styles.positive : styles.negative]}>
                {token.velocity >= 0 ? '+' : ''}{token.velocity.toFixed(3)}%
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>VOLATILITY 5m</Text>
              <Text style={[styles.statValue, { color: COLORS.orange }]}>
                {token.volatility5m.toFixed(3)}%
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>MOMENTUM</Text>
              <Text style={[styles.statValue, { color: momentum.color }]}>
                {momentum.text}
              </Text>
            </View>
          </View>

          {/* Buy/Sell Pressure */}
          <View style={styles.pressureSection}>
            <Text style={styles.pressureLabel}>BUY / SELL PRESSURE</Text>
            <View style={styles.pressureBar}>
              <Text style={styles.pressureBuyPct}>{buyPct}%</Text>
              <View style={styles.pressureTrack}>
                <View style={[styles.pressureFill, { width: `${buyPct}%` as DimensionValue }]} />
              </View>
              <Text style={styles.pressureSellPct}>{sellPct}%</Text>
            </View>
            <View style={styles.pressureCounts}>
              <Text style={styles.pressureCount}>{token.buyCount} buys</Text>
              <Text style={styles.pressureCount}>{token.sellCount} sells</Text>
            </View>
          </View>

          {/* Bottom Info */}
          <View style={styles.bottomInfo}>
            <View>
              <Text style={styles.bottomLabel}>BOOST</Text>
              <Text style={styles.bottomValue}>{token.boost || '—'}</Text>
            </View>
            <View style={styles.bottomRight}>
              <Text style={styles.bottomLabel}>VOLUME SPIKE</Text>
              <Text style={[styles.bottomValue, token.volumeSpike ? styles.orange : styles.muted]}>
                {token.volumeSpike ? 'YES ⚡' : 'NO'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 340,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  logoFallback: {
    fontSize: 12,
    fontWeight: '700',
  },
  symbol: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  name: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  closeButton: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  priceLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  sparklineContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statBox: {
    width: '48%',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  positive: {
    color: COLORS.green,
  },
  negative: {
    color: COLORS.red,
  },
  pressureSection: {
    marginBottom: SPACING.md,
  },
  pressureLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  pressureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pressureBuyPct: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  pressureTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(248,81,73,0.4)',
    overflow: 'hidden',
  },
  pressureFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  pressureSellPct: {
    color: COLORS.red,
    fontSize: 10,
    fontWeight: '600',
    width: 35,
  },
  pressureCounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pressureCount: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  bottomRight: {
    alignItems: 'flex-end',
  },
  bottomLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '600',
  },
  bottomValue: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  orange: {
    color: COLORS.orange,
  },
  muted: {
    color: COLORS.textMuted,
  },
});
