import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { useRaceStore } from '../../store/raceStore';
import { useWalletStore } from '../../store/walletStore';
import { fetchTokens, fetchRacePrices } from '../../services/apiService';
import { RacePosition } from '../../types';

// Import components
import { AlertBadges } from '../../components/cfl/AlertBadges';
import { RaceChart } from '../../components/cfl/RaceChart';
import { SmartMovers } from '../../components/cfl/SmartMovers';
import { TopMovers } from '../../components/cfl/TopMovers';
import { Leaderboard } from '../../components/cfl/Leaderboard';
import { TokenStatsCard } from '../../components/cfl/TokenStatsCard';
import { SubscriptionTimer } from '../../components/SubscriptionTimer';
import { PaymentModal } from '../../components/PaymentModal';

export function RaceScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { hasAccess } = useWalletStore();

  const {
    status,
    elapsedTime,
    positions,
    alerts,
    startRace,
    pauseRace,
    resetRace,
    initializePositions,
    updatePrices,
    updateElapsedTime,
    dismissAlert,
  } = useRaceStore();

  // Handle play button press - check access first
  const handlePlayPress = () => {
    if (hasAccess) {
      startRace();
    } else {
      setShowPaymentModal(true);
    }
  };

  // On successful payment, start the race
  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    startRace();
  };

  // Initialize tokens on mount
  useEffect(() => {
    async function loadTokens() {
      setIsLoading(true);
      try {
        const tokens = await fetchTokens();
        if (tokens.length > 0) {
          initializePositions(tokens);
        }
      } catch (err) {
        console.error('Failed to load tokens:', err);
      }
      setIsLoading(false);
    }
    loadTokens();
  }, []);

  // Poll prices when racing
  useEffect(() => {
    if (status !== 'racing') return;

    const pollPrices = async () => {
      try {
        const data = await fetchRacePrices();
        if (data?.prices) {
          const updates = data.prices.map(p => ({
            mint: p.mint,
            symbol: p.symbol,
            boost: p.boost || 80,
            startPrice: p.startPrice,
            currentPrice: p.price,
            percentChange: p.percentChange,
            totalChange: p.totalChange,
          }));
          updatePrices(updates);
        }
      } catch (err) {
        console.error('Failed to fetch prices:', err);
      }
    };

    pollPrices();
    const interval = setInterval(pollPrices, 2000);
    return () => clearInterval(interval);
  }, [status]);

  // Update elapsed time every second
  useEffect(() => {
    if (status !== 'racing') return;
    const interval = setInterval(updateElapsedTime, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const tokens = await fetchTokens();
      if (tokens.length > 0) {
        initializePositions(tokens);
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    }
    setRefreshing(false);
  }, []);

  // Convert positions map to sorted array
  const sortedPositions = Array.from(positions.values())
    .sort((a, b) => Math.abs(b.position) - Math.abs(a.position));

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get selected token data for modal
  const selectedTokenData = selectedToken
    ? sortedPositions.find(p => p.mint === selectedToken)
    : null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading tokens...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoGold}>CFL</Text>
          <Text style={styles.logoTeal}>ADV</Text>
          <SubscriptionTimer />
        </View>

        {/* Race Controls */}
        <View style={styles.controls}>
          <View style={styles.timerContainer}>
            <View style={[
              styles.statusDot,
              status === 'racing' && styles.statusDotRacing,
              status === 'paused' && styles.statusDotPaused,
            ]} />
            <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
          </View>

          {status === 'idle' && (
            <TouchableOpacity style={styles.playButton} onPress={handlePlayPress}>
              <Text style={styles.buttonIcon}>▶</Text>
              <Text style={styles.buttonText}>PLAY</Text>
            </TouchableOpacity>
          )}

          {status === 'racing' && (
            <TouchableOpacity style={styles.pauseButton} onPress={pauseRace}>
              <Text style={styles.buttonIcon}>⏸</Text>
              <Text style={styles.buttonTextDark}>PAUSE</Text>
            </TouchableOpacity>
          )}

          {status === 'paused' && (
            <TouchableOpacity style={styles.playButton} onPress={startRace}>
              <Text style={styles.buttonIcon}>▶</Text>
              <Text style={styles.buttonText}>RESUME</Text>
            </TouchableOpacity>
          )}

          {(status === 'racing' || status === 'paused') && (
            <TouchableOpacity style={styles.resetButton} onPress={resetRace}>
              <Text style={styles.resetIcon}>↻</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Alerts */}
      <AlertBadges alerts={alerts} onDismiss={dismissAlert} />

      {/* Main Content - Scrollable */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
          />
        }
      >
        {/* Race Chart */}
        <View style={styles.chartCard}>
          <RaceChart
            positions={sortedPositions}
            selectedToken={selectedToken}
            onSelectToken={setSelectedToken}
          />
        </View>

        {/* SmartMovers - Hot */}
        <View style={styles.card}>
          <SmartMovers
            positions={sortedPositions}
            selectedToken={selectedToken}
            onSelectToken={setSelectedToken}
            metric="hot"
          />
        </View>

        {/* SmartMovers - Momentum */}
        <View style={styles.card}>
          <SmartMovers
            positions={sortedPositions}
            selectedToken={selectedToken}
            onSelectToken={setSelectedToken}
            metric="momentum"
          />
        </View>

        {/* SmartMovers - Volatile */}
        <View style={styles.card}>
          <SmartMovers
            positions={sortedPositions}
            selectedToken={selectedToken}
            onSelectToken={setSelectedToken}
            metric="volatile"
          />
        </View>

        {/* SmartMovers - Trending */}
        <View style={styles.card}>
          <SmartMovers
            positions={sortedPositions}
            selectedToken={selectedToken}
            onSelectToken={setSelectedToken}
            metric="trending"
          />
        </View>

        {/* TopMovers - Hourly */}
        <View style={styles.cardTall}>
          <TopMovers
            positions={sortedPositions}
            selectedToken={selectedToken}
            onSelectToken={setSelectedToken}
            intervalMinutes={60}
            topCount={3}
          />
        </View>

        {/* Leaderboard */}
        <View style={styles.cardTall}>
          <Leaderboard
            positions={sortedPositions}
            selectedToken={selectedToken}
            onSelectToken={setSelectedToken}
          />
        </View>

        {/* Spacer for tab bar */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>CFL Advantage</Text>
        <Text style={styles.footerSubtext}>
          {status === 'racing' ? `Racing...` : 'Press PLAY to start'}
        </Text>
        <Text style={styles.footerPowered}>Powered by Pyth Network</Text>
      </View>

      {/* Token Stats Modal */}
      {selectedTokenData && (
        <TokenStatsCard
          token={selectedTokenData}
          onClose={() => setSelectedToken(null)}
        />
      )}

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  logoContainer: {
    flexDirection: 'row',
  },
  logoGold: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logoTeal: {
    color: COLORS.teal,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
  },
  statusDotRacing: {
    backgroundColor: COLORS.green,
  },
  statusDotPaused: {
    backgroundColor: COLORS.gold,
  },
  timerText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '600',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  resetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonIcon: {
    color: COLORS.text,
    fontSize: 12,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  buttonTextDark: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  resetIcon: {
    color: COLORS.text,
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    minHeight: 180,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: 4,
    marginBottom: SPACING.md,
    minHeight: 420,
  },
  cardTall: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    minHeight: 220,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  footerSubtext: {
    color: COLORS.orange,
    fontSize: 10,
  },
  footerPowered: {
    color: COLORS.teal,
    fontSize: 11,
  },
});
