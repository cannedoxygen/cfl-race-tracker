'use client';

import { useState } from 'react';
import { UnifiedRaceChart } from './UnifiedRaceChart';
import { RaceLeaderboard } from './RaceLeaderboard';
import { RaceControls } from './RaceControls';
import { RecentTrades } from './RecentTrades';
import { AlertPanel } from './AlertPanel';
import { Header } from './Header';
import { useRaceData } from '@/hooks/useRaceData';

export function Dashboard() {
  const {
    status,
    elapsedTime,
    matchMode,
    selectedTrack,
    positions,
    recentTrades,
    alerts,
    chartData,
    startRace,
    pauseRace,
    resetRace,
    setMatchMode,
    setSelectedTrack,
    dismissAlert,
  } = useRaceData();

  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen bg-cfl-bg overflow-hidden">
      <Header matchMode={matchMode} />

      <main className="flex-1 flex flex-col p-3 gap-2 overflow-hidden min-h-0">
        {/* Controls + Alerts Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <RaceControls
            status={status}
            elapsedTime={elapsedTime}
            matchMode={matchMode}
            selectedTrack={selectedTrack}
            onStart={startRace}
            onPause={pauseRace}
            onReset={resetRace}
            onSetMatchMode={setMatchMode}
            onSetTrack={setSelectedTrack}
          />
          {/* Inline Alerts */}
          {alerts.length > 0 && (
            <div className="flex-1">
              <AlertPanel alerts={alerts} onDismiss={dismissAlert} compact />
            </div>
          )}
        </div>

        {/* Main content area - fills remaining space */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
          {/* Unified Race Chart - Longs vs Shorts, biggest % wins */}
          <div className="flex-1 bg-cfl-card rounded-xl p-3 min-h-0">
            <UnifiedRaceChart
              chartData={chartData}
              positions={positions}
              selectedToken={selectedToken}
              onSelectToken={setSelectedToken}
            />
          </div>

          {/* Bottom row - Leaderboard + Recent Trades */}
          <div className="h-[200px] flex gap-2 flex-shrink-0">
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

            {/* Recent Trades */}
            {status === 'racing' && recentTrades.length > 0 && (
              <div className="w-[300px] bg-cfl-card rounded-xl p-2 overflow-hidden">
                <RecentTrades trades={recentTrades} compact />
              </div>
            )}
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
