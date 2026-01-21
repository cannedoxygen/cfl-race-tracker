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
          {/* Unified Race Chart */}
          <div className="h-[300px] md:h-auto md:flex-1 card-pixel p-2 md:p-3 min-h-0">
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
            className={`hidden md:flex h-3 items-center justify-center cursor-row-resize group ${
              isDragging ? 'bg-cfl-orange/20' : 'hover:bg-cfl-border/50'
            } transition-colors`}
          >
            <div className={`w-20 h-1.5 rounded-full ${
              isDragging ? 'bg-cfl-orange' : 'bg-cfl-border group-hover:bg-cfl-text-muted'
            } transition-colors`} />
          </div>

          {/* Bottom panels - Mobile: stack vertically, Desktop: horizontal row */}
          <div
            style={{ height: typeof window !== 'undefined' && window.innerWidth >= 768 ? bottomHeight : 'auto' }}
            className="flex flex-col md:flex-row gap-2 flex-shrink-0 mt-2 md:mt-0"
          >
            {/* Mobile: 2x2 grid for volatile panels, Desktop: horizontal */}
            <div className="grid grid-cols-2 md:flex gap-2 md:gap-2">
              {/* Top Shorts - 5m losers */}
              <div className="h-[150px] md:h-auto md:w-[200px] card-pixel p-2 md:p-3 overflow-hidden">
                <MostVolatile
                  positions={positions}
                  selectedToken={selectedToken}
                  onSelectToken={setSelectedToken}
                  filter="short"
                />
              </div>

              {/* Top Longs - 5m gainers */}
              <div className="h-[150px] md:h-auto md:w-[200px] card-pixel p-2 md:p-3 overflow-hidden">
                <MostVolatile
                  positions={positions}
                  selectedToken={selectedToken}
                  onSelectToken={setSelectedToken}
                  filter="long"
                />
              </div>

              {/* Most Volatile - biggest absolute swings */}
              <div className="h-[150px] md:h-auto md:w-[200px] card-pixel p-2 md:p-3 overflow-hidden">
                <MostVolatile
                  positions={positions}
                  selectedToken={selectedToken}
                  onSelectToken={setSelectedToken}
                  filter="all"
                />
              </div>

              {/* Leaderboard - Mobile: full width below, Desktop: flex-1 */}
              <div className="h-[150px] md:h-auto md:hidden card-pixel p-2 overflow-hidden">
                <RaceLeaderboard
                  positions={positions}
                  selectedToken={selectedToken}
                  onSelectToken={setSelectedToken}
                  matchMode={matchMode}
                  compact
                />
              </div>
            </div>

            {/* Leaderboard - Desktop only (in the row) */}
            <div className="hidden md:block flex-1 card-pixel p-3 overflow-hidden">
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
