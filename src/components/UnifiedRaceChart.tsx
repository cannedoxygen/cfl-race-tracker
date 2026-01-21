'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { RacePosition } from '@/types';
import clsx from 'clsx';

// Custom dot component that shows token logo at the line tip
function TokenDot({ cx, cy, payload, dataKey, index, data, position }: any) {
  // Only render on the last data point
  if (!data || index !== data.length - 1) return null;
  if (!cx || !cy || isNaN(cx) || isNaN(cy)) return null;

  const size = 20;
  const halfSize = size / 2;

  return (
    <g>
      {/* Outer glow circle */}
      <circle
        cx={cx}
        cy={cy}
        r={halfSize + 2}
        fill={position?.color || '#fff'}
        fillOpacity={0.3}
      />
      {/* Main circle background */}
      <circle
        cx={cx}
        cy={cy}
        r={halfSize}
        fill="#161b22"
        stroke={position?.color || '#fff'}
        strokeWidth={2}
      />
      {/* Token logo or symbol */}
      {position?.logoURI ? (
        <image
          href={position.logoURI}
          x={cx - halfSize + 3}
          y={cy - halfSize + 3}
          width={size - 6}
          height={size - 6}
          clipPath={`circle(${(size - 6) / 2}px)`}
          style={{ borderRadius: '50%' }}
        />
      ) : (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={position?.color || '#fff'}
          fontSize={7}
          fontFamily="'Press Start 2P', cursive"
        >
          {dataKey?.slice(0, 2) || '??'}
        </text>
      )}
    </g>
  );
}

interface Props {
  chartData: Array<{ timestamp: number; [key: string]: number }>;
  positions: RacePosition[];
  selectedToken: string | null;
  onSelectToken: (mint: string | null) => void;
}

