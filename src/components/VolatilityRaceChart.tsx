'use client';

import { useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { VolatilityScore, ChartViewMode } from '@/types';
import { useAppStore } from '@/store/appStore';
import clsx from 'clsx';

interface Props {
  chartData: Array<{ timestamp: number; [key: string]: number }>;
  scores: VolatilityScore[];
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const time = new Date(label).toLocaleTimeString();

  return (
    <div className="bg-cfl-card border border-cfl-border rounded-lg p-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2">{time}</p>
      <div className="space-y-1">
        {payload
          .sort((a: any, b: any) => b.value - a.value)
          .slice(0, 5)
          .map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-2 text-sm">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-white font-medium">{entry.name}</span>
              <span className="text-gray-400">{entry.value.toFixed(1)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// Custom dot with token logo
function CustomDot(props: any) {
  const { cx, cy, payload, dataKey, scores } = props;

  if (cx === undefined || cy === undefined) return null;

  const score = scores?.find((s: VolatilityScore) => s.symbol === dataKey);
  if (!score) return null;

  return (
    <g>
      {/* Glow effect */}
      <circle
        cx={cx}
        cy={cy}
        r={14}
        fill={score.color}
        fillOpacity={0.2}
        className="animate-pulse-glow"
      />
      {/* Main circle with logo */}
      <circle cx={cx} cy={cy} r={10} fill={score.color} stroke="#0a0a0f" strokeWidth={2} />
      {/* We'll use initials since logos need image handling */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={8}
        fontWeight="bold"
      >
        {score.symbol.slice(0, 2)}
      </text>
    </g>
  );
}

export function VolatilityRaceChart({ chartData, scores }: Props) {
  const { selectedToken, viewMode, setViewMode, setSelectedToken } = useAppStore();

  // Format X axis time
  const formatXAxis = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Get unique symbols from scores
  const symbols = useMemo(() => scores.map((s) => s.symbol), [scores]);

  // Filter chart data based on view mode
  const processedData = useMemo(() => {
    if (viewMode === 'volatility') {
      return chartData;
    }

    // For change1m/change5m, we need to use the latest scores to generate data
    return chartData.map((point) => {
      const newPoint: { timestamp: number; [key: string]: number } = {
        timestamp: point.timestamp,
      };

      for (const score of scores) {
        if (viewMode === 'change1m') {
          newPoint[score.symbol] = 50 + score.percentChange1m * 5; // Scale for visibility
        } else {
          newPoint[score.symbol] = 50 + score.percentChange5m * 2;
        }
      }

      return newPoint;
    });
  }, [chartData, scores, viewMode]);

  const viewModeLabels: Record<ChartViewMode, string> = {
    volatility: 'Volatility',
    change1m: '1m Change',
    change5m: '5m Change',
  };

  return (
    <div className="flex flex-col h-full">
      {/* View mode toggle */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-lg font-bold text-white">Volatility Race</h2>
        <div className="flex gap-1 bg-cfl-card rounded-lg p-1">
          {(['volatility', 'change1m', 'change5m'] as ChartViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={clsx(
                'px-3 py-1 text-xs rounded-md transition-all',
                viewMode === mode
                  ? 'bg-cfl-purple text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {viewModeLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={processedData}
            margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
          >
            <defs>
              {scores.map((score) => (
                <linearGradient
                  key={score.symbol}
                  id={`gradient-${score.symbol}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={score.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={score.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              stroke="#374151"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={{ stroke: '#1e1e2e' }}
              tickLine={{ stroke: '#1e1e2e' }}
            />

            <YAxis
              domain={[0, 100]}
              stroke="#374151"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={{ stroke: '#1e1e2e' }}
              tickLine={{ stroke: '#1e1e2e' }}
              width={40}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Reference line at 50 for change modes */}
            {viewMode !== 'volatility' && (
              <ReferenceLine y={50} stroke="#374151" strokeDasharray="3 3" />
            )}

            {/* Token lines */}
            {scores.map((score) => (
              <Line
                key={score.symbol}
                type="monotone"
                dataKey={score.symbol}
                stroke={score.color}
                strokeWidth={selectedToken === score.mint ? 3 : 2}
                strokeOpacity={
                  selectedToken === null || selectedToken === score.mint ? 1 : 0.3
                }
                dot={false}
                activeDot={{
                  r: 12,
                  fill: score.color,
                  stroke: '#0a0a0f',
                  strokeWidth: 2,
                  onClick: () => setSelectedToken(score.mint),
                }}
                animationDuration={500}
                animationEasing="ease-in-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - Token bubbles */}
      <div className="flex flex-wrap gap-2 mt-4 px-2 justify-center">
        {scores.slice(0, 5).map((score, index) => (
          <button
            key={score.mint}
            onClick={() =>
              setSelectedToken(selectedToken === score.mint ? null : score.mint)
            }
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all',
              selectedToken === score.mint
                ? 'ring-2 ring-white ring-opacity-50'
                : 'opacity-80 hover:opacity-100'
            )}
            style={{ backgroundColor: `${score.color}20`, color: score.color }}
          >
            <span className="font-bold">#{index + 1}</span>
            <span>{score.symbol}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
