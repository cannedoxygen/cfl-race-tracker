'use client';

import { RacePosition, MomentumSignal } from '@/types';
import Image from 'next/image';

interface Props {
  token: RacePosition;
  onClose: () => void;
}

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
  const color = lastVal >= 0 ? '#22C55E' : '#EF4444';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TokenStatsCard({ token, onClose }: Props) {
  const momentum = getMomentumLabel(token.momentum);
  const buyPct = token.buyCount + token.sellCount > 0
    ? ((token.buyRatio) * 100).toFixed(0)
    : '50';
  const sellPct = (100 - Number(buyPct)).toFixed(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative card-pixel bg-cfl-card p-5 w-full max-w-sm space-y-4"
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

        {/* Sparkline */}
        <div className="flex justify-center">
          <MiniSparkline history={token.history} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* 60s Change */}
          <div className="bg-cfl-bg rounded-lg p-3 border border-cfl-border">
            <div className="font-pixel text-[7px] text-cfl-text-muted mb-1">60s CHANGE</div>
            <div className={`font-pixel text-sm ${token.position >= 0 ? 'text-cfl-green' : 'text-cfl-red'}`}>
              {token.position >= 0 ? '+' : ''}{token.position.toFixed(3)}%
            </div>
          </div>

          {/* 5m Velocity */}
          <div className="bg-cfl-bg rounded-lg p-3 border border-cfl-border">
            <div className="font-pixel text-[7px] text-cfl-text-muted mb-1">5m VELOCITY</div>
            <div className={`font-pixel text-sm ${token.velocity >= 0 ? 'text-cfl-green' : 'text-cfl-red'}`}>
              {token.velocity >= 0 ? '+' : ''}{token.velocity.toFixed(3)}%
            </div>
          </div>

          {/* Volatility */}
          <div className="bg-cfl-bg rounded-lg p-3 border border-cfl-border">
            <div className="font-pixel text-[7px] text-cfl-text-muted mb-1">VOLATILITY 5m</div>
            <div className="font-pixel text-sm text-cfl-orange">
              {token.volatility5m.toFixed(3)}%
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

        {/* Volume Info */}
        <div className="flex justify-between items-center bg-cfl-bg rounded-lg p-3 border border-cfl-border">
          <div>
            <div className="font-pixel text-[7px] text-cfl-text-muted">BOOST</div>
            <div className="font-pixel text-sm text-cfl-teal">{token.boost || '—'}</div>
          </div>
          <div className="text-right">
            <div className="font-pixel text-[7px] text-cfl-text-muted">VOLUME SPIKE</div>
            <div className={`font-pixel text-sm ${token.volumeSpike ? 'text-cfl-orange' : 'text-cfl-text-muted'}`}>
              {token.volumeSpike ? 'YES ⚡' : 'NO'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