// Track which tokens are shorts (negative raw value) for coloring
const tokenDirections = new Map<string, 'long' | 'short'>();

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const time = new Date(label).toLocaleTimeString();

  // Sort by value (all positive now, highest first)
  const sorted = [...payload].sort((a: any, b: any) => b.value - a.value);

  return (
    <div className="bg-cfl-card border border-cfl-border rounded-lg p-2 shadow-xl">
      <p className="text-gray-400 text-[10px] mb-1">{time}</p>
      <div className="space-y-0.5">
        {sorted.slice(0, 8).map((entry: any) => {
          const direction = tokenDirections.get(entry.name) || 'long';
          const isLong = direction === 'long';
          return (
            <div key={entry.name} className="flex items-center gap-1.5 text-[10px]">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-white font-medium">{entry.name}</span>
              <span className="text-yellow-400 font-bold">
                {entry.value.toFixed(2)}%
              </span>
              <span className={clsx(
                'text-[8px] px-1 rounded',
                isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              )}>
                {isLong ? 'LONG' : 'SHORT'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function UnifiedRaceChart({ chartData, positions, selectedToken, onSelectToken }: Props) {
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    const minutes = date.getMinutes();
    const hours = date.getHours();
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Calculate ticks at 5-minute intervals
  const xAxisTicks = useMemo(() => {
    if (chartData.length === 0) return [];

    const firstTime = chartData[0]?.timestamp || Date.now();
    const lastTime = chartData[chartData.length - 1]?.timestamp || Date.now();

    // Round down to nearest 5 minutes
    const fiveMin = 5 * 60 * 1000;
    const startTick = Math.ceil(firstTime / fiveMin) * fiveMin;

    const ticks: number[] = [];
    for (let tick = startTick; tick <= lastTime; tick += fiveMin) {
      ticks.push(tick);
    }

    // Always include at least the first and last if no 5-min ticks
    if (ticks.length === 0 && chartData.length > 0) {
      ticks.push(firstTime);
    }

    return ticks;
  }, [chartData]);

  const formatYAxis = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Update token directions based on current positions
  useMemo(() => {
    for (const pos of positions) {
      tokenDirections.set(pos.symbol, pos.position >= 0 ? 'long' : 'short');
    }
  }, [positions]);

  // Transform chart data: convert all values to absolute (all race UP)
  const transformedChartData = useMemo(() => {
    return chartData.map(point => {
      const newPoint: { timestamp: number; [key: string]: number } = { timestamp: point.timestamp };
      for (const key of Object.keys(point)) {
        if (key === 'timestamp') continue;
        // All values become positive (absolute) so all lines race UP
        newPoint[key] = Math.abs(point[key] as number);
      }
      return newPoint;
    });
  }, [chartData]);

  // Calculate Y axis domain (all positive now)
  const yDomain = useMemo(() => {
    if (transformedChartData.length === 0) return [0, 5];

    let max = 0;

    for (const point of transformedChartData) {
      for (const key of Object.keys(point)) {
        if (key === 'timestamp') continue;
        const val = point[key] as number;
        if (val > max) max = val;
      }
    }

    const padding = max * 0.2 || 1;
    return [0, Math.ceil((max + padding) * 10) / 10];
  }, [transformedChartData]);

  // Sort by ABSOLUTE value - biggest movers win regardless of direction
  const sortedPositions = useMemo(() => {
    return [...positions].sort((a, b) => Math.abs(b.position) - Math.abs(a.position));
  }, [positions]);

  // Get top movers for display
  const topMovers = sortedPositions.slice(0, 10);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h2 className="font-pixel text-[10px] text-white flex items-center gap-2">
          <span className="text-cfl-gold">🏁</span> RACE TO VOLATILITY
        </h2>
        <div className="flex items-center gap-3 font-pixel-body text-sm">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cfl-green"></span>
            <span className="text-cfl-green">Long</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cfl-red"></span>
            <span className="text-cfl-red">Short</span>
          </span>
          <span className="text-cfl-border">|</span>
          <span className="text-cfl-gold">Biggest % wins</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {transformedChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={transformedChartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                ticks={xAxisTicks}
                stroke="#374151"
                tick={{ fill: '#6b7280', fontSize: 9 }}
                axisLine={{ stroke: '#1e1e2e' }}
                tickLine={{ stroke: '#1e1e2e' }}
              />

              <YAxis
                domain={yDomain}
                tickFormatter={formatYAxis}
                stroke="#374151"
                tick={{ fill: '#6b7280', fontSize: 9 }}
                axisLine={{ stroke: '#1e1e2e' }}
                tickLine={{ stroke: '#1e1e2e' }}
                width={50}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Token lines - top movers, all racing UP */}
              {topMovers.map((pos) => {
                const isLong = pos.position >= 0;
                const isVisible = selectedToken === null || selectedToken === pos.mint;
                return (
                  <Line
                    key={pos.symbol}
                    type="monotone"
                    dataKey={pos.symbol}
                    stroke={pos.color}
                    strokeWidth={selectedToken === pos.mint ? 3 : 1.5}
                    strokeOpacity={isVisible ? 1 : 0.2}
                    dot={(props: any) => (
                      <TokenDot
                        {...props}
                        data={transformedChartData}
                        position={pos}
                      />
                    )}
                    activeDot={false}
                    animationDuration={300}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-cfl-text-muted">
            <div className="text-center">
              <div className="text-4xl mb-3">🏁</div>
              <p className="font-pixel text-[10px]">PRESS PLAY TO START</p>
              <p className="font-pixel-body text-sm mt-2">All tokens race UP - biggest % wins</p>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard - sorted by absolute %, all racing UP */}
      <div className="mt-2 flex-shrink-0">
        <div className="font-pixel text-[8px] text-cfl-text-muted mb-2">RACE LEADERS</div>
        <div className="flex flex-wrap gap-1.5">
          {sortedPositions.slice(0, 8).map((pos, index) => {
            const isLong = pos.position >= 0;
            const absValue = Math.abs(pos.position);
            return (
              <button
                key={pos.mint}
                onClick={() =>
                  onSelectToken(selectedToken === pos.mint ? null : pos.mint)
                }
                className={clsx(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all border-2',
                  selectedToken === pos.mint
                    ? 'ring-2 ring-cfl-gold shadow-gold-glow'
                    : 'hover:border-cfl-text-muted',
                  'bg-cfl-bg/50 border-cfl-border'
                )}
              >
                <span className="font-pixel text-[7px] text-cfl-gold">#{index + 1}</span>
                <span
                  className="font-pixel-body text-sm"
                  style={{ color: pos.color }}
                >
                  {pos.symbol}
                </span>
                <span className="font-pixel text-[8px] text-cfl-gold">
                  {absValue.toFixed(2)}%
                </span>
                <span className={clsx(
                  'font-pixel text-[6px] px-1 py-0.5 rounded border',
                  isLong
                    ? 'bg-cfl-green/20 text-cfl-green border-cfl-green/30'
                    : 'bg-cfl-red/20 text-cfl-red border-cfl-red/30'
                )}>
                  {isLong ? 'L' : 'S'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
