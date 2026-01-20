'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { UnifiedRaceChart } from './UnifiedRaceChart';
import { RaceLeaderboard } from './RaceLeaderboard';
import { AlertPanel } from './AlertPanel';
import { MostVolatile } from './MostVolatile';
import { useRaceData } from '@/hooks/useRaceData';

export function Dashboard() {
  const {
    matchMode,
    positions,
    alerts,
    chartData,
    dismissAlert,
  } = useRaceData();

  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [bottomHeight, setBottomHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newBottomHeight = containerRect.bottom - e.clientY;
      // Clamp between 100px and 400px
      setBottomHeight(Math.min(400, Math.max(100, newBottomHeight)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col h-full bg-cfl-bg overflow-hidden">
      <main className="flex-1 flex flex-col p-3 gap-2 overflow-hidden min-h-0">
        {/* Alerts Row */}
        {alerts.length > 0 && (
          <div className="flex-shrink-0">
            <AlertPanel alerts={alerts} onDismiss={dismissAlert} compact />
          </div>
        )}

        {/* Main content area - fills remaining space */}
        <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Unified Race Chart - Longs vs Shorts, biggest % wins */}
          <div className="flex-1 bg-cfl-card rounded-xl p-3 min-h-0">
            <UnifiedRaceChart
              chartData={chartData}
              positions={positions}
              selectedToken={selectedToken}
              onSelectToken={setSelectedToken}
            />
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`h-2 flex items-center justify-center cursor-row-resize group ${
              isDragging ? 'bg-orange-500/20' : 'hover:bg-gray-700/50'
            } transition-colors`}
          >
            <div className={`w-16 h-1 rounded-full ${
              isDragging ? 'bg-orange-400' : 'bg-gray-600 group-hover:bg-gray-500'
            } transition-colors`} />
          </div>

          {/* Bottom row - Shorts + Longs + Volatile + Leaderboard */}
          <div style={{ height: bottomHeight }} className="flex gap-2 flex-shrink-0">
            {/* Top Shorts - 5m losers */}
            <div className="w-[200px] bg-cfl-card rounded-xl p-3 overflow-hidden">
              <MostVolatile
                positions={positions}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                filter="short"
              />
            </div>

            {/* Top Longs - 5m gainers */}
            <div className="w-[200px] bg-cfl-card rounded-xl p-3 overflow-hidden">
              <MostVolatile
                positions={positions}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                filter="long"
              />
            </div>

            {/* Most Volatile - biggest absolute swings */}
            <div className="w-[200px] bg-cfl-card rounded-xl p-3 overflow-hidden">
              <MostVolatile
                positions={positions}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                filter="all"
              />
            </div>

            {/* Leaderboard */}
            <div className="flex-1 bg-cfl-card rounded-xl p-3 overflow-hidden">
              <RaceLeaderboard
                positions={positions}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                matchMode={matchMode}
                compact
              />
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="px-3 py-1.5 border-t border-cfl-border flex-shrink-0">
        <div className="flex items-center justify-between text-[10px] text-gray-600">
          <span>CFL Race Tracker</span>
          <span>Powered by Pyth Network</span>
        </div>
      </footer>
    </div>
  );
}
