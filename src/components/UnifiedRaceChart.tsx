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
    return new Date(timestamp).toLocaleTimeString([], {
      minute: '2-digit',
      second: '2-digit',
    });
  };

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
        <h2 className="text-sm font-bold text-white">
          RACE TO VOLATILITY
        </h2>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-green-400">Long (pump)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-red-400">Short (dump)</span>
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-yellow-400">Biggest % wins</span>
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
                return (
                  <Line
                    key={pos.symbol}
                    type="monotone"
                    dataKey={pos.symbol}
                    stroke={pos.color}
                    strokeWidth={selectedToken === pos.mint ? 3 : 1.5}
                    strokeOpacity={
                      selectedToken === null || selectedToken === pos.mint ? 1 : 0.2
                    }
                    dot={false}
                    animationDuration={300}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-3xl mb-2">🏁</div>
              <p className="text-sm">Press Play to start the race</p>
              <p className="text-[10px] text-gray-600 mt-1">All tokens race UP - biggest % wins</p>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard - sorted by absolute %, all racing UP */}
      <div className="mt-2 flex-shrink-0">
        <div className="text-[10px] text-gray-500 mb-1">Race Leaders</div>
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
                  'flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-all border',
                  selectedToken === pos.mint
                    ? 'ring-2 ring-yellow-400'
                    : 'hover:opacity-100 opacity-90',
                  'bg-gray-800/50 border-gray-600/50'
                )}
              >
                <span className="font-bold text-yellow-400">#{index + 1}</span>
                <span
                  className="font-medium"
                  style={{ color: pos.color }}
                >
                  {pos.symbol}
                </span>
                <span className="text-yellow-400 font-bold">
                  {absValue.toFixed(2)}%
                </span>
                <span className={clsx(
                  'text-[8px] px-1 rounded',
                  isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                )}>
                  {isLong ? 'LONG' : 'SHORT'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
