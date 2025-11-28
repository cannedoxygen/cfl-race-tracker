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
import { RacePosition, MatchMode } from '@/types';
import clsx from 'clsx';

interface Props {
  chartData: Array<{ timestamp: number; [key: string]: number }>;
  positions: RacePosition[];
  selectedToken: string | null;
  onSelectToken: (mint: string | null) => void;
  matchMode: MatchMode;
}

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
              <span className={entry.value >= 0 ? 'text-green-400' : 'text-red-400'}>
                ${Math.abs(entry.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

export function RaceChart({ chartData, positions, selectedToken, onSelectToken, matchMode }: Props) {
  const formatXAxis = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Calculate Y axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [-100, 100];

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

    // Add padding
    const padding = Math.max(Math.abs(max), Math.abs(min)) * 0.1 || 100;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Compact header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h2 className="text-sm font-bold text-white">
          {matchMode === 'long' ? '📈 Long Race' : '📉 Short Race'}
        </h2>
        <div className={clsx(
          'text-[10px] px-1.5 py-0.5 rounded',
          matchMode === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        )}>
          {matchMode === 'long' ? 'Buys Win' : 'Sells Win'}
        </div>
      </div>

      {/* Chart - takes all available space */}
      <div className="flex-1 min-h-0">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
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
                width={40}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Zero reference line */}
              <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />

              {/* Token lines */}
              {positions.map((pos) => (
                <Line
                  key={pos.symbol}
                  type="monotone"
                  dataKey={pos.symbol}
                  stroke={pos.color}
                  strokeWidth={selectedToken === pos.mint ? 3 : 1.5}
                  strokeOpacity={
                    selectedToken === null || selectedToken === pos.mint ? 1 : 0.3
                  }
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: pos.color,
                    stroke: '#0a0a0f',
                    strokeWidth: 2,
                    onClick: () => onSelectToken(pos.mint),
                  }}
                  animationDuration={300}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-3xl mb-1">🏁</div>
              <p className="text-sm">Press Play to start</p>
            </div>
          </div>
        )}
      </div>

      {/* Compact token legend */}
      <div className="flex flex-wrap gap-1.5 mt-2 justify-center flex-shrink-0">
        {positions.slice(0, 6).map((pos, index) => (
          <button
            key={pos.mint}
            onClick={() =>
              onSelectToken(selectedToken === pos.mint ? null : pos.mint)
            }
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-all',
              selectedToken === pos.mint
                ? 'ring-1 ring-white ring-opacity-50'
                : 'opacity-80 hover:opacity-100'
            )}
            style={{ backgroundColor: `${pos.color}20`, color: pos.color }}
          >
            <span className="font-bold">#{index + 1}</span>
            <span>{pos.symbol}</span>
            <span className={pos.position >= 0 ? 'text-green-400' : 'text-red-400'}>
              {pos.position >= 0 ? '+' : ''}${Math.abs(pos.position).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
