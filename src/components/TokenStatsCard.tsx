'use client';

import { useState } from 'react';
import { RacePosition, MomentumSignal } from '@/types';
import Image from 'next/image';

interface Props {
  token: RacePosition;
  onClose: () => void;
}

type Timeframe = '1m' | '5m' | '10m';

function getMomentumLabel(m: MomentumSignal): { text: string; color: string } {
  switch (m) {
    case 'strong_buy': return { text: 'STRONG BUY', color: 'text-cfl-green' };
    case 'buy': return { text: 'BUY', color: 'text-cfl-green' };
    case 'neutral': return { text: 'NEUTRAL', color: 'text-cfl-text-muted' };
    case 'sell': return { text: 'SELL', color: 'text-cfl-red' };
    case 'strong_sell': return { text: 'STRONG SELL', color: 'text-cfl-red' };
    default: return { text: 'NEUTRAL', color: 'text-cfl-text-muted' };
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
  isActive
}: {
  history: Array<{ timestamp: number; position: number }>;
  timeframe: Timeframe;
  isActive: boolean;
}) {
  const filtered = filterHistoryByTimeframe(history, timeframe);

  if (filtered.length < 2) {
    return (
      <div className="flex items-center justify-center h-12 text-cfl-text-muted">
        <span className="font-pixel text-[6px]">NO DATA</span>
      </div>
    );
  }

  const values = filtered.map(h => h.position);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.01;

  const width = isActive ? 280 : 80;
  const height = isActive ? 60 : 30;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const change = values[values.length - 1] - values[0];
  const color = change >= 0 ? '#22C55E' : '#EF4444';

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Zero line */}
      {min < 0 && max > 0 && (
        <line
          x1={0}
          y1={height - ((0 - min) / range) * height}
          x2={width}
          y2={height - ((0 - min) / range) * height}
          stroke="#4B5563"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={isActive ? 2 : 1.5}
        strokeLinejoin="round"
      />
      {/* End dot */}
      {values.length > 0 && (
        <circle
          cx={width}
          cy={height - ((values[values.length - 1] - min) / range) * height}
          r={isActive ? 3 : 2}
          fill={color}
        />
      )}
    </svg>
  );
}

