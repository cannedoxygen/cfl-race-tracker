import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  DimensionValue,
} from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { RacePosition, MomentumSignal } from '../../types';

interface Props {
  token: RacePosition;
  onClose: () => void;
}

type Timeframe = '1m' | '5m' | '10m';

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

function filterHistoryByTimeframe(
  history: Array<{ timestamp: number; position: number }>,
  timeframe: Timeframe
): Array<{ timestamp: number; position: number }> {
  const now = Date.now();
  const minutes = timeframe === '1m' ? 1 : timeframe === '5m' ? 5 : 10;
  const cutoff = now - minutes * 60 * 1000;
  return history.filter(h => h.timestamp >= cutoff);
}

function getChangeForTimeframe(
  history: Array<{ timestamp: number; position: number }>,
  timeframe: Timeframe
): number {
  const filtered = filterHistoryByTimeframe(history, timeframe);
  if (filtered.length < 2) return 0;
  return filtered[filtered.length - 1].position - filtered[0].position;
}

function TimeframeChart({
  history,
  timeframe,
  isLarge,
}: {
  history: Array<{ timestamp: number; position: number }>;
  timeframe: Timeframe;
  isLarge: boolean;
}) {
  const filtered = filterHistoryByTimeframe(history, timeframe);

  if (filtered.length < 2) {
    return (
      <View style={{ height: isLarge ? 60 : 30, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: COLORS.textMuted, fontSize: 8 }}>NO DATA</Text>
      </View>
    );
  }

  const values = filtered.map(h => h.position);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.01;

  const width = isLarge ? 260 : 70;
  const height = isLarge ? 60 : 30;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const change = values[values.length - 1] - values[0];
  const color = change >= 0 ? COLORS.green : COLORS.red;

  // Zero line position
  const showZeroLine = min < 0 && max > 0;
  const zeroY = height - ((0 - min) / range) * height;

  // Last point position
  const lastY = height - ((values[values.length - 1] - min) / range) * height;

  return (
    <Svg width={width} height={height}>
      {showZeroLine && (
        <Line
          x1={0} y1={zeroY} x2={width} y2={zeroY}
          stroke="#4B5563" strokeWidth={0.5} strokeDasharray="2,2"
        />
      )}
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={isLarge ? 2 : 1.5}
        strokeLinejoin="round"
      />
      <Circle
        cx={width}
        cy={lastY}
        r={isLarge ? 3 : 2}
        fill={color}
      />
    </Svg>
  );
}

