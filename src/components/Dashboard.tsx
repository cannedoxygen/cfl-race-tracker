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
  const [bottomHeight, setBottomHeight] = useState(120);
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
      // Clamp between 80px and 250px - keep chart as main focus
      setBottomHeight(Math.min(250, Math.max(80, newBottomHeight)));
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
      {/* Mobile: scrollable, Desktop: fixed layout */}
      <main className="flex-1 flex flex-col p-2 md:p-3 gap-2 overflow-y-auto md:overflow-hidden min-h-0">
        {/* Alerts Row */}
        {alerts.length > 0 && (
          <div className="flex-shrink-0">
            <AlertPanel alerts={alerts} onDismiss={dismissAlert} compact />
          </div>
        )}

        {/* Main content area */}
        <div ref={containerRef} className="flex-1 flex flex-col md:overflow-hidden min-h-0">
          {/* Unified Race Chart - Main focus, takes most space */}
          <div className="h-[300px] md:flex-1 card-pixel p-2 md:p-3 min-h-[400px] md:min-h-0">
            <UnifiedRaceChart
              chartData={chartData}
              positions={positions}
              selectedToken={selectedToken}
              onSelectToken={setSelectedToken}
            />
          </div>

          {/* Resize Handle - Desktop only */}
          <div
            onMouseDown={handleMouseDown}
            className={`hidden md:flex h-2 items-center justify-center cursor-row-resize group flex-shrink-0 ${
              isDragging ? 'bg-cfl-orange/20' : 'hover:bg-cfl-border/50'
            } transition-colors`}
          >
            <div className={`w-20 h-1 rounded-full ${
              isDragging ? 'bg-cfl-orange' : 'bg-cfl-border group-hover:bg-cfl-text-muted'
            } transition-colors`} />
          </div>

          {/* Bottom panels - Desktop: compact horizontal row */}
          <div
            style={{ height: bottomHeight }}
            className="hidden md:flex flex-row gap-2 flex-shrink-0"
          >
            {/* Top Shorts */}
            <div className="w-[180px] card-pixel p-2 overflow-hidden">
              <MostVolatile
                positions={positions}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                filter="short"
              />
            </div>

            {/* Top Longs */}
            <div className="w-[180px] card-pixel p-2 overflow-hidden">
              <MostVolatile
                positions={positions}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                filter="long"
              />
            </div>

            {/* Most Volatile */}
            <div className="w-[180px] card-pixel p-2 overflow-hidden">
              <MostVolatile
                positions={positions}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                filter="all"
              />
            </div>

            {/* Leaderboard */}
            <div className="flex-1 card-pixel p-2 overflow-hidden">
              <RaceLeaderboard
                positions={positions}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                matchMode={matchMode}
                compact
              />
            </div>
          </div>

          {/* Mobile panels - stacked vertically */}
          <div className="flex md:hidden flex-col gap-2 mt-2">
            <div className="h-[120px] card-pixel p-2 overflow-hidden">
              <MostVolatile
                positions={positions}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                filter="short"
              />
            </div>
            <div className="h-[120px] card-pixel p-2 overflow-hidden">
              <MostVolatile
                positions={positions}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                filter="long"
              />
            </div>
            <div className="h-[120px] card-pixel p-2 overflow-hidden">
              <MostVolatile
                positions={positions}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
                filter="all"
              />
            </div>
            <div className="h-[150px] card-pixel p-2 overflow-hidden">
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
      <footer className="px-3 py-2 border-t-2 border-cfl-border flex-shrink-0 bg-cfl-card">
        <div className="flex items-center justify-between font-pixel-body text-sm text-cfl-text-muted">
          <span>CFL Race Tracker</span>
          <span className="text-cfl-teal">Powered by Pyth Network</span>
        </div>
      </footer>
    </div>
  );
}