export function TokenStatsCard({ token, onClose }: Props) {
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('5m');
  const momentum = getMomentumLabel(token.momentum);
  const buyPct = token.buyCount + token.sellCount > 0
    ? ((token.buyRatio) * 100).toFixed(0)
    : '50';
  const sellPct = (100 - Number(buyPct)).toFixed(0);

  const timeframes: Timeframe[] = ['1m', '5m', '10m'];
  const change1m = getChangeForTimeframe(token.history, '1m');
  const change5m = getChangeForTimeframe(token.history, '5m');
  const change10m = getChangeForTimeframe(token.history, '10m');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative card-pixel bg-cfl-card p-5 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-cfl-border flex items-center justify-center"
              style={{ backgroundColor: `${token.color}20` }}>
              {token.logoURI ? (
                <Image src={token.logoURI} alt={token.symbol} width={32} height={32} className="rounded-full" unoptimized />
              ) : (
                <span className="font-pixel text-[8px]" style={{ color: token.color }}>{token.symbol.slice(0, 2)}</span>
              )}
            </div>
            <div>
              <div className="font-pixel-body text-xl text-white">{token.symbol}</div>
              <div className="font-pixel-body text-sm text-cfl-text-muted">{token.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="font-pixel text-[8px] text-cfl-text-muted hover:text-white px-2 py-1">
            CLOSE
          </button>
        </div>

        {/* Price */}
        {token.currentPrice && (
          <div className="text-center">
            <div className="font-pixel text-[8px] text-cfl-text-muted mb-1">PRICE</div>
            <div className="font-pixel-body text-2xl text-white">
              ${token.currentPrice < 0.01 ? token.currentPrice.toFixed(8) : token.currentPrice.toFixed(4)}
            </div>
          </div>
        )}

        {/* Timeframe Selector */}
        <div className="bg-cfl-bg rounded-lg p-3 border border-cfl-border">
          <div className="flex items-center justify-between mb-2">
            <div className="font-pixel text-[7px] text-cfl-text-muted">TIMEFRAME CHART</div>
            <div className="flex gap-1">
              {timeframes.map(tf => (
                <button
                  key={tf}
                  onClick={() => setActiveTimeframe(tf)}
                  className={`font-pixel text-[7px] px-2 py-1 rounded transition-colors ${
                    activeTimeframe === tf
                      ? 'bg-cfl-pink text-white'
                      : 'bg-cfl-border/50 text-cfl-text-muted hover:bg-cfl-border'
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center py-2">
            <TimeframeChart
              history={token.history}
              timeframe={activeTimeframe}
              isActive={true}
            />
          </div>
          <div className="text-center mt-2">
            <span className={`font-pixel text-sm ${
              activeTimeframe === '1m' ? (change1m >= 0 ? 'text-cfl-green' : 'text-cfl-red') :
              activeTimeframe === '5m' ? (change5m >= 0 ? 'text-cfl-green' : 'text-cfl-red') :
              (change10m >= 0 ? 'text-cfl-green' : 'text-cfl-red')
            }`}>
              {activeTimeframe === '1m' ? (change1m >= 0 ? '+' : '') + change1m.toFixed(3) :
               activeTimeframe === '5m' ? (change5m >= 0 ? '+' : '') + change5m.toFixed(3) :
               (change10m >= 0 ? '+' : '') + change10m.toFixed(3)}%
            </span>
          </div>
        </div>

        {/* Quick Timeframe Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`bg-cfl-bg rounded-lg p-2 border text-center ${activeTimeframe === '1m' ? 'border-cfl-pink' : 'border-cfl-border'}`}>
            <div className="font-pixel text-[6px] text-cfl-text-muted mb-1">1 MIN</div>
            <TimeframeChart history={token.history} timeframe="1m" isActive={false} />
            <div className={`font-pixel text-[8px] mt-1 ${change1m >= 0 ? 'text-cfl-green' : 'text-cfl-red'}`}>
              {change1m >= 0 ? '+' : ''}{change1m.toFixed(2)}%
            </div>
          </div>
          <div className={`bg-cfl-bg rounded-lg p-2 border text-center ${activeTimeframe === '5m' ? 'border-cfl-pink' : 'border-cfl-border'}`}>
            <div className="font-pixel text-[6px] text-cfl-text-muted mb-1">5 MIN</div>
            <TimeframeChart history={token.history} timeframe="5m" isActive={false} />
            <div className={`font-pixel text-[8px] mt-1 ${change5m >= 0 ? 'text-cfl-green' : 'text-cfl-red'}`}>
              {change5m >= 0 ? '+' : ''}{change5m.toFixed(2)}%
            </div>
          </div>
          <div className={`bg-cfl-bg rounded-lg p-2 border text-center ${activeTimeframe === '10m' ? 'border-cfl-pink' : 'border-cfl-border'}`}>
            <div className="font-pixel text-[6px] text-cfl-text-muted mb-1">10 MIN</div>
            <TimeframeChart history={token.history} timeframe="10m" isActive={false} />
            <div className={`font-pixel text-[8px] mt-1 ${change10m >= 0 ? 'text-cfl-green' : 'text-cfl-red'}`}>
              {change10m >= 0 ? '+' : ''}{change10m.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Rolling 60s */}
          <div className="bg-cfl-bg rounded-lg p-3 border border-cfl-border">
            <div className="font-pixel text-[7px] text-cfl-text-muted mb-1">ROLLING 60s</div>
            <div className={`font-pixel text-sm ${token.position >= 0 ? 'text-cfl-green' : 'text-cfl-red'}`}>
              {token.position >= 0 ? '+' : ''}{token.position.toFixed(3)}%
            </div>
          </div>

          {/* Volatility */}
          <div className="bg-cfl-bg rounded-lg p-3 border border-cfl-border">
            <div className="font-pixel text-[7px] text-cfl-text-muted mb-1">VOLATILITY 5m</div>
            <div className="font-pixel text-sm text-cfl-orange">
              {token.volatility5m.toFixed(3)}%
            </div>
          </div>

          {/* Velocity */}
          <div className="bg-cfl-bg rounded-lg p-3 border border-cfl-border">
            <div className="font-pixel text-[7px] text-cfl-text-muted mb-1">VELOCITY 5m</div>
            <div className={`font-pixel text-sm ${token.velocity >= 0 ? 'text-cfl-green' : 'text-cfl-red'}`}>
              {token.velocity >= 0 ? '+' : ''}{token.velocity.toFixed(3)}%
            </div>
          </div>

          {/* Momentum */}
          <div className="bg-cfl-bg rounded-lg p-3 border border-cfl-border">
            <div className="font-pixel text-[7px] text-cfl-text-muted mb-1">MOMENTUM</div>
            <div className={`font-pixel text-sm ${momentum.color}`}>
              {momentum.text}
            </div>
          </div>
        </div>

        {/* Buy/Sell Pressure Bar */}
        <div>
          <div className="font-pixel text-[7px] text-cfl-text-muted mb-2">BUY / SELL PRESSURE</div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[8px] text-cfl-green w-10 text-right">{buyPct}%</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden bg-cfl-red/40 flex">
              <div
                className="h-full bg-cfl-green rounded-l-full transition-all duration-500"
                style={{ width: `${buyPct}%` }}
              />
            </div>
            <span className="font-pixel text-[8px] text-cfl-red w-10">{sellPct}%</span>
          </div>
          <div className="flex justify-between mt-1 font-pixel-body text-xs text-cfl-text-muted">
            <span>{token.buyCount} buys</span>
            <span>{token.sellCount} sells</span>
          </div>
        </div>

      </div>
    </div>
  );
}