export function TokenStatsCard({ token, onClose }: Props) {
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('5m');
  const momentum = getMomentumLabel(token.momentum);
  const buyPct = token.buyCount + token.sellCount > 0
    ? ((token.buyRatio) * 100).toFixed(0)
    : '50';
  const sellPct = (100 - Number(buyPct)).toFixed(0);
  const isPositive = token.position >= 0;

  const timeframes: Timeframe[] = ['1m', '5m', '10m'];
  const change1m = getChangeForTimeframe(token.history, '1m');
  const change5m = getChangeForTimeframe(token.history, '5m');
  const change10m = getChangeForTimeframe(token.history, '10m');

  const activeChange = activeTimeframe === '1m' ? change1m : activeTimeframe === '5m' ? change5m : change10m;

  return (
    <Modal visible={true} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
            {token.currentPrice != null && (
              <View style={styles.priceSection}>
                <Text style={styles.priceLabel}>PRICE</Text>
                <Text style={styles.priceValue}>
                  ${token.currentPrice < 0.01 ? token.currentPrice.toFixed(8) : token.currentPrice.toFixed(4)}
                </Text>
              </View>
            )}

            {/* Timeframe Chart with Selector */}
            <View style={styles.timeframeSection}>
              <View style={styles.timeframeHeader}>
                <Text style={styles.timeframeLabel}>TIMEFRAME CHART</Text>
                <View style={styles.timeframeTabs}>
                  {timeframes.map(tf => (
                    <TouchableOpacity
                      key={tf}
                      style={[
                        styles.timeframeTab,
                        activeTimeframe === tf && styles.timeframeTabActive,
                      ]}
                      onPress={() => setActiveTimeframe(tf)}
                    >
                      <Text style={[
                        styles.timeframeTabText,
                        activeTimeframe === tf && styles.timeframeTabTextActive,
                      ]}>
                        {tf.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Large chart */}
              <View style={styles.largeChartContainer}>
                <TimeframeChart
                  history={token.history}
                  timeframe={activeTimeframe}
                  isLarge={true}
                />
              </View>

              {/* Change value for active timeframe */}
              <View style={styles.activeChangeContainer}>
                <Text style={[
                  styles.activeChangeValue,
                  { color: activeChange >= 0 ? COLORS.green : COLORS.red },
                ]}>
                  {activeChange >= 0 ? '+' : ''}{activeChange.toFixed(3)}%
                </Text>
              </View>
            </View>

            {/* 3 Mini Timeframe Charts */}
            <View style={styles.miniChartsRow}>
              {([
                { tf: '1m' as Timeframe, change: change1m, label: '1 MIN' },
                { tf: '5m' as Timeframe, change: change5m, label: '5 MIN' },
                { tf: '10m' as Timeframe, change: change10m, label: '10 MIN' },
              ]).map(({ tf, change, label }) => (
                <TouchableOpacity
                  key={tf}
                  style={[
                    styles.miniChartBox,
                    activeTimeframe === tf && styles.miniChartBoxActive,
                  ]}
                  onPress={() => setActiveTimeframe(tf)}
                >
                  <Text style={styles.miniChartLabel}>{label}</Text>
                  <View style={styles.miniChartSvg}>
                    <TimeframeChart
                      history={token.history}
                      timeframe={tf}
                      isLarge={false}
                    />
                  </View>
                  <Text style={[
                    styles.miniChartChange,
                    { color: change >= 0 ? COLORS.green : COLORS.red },
                  ]}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>ROLLING 60s</Text>
                <Text style={[styles.statValue, { color: isPositive ? COLORS.green : COLORS.red }]}>
                  {isPositive ? '+' : ''}{token.position.toFixed(3)}%
                </Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>VOLATILITY 5m</Text>
                <Text style={[styles.statValue, { color: COLORS.orange }]}>
                  {token.volatility5m.toFixed(3)}%
                </Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>VELOCITY 5m</Text>
                <Text style={[styles.statValue, { color: token.velocity >= 0 ? COLORS.green : COLORS.red }]}>
                  {token.velocity >= 0 ? '+' : ''}{token.velocity.toFixed(3)}%
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
                <Text style={styles.bottomLabel}>VOLUME SPIKE</Text>
                <Text style={[styles.bottomValue, { color: token.volumeSpike ? COLORS.orange : COLORS.textMuted }]}>
                  {token.volumeSpike ? 'YES' : 'NO'}
                </Text>
              </View>
              <View style={styles.bottomRight}>
                <Text style={styles.bottomLabel}>RECENT VOL</Text>
                <Text style={[styles.bottomValue, { color: COLORS.teal }]}>
                  {token.recentVolume || 0}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
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
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
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
    maxWidth: 360,
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

  // Timeframe chart section
  timeframeSection: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  timeframeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  timeframeLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '600',
  },
  timeframeTabs: {
    flexDirection: 'row',
    gap: 4,
  },
  timeframeTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  timeframeTabActive: {
    backgroundColor: COLORS.purple,
  },
  timeframeTabText: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },
  timeframeTabTextActive: {
    color: COLORS.text,
  },
  largeChartContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  activeChangeContainer: {
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  activeChangeValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Mini charts row
  miniChartsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  miniChartBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xs,
    alignItems: 'center',
  },
  miniChartBoxActive: {
    borderColor: COLORS.purple,
  },
  miniChartLabel: {
    color: COLORS.textMuted,
    fontSize: 7,
    fontWeight: '600',
    marginBottom: 4,
  },
  miniChartSvg: {
    marginVertical: 4,
  },
  miniChartChange: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statBox: {
    width: '47%',
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

  // Buy/Sell pressure
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

  // Bottom info
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
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
