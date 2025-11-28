'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { RacePosition } from '@/types';
import clsx from 'clsx';

interface Props {
  chartData: Array<{ timestamp: number; [key: string]: number }>;
  positions: RacePosition[];
  selectedToken: string | null;
  onSelectToken: (mint: string | null) => void;
}

function CustomTooltip({ active, payload, label, isShortView }: any) {
  if (!active || !payload || !payload.length) return null;

  const time = new Date(label).toLocaleTimeString();

  // Sort by value - for short view, most negative is best
  const sorted = [...payload].sort((a: any, b: any) => {
    if (isShortView) {
      return a.value - b.value; // Most negative first for short
    }
    return b.value - a.value; // Most positive first for long
  });

  return (
    <div className="bg-cfl-card border border-cfl-border rounded-lg p-2 shadow-xl">
      <p className="text-gray-400 text-[10px] mb-1">{time}</p>
      <div className="space-y-0.5">
        {sorted.slice(0, 5).map((entry: any) => {
          const displayValue = isShortView ? -entry.value : entry.value;
          return (
            <div key={entry.name} className="flex items-center gap-1.5 text-[10px]">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-white font-medium">{entry.name}</span>
              <span className={displayValue >= 0 ? 'text-green-400' : 'text-red-400'}>
                {displayValue >= 0 ? '+' : ''}{displayValue.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SingleChart({
  chartData,
  positions,
  selectedToken,
  onSelectToken,
  isShortView,
  title,
}: {
  chartData: Array<{ timestamp: number; [key: string]: number }>;
  positions: RacePosition[];
  selectedToken: string | null;
  onSelectToken: (mint: string | null) => void;
  isShortView: boolean;
  title: string;
}) {
  const formatXAxis = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatYAxis = (value: number) => {
    // For short view, invert the display
    const displayValue = isShortView ? -value : value;
    return `${displayValue >= 0 ? '+' : ''}${displayValue.toFixed(1)}%`;
  };

  // Calculate Y axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [-5, 5];

    let min = 0;
    let max = 0;

    for (const point of chartData) {
      for (const key of Object.keys(point)) {
        if (key === 'timestamp') continue;
        const val = point[key] as number;
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }

    const padding = Math.max(Math.abs(max), Math.abs(min)) * 0.2 || 1;
    return [Math.floor((min - padding) * 10) / 10, Math.ceil((max + padding) * 10) / 10];
  }, [chartData]);

  // For short view, sort by most negative (best for shorts)
  // For long view, sort by most positive (best for longs)
  const sortedPositions = useMemo(() => {
    const sorted = [...positions];
    if (isShortView) {
      return sorted.sort((a, b) => a.position - b.position); // Most negative first
    }
    return sorted.sort((a, b) => b.position - a.position); // Most positive first
  }, [positions, isShortView]);

  // Transform data for short view (invert Y axis)
  const transformedData = useMemo(() => {
    if (!isShortView) return chartData;

    return chartData.map(point => {
      const newPoint: { timestamp: number; [key: string]: number } = { timestamp: point.timestamp };
      for (const key of Object.keys(point)) {
        if (key === 'timestamp') continue;
        newPoint[key] = -(point[key] as number); // Invert for short view
      }
      return newPoint;
    });
  }, [chartData, isShortView]);

  const transformedDomain = useMemo(() => {
    if (!isShortView) return yDomain;
    return [-yDomain[1], -yDomain[0]]; // Invert domain for short view
  }, [yDomain, isShortView]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-shrink-0">
        <h2 className={clsx(
          'text-xs font-bold',
          isShortView ? 'text-red-400' : 'text-green-400'
        )}>
          {title}
        </h2>
        <div className={clsx(
          'text-[9px] px-1.5 py-0.5 rounded font-medium',
          isShortView ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
        )}>
          {isShortView ? '📉 Dumps Win' : '📈 Pumps Win'}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={transformedData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#374151"
                tick={{ fill: '#6b7280', fontSize: 8 }}
                axisLine={{ stroke: '#1e1e2e' }}
                tickLine={{ stroke: '#1e1e2e' }}
              />

              <YAxis
                domain={transformedDomain}
                tickFormatter={formatYAxis}
                stroke="#374151"
                tick={{ fill: '#6b7280', fontSize: 8 }}
                axisLine={{ stroke: '#1e1e2e' }}
                tickLine={{ stroke: '#1e1e2e' }}
                width={45}
              />

              <Tooltip content={<CustomTooltip isShortView={isShortView} />} />

              {/* Zero reference line */}
              <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />

              {/* Token lines */}
              {sortedPositions.slice(0, 10).map((pos) => (
                <Line
                  key={pos.symbol}
                  type="monotone"
                  dataKey={pos.symbol}
                  stroke={pos.color}
                  strokeWidth={selectedToken === pos.mint ? 2.5 : 1.5}
                  strokeOpacity={
                    selectedToken === null || selectedToken === pos.mint ? 1 : 0.25
                  }
                  dot={false}
                  animationDuration={300}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-1">🏁</div>
              <p className="text-[10px]">Press Play to start</p>
            </div>
          </div>
        )}
      </div>

      {/* Top 5 tokens for this view */}
      <div className="flex flex-wrap gap-1 mt-1 justify-center flex-shrink-0">
        {sortedPositions.slice(0, 5).map((pos, index) => {
          const displayValue = isShortView ? -pos.position : pos.position;
          return (
            <button
              key={pos.mint}
              onClick={() =>
                onSelectToken(selectedToken === pos.mint ? null : pos.mint)
              }
              className={clsx(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-all',
                selectedToken === pos.mint
                  ? 'ring-1 ring-white ring-opacity-50'
                  : 'opacity-80 hover:opacity-100'
              )}
              style={{ backgroundColor: `${pos.color}20`, color: pos.color }}
            >
              <span className="font-bold">#{index + 1}</span>
              <span>{pos.symbol}</span>
              <span className={displayValue >= 0 ? 'text-green-400' : 'text-red-400'}>
                {displayValue >= 0 ? '+' : ''}{displayValue.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DualRaceChart({ chartData, positions, selectedToken, onSelectToken }: Props) {
  return (
    <div className="flex gap-3 h-full min-h-0">
      {/* Long View - Left */}
      <div className="flex-1 bg-green-500/5 rounded-lg p-2 border border-green-500/20">
        <SingleChart
          chartData={chartData}
          positions={positions}
          selectedToken={selectedToken}
          onSelectToken={onSelectToken}
          isShortView={false}
          title="LONG VIEW"
        />
      </div>

      {/* Short View - Right */}
      <div className="flex-1 bg-red-500/5 rounded-lg p-2 border border-red-500/20">
        <SingleChart
          chartData={chartData}
          positions={positions}
          selectedToken={selectedToken}
          onSelectToken={onSelectToken}
          isShortView={true}
          title="SHORT VIEW"
        />
      </div>
    </div>
  );
}
