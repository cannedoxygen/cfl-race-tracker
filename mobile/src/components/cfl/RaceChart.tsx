import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Circle, G, Text as SvgText, Polyline, Rect, Image as SvgImage, ClipPath, Defs } from 'react-native-svg';
import { COLORS, SPACING } from '../../constants/theme';
import { RacePosition } from '../../types';

interface Props {
  positions: RacePosition[];
  selectedToken?: string | null;
  onSelectToken?: (mint: string | null) => void;
}

// Use full width - almost edge to edge
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 8; // Nearly full width
const CHART_HEIGHT = 360;
const PADDING = { top: 25, right: 35, bottom: 35, left: 40 };

export function RaceChart({ positions, selectedToken, onSelectToken }: Props) {
  // Get top 10 tokens sorted by ABSOLUTE position (biggest movers win)
  const topTokens = useMemo(() => {
    return [...positions]
      .sort((a, b) => Math.abs(b.position) - Math.abs(a.position))
      .slice(0, 10);
  }, [positions]);

  // Track token directions (long/short) separately
  const tokenDirections = useMemo(() => {
    const dirs = new Map<string, 'long' | 'short'>();
    for (const pos of positions) {
      dirs.set(pos.symbol, pos.position >= 0 ? 'long' : 'short');
    }
    return dirs;
  }, [positions]);

  // Build time-series chart data from position histories
  // KEY: Convert ALL values to ABSOLUTE so all tokens race UP from 0
  const chartData = useMemo(() => {
    if (topTokens.length === 0) return [];

    // Collect all unique timestamps from all tokens
    const allTimestamps = new Set<number>();
    topTokens.forEach(token => {
      token.history?.forEach(h => allTimestamps.add(h.timestamp));
    });

    // Sort timestamps and sample if too many (keep last 30 points)
    let timestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    const maxPoints = 30;
    if (timestamps.length > maxPoints) {
      const step = Math.ceil(timestamps.length / maxPoints);
      timestamps = timestamps.filter((_, i) => i % step === 0 || i === timestamps.length - 1);
    }

    // Build data points for each timestamp
    const data: Array<{ timestamp: number; [key: string]: number }> = [];
    const lastValues = new Map<string, number>();

    for (const timestamp of timestamps) {
      const point: { timestamp: number; [key: string]: number } = { timestamp };

      for (const token of topTokens) {
        const history = token.history || [];
        let value = lastValues.get(token.symbol) || 0;

        for (const h of history) {
          if (h.timestamp <= timestamp) {
            value = h.position;
          }
        }

        // CRITICAL: Convert to ABSOLUTE value - all tokens race UP from 0
        point[token.symbol] = Math.abs(value);
        lastValues.set(token.symbol, value);
      }

      data.push(point);
    }

    return data;
  }, [topTokens]);

  // Calculate chart bounds - Y starts at 0, all values are positive
  const { maxY, minX, maxX, chartWidth, chartHeight } = useMemo(() => {
    const cw = CHART_WIDTH - PADDING.left - PADDING.right;
    const ch = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    if (chartData.length === 0) {
      return { maxY: 5, minX: 0, maxX: 1, chartWidth: cw, chartHeight: ch };
    }

    let maxY = 0;

    chartData.forEach(point => {
      topTokens.forEach(token => {
        const val = point[token.symbol] || 0;
        if (val > maxY) maxY = val;
      });
    });

    // Add padding to max, minimum of 1%
    maxY = Math.max(maxY * 1.2, 1);

    const minX = chartData[0]?.timestamp || 0;
    const maxX = chartData[chartData.length - 1]?.timestamp || 1;

    return { maxY, minX, maxX, chartWidth: cw, chartHeight: ch };
  }, [chartData, topTokens]);

  // Scale functions - Y starts at 0
  const scaleX = (timestamp: number) => {
    if (maxX === minX) return PADDING.left;
    return PADDING.left + ((timestamp - minX) / (maxX - minX)) * chartWidth;
  };

  const scaleY = (value: number) => {
    // Y=0 is at the bottom, higher values go up
    return PADDING.top + chartHeight - (value / maxY) * chartHeight;
  };

  // Generate polyline points for a token
  const getPolylinePoints = (symbol: string) => {
    return chartData
      .map(point => `${scaleX(point.timestamp)},${scaleY(point[symbol] || 0)}`)
      .join(' ');
  };

  // Get the latest position for each token (tip of the race line)
  const getLatestPoint = (symbol: string) => {
    if (chartData.length === 0) return { x: PADDING.left, y: scaleY(0) };
    const lastPoint = chartData[chartData.length - 1];
    return {
      x: scaleX(lastPoint.timestamp),
      y: scaleY(lastPoint[symbol] || 0),
    };
  };

  // Y-axis tick values (0 to max)
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = maxY / 4;
    for (let i = 0; i <= 4; i++) {
      ticks.push(step * i);
    }
    return ticks;
  }, [maxY]);

  // If no data, show placeholder
  if (topTokens.length === 0 || chartData.length < 2) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.flag}>🏁</Text>
            <Text style={styles.title}>RACE TO VOLATILITY</Text>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
              <Text style={styles.legendText}>Long</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.red }]} />
              <Text style={styles.legendText}>Short</Text>
            </View>
          </View>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>🏁</Text>
          <Text style={styles.placeholderText}>PRESS PLAY TO START</Text>
          <Text style={styles.placeholderSubtext}>All tokens race UP - biggest % wins</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.flag}>🏁</Text>
          <Text style={styles.title}>RACE TO VOLATILITY</Text>
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
            <Text style={styles.legendText}>Long</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.red }]} />
            <Text style={styles.legendText}>Short</Text>
          </View>
          <Text style={styles.legendDivider}>|</Text>
          <Text style={styles.legendGold}>Biggest % wins</Text>
        </View>
      </View>

      {/* Chart */}
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Background */}
        <Rect
          x={PADDING.left}
          y={PADDING.top}
          width={chartWidth}
          height={chartHeight}
          fill="rgba(0,0,0,0.3)"
          rx={4}
        />

        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = scaleY(tick);
          return (
            <G key={i}>
              <Line
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + chartWidth}
                y2={y}
                stroke={COLORS.border}
                strokeWidth={tick === 0 ? 1 : 0.5}
                strokeDasharray={tick === 0 ? undefined : '4,4'}
                opacity={tick === 0 ? 0.8 : 0.4}
              />
              <SvgText
                x={PADDING.left - 5}
                y={y + 3}
                fontSize={9}
                fill={COLORS.textMuted}
                textAnchor="end"
              >
                {tick.toFixed(1)}%
              </SvgText>
            </G>
          );
        })}

        {/* Y-axis */}
        <Line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={PADDING.top + chartHeight}
          stroke={COLORS.border}
          strokeWidth={1}
        />

        {/* X-axis (at Y=0, bottom of chart) */}
        <Line
          x1={PADDING.left}
          y1={PADDING.top + chartHeight}
          x2={PADDING.left + chartWidth}
          y2={PADDING.top + chartHeight}
          stroke={COLORS.border}
          strokeWidth={1}
        />

        {/* Token race lines - ALL racing UP from 0 */}
        {topTokens.map((token) => {
          const isSelected = selectedToken === token.mint;
          const isOtherSelected = selectedToken && !isSelected;
          const opacity = isOtherSelected ? 0.2 : 1;
          const strokeWidth = isSelected ? 3 : 2;

          return (
            <G key={token.mint}>
              {/* Glow effect for selected */}
              {isSelected && (
                <Polyline
                  points={getPolylinePoints(token.symbol)}
                  fill="none"
                  stroke={token.color}
                  strokeWidth={6}
                  opacity={0.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Main race line */}
              <Polyline
                points={getPolylinePoints(token.symbol)}
                fill="none"
                stroke={token.color}
                strokeWidth={strokeWidth}
                opacity={opacity}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </G>
          );
        })}

        {/* Clip paths for circular token logos */}
        <Defs>
          {topTokens.map((token, index) => (
            <ClipPath key={`clip-${token.mint}`} id={`clip-${index}`}>
              <Circle cx={0} cy={0} r={10} />
            </ClipPath>
          ))}
        </Defs>

        {/* Token markers at the tip (rightmost point) with images */}
        {topTokens.map((token, index) => {
          const isSelected = selectedToken === token.mint;
          const isOtherSelected = selectedToken && !isSelected;
          const { x, y } = getLatestPoint(token.symbol);
          const opacity = isOtherSelected ? 0.3 : 1;
          const isLong = tokenDirections.get(token.symbol) === 'long';
          const size = isSelected ? 24 : 20;
          const halfSize = size / 2;
          const hasLogo = typeof token.logoURI === 'string' && token.logoURI.length > 0;

          return (
            <G key={`marker-${token.mint}`} opacity={opacity}>
              {/* Outer glow */}
              <Circle
                cx={x}
                cy={y}
                r={halfSize + 4}
                fill={token.color}
                fillOpacity={0.25}
              />

              {/* Main circle background */}
              <Circle
                cx={x}
                cy={y}
                r={halfSize}
                fill="#161b22"
                stroke={token.color}
                strokeWidth={isSelected ? 3 : 2}
              />

              {/* Token logo or fallback text */}
              {hasLogo ? (
                <SvgImage
                  x={x - halfSize + 2}
                  y={y - halfSize + 2}
                  width={size - 4}
                  height={size - 4}
                  href={token.logoURI as string}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <SvgText
                  x={x}
                  y={y + 3}
                  fontSize={7}
                  fill={token.color}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {token.symbol.slice(0, 4)}
                </SvgText>
              )}

              {/* L/S indicator badge */}
              <Circle
                cx={x + halfSize - 2}
                cy={y - halfSize + 2}
                r={8}
                fill={isLong ? COLORS.green : COLORS.red}
                stroke="#161b22"
                strokeWidth={1}
              />
              <SvgText
                x={x + halfSize - 2}
                y={y - halfSize + 5}
                fontSize={7}
                fill="#fff"
                textAnchor="middle"
                fontWeight="bold"
              >
                {isLong ? 'L' : 'S'}
              </SvgText>
            </G>
          );
        })}

        {/* Time arrow label */}
        <SvgText
          x={PADDING.left + chartWidth / 2}
          y={CHART_HEIGHT - 8}
          fontSize={10}
          fill={COLORS.textMuted}
          textAnchor="middle"
        >
          Time →
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: -SPACING.md - 4, // Expand to near edges
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flag: {
    fontSize: 14,
  },
  title: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  legendDivider: {
    color: COLORS.border,
    fontSize: 10,
  },
  legendGold: {
    color: COLORS.gold,
    fontSize: 10,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderSubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 6,
    opacity: 0.7,
  },
});
