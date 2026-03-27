import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { fetchJackpot } from '../../services/apiService';
import { JACKPOT_WALLET } from '../../constants/wallet';

interface JackpotData {
  totalJackpot: number;
  ticketCount: number;
  topUsers: Array<{
    wallet: string;
    tickets: number;
    skrDomain?: string;
  }>;
  lastWinner?: {
    wallet: string;
    prize: number;
    timestamp: number;
  };
}

export function JackpotScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jackpotData, setJackpotData] = useState<JackpotData | null>(null);

  const loadJackpot = useCallback(async () => {
    const data = await fetchJackpot();
    setJackpotData(data);
    setIsLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadJackpot();
    const interval = setInterval(loadJackpot, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadJackpot();
  }, []);

  // Format wallet address with null safety
  const formatWallet = (wallet?: string, skrDomain?: string) => {
    if (skrDomain) return skrDomain;
    if (!wallet || wallet.length < 8) return 'Unknown';
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  // Calculate total tickets
  const totalTickets = jackpotData?.topUsers?.reduce((sum, u) => sum + (u.tickets || 0), 0) || 0;

  // Get next Friday
  const getNextFriday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7;

    // If it's Friday past noon, go to next Friday
    if (daysUntilFriday === 0 && now.getHours() >= 12) {
      daysUntilFriday = 7;
    }

    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + daysUntilFriday);
    nextFriday.setHours(12, 0, 0, 0);
    return nextFriday.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading jackpot...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>WEEKLY JACKPOT RAFFLE</Text>
          <Text style={styles.subtitle}>
            Buy a race pass, get a raffle ticket. Winner takes the jackpot!
          </Text>
        </View>

        {/* Jackpot Amount */}
        <View style={styles.jackpotCard}>
          <Text style={styles.jackpotLabel}>THIS WEEK'S JACKPOT</Text>
          <Text style={styles.jackpotAmount}>
            {jackpotData?.totalJackpot?.toFixed(4) || '0.0000'} SOL
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalTickets}</Text>
              <Text style={styles.statLabel}>Raffle Tickets</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: COLORS.orange }]}>
                {jackpotData?.topUsers?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Players Entered</Text>
            </View>
          </View>
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>DRAWING:</Text>
              <Text style={styles.infoValue}>{getNextFriday()} at noon</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>WALLET:</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://solscan.io/account/${JACKPOT_WALLET}`)}
              >
                <Text style={styles.walletLink}>
                  {JACKPOT_WALLET.slice(0, 4)}...{JACKPOT_WALLET.slice(-3)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>HOW IT WORKS</Text>
          <View style={styles.step}>
            <View style={[styles.stepBadge, { backgroundColor: 'rgba(249,115,22,0.2)' }]}>
              <Text style={[styles.stepNumber, { color: COLORS.orange }]}>1</Text>
            </View>
            <Text style={styles.stepText}>Pay 0.02 SOL for a 24hr race pass</Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepBadge, { backgroundColor: 'rgba(88,166,255,0.2)' }]}>
              <Text style={[styles.stepNumber, { color: COLORS.teal }]}>🎟</Text>
            </View>
            <Text style={styles.stepText}>
              <Text style={{ color: COLORS.teal, fontWeight: '700' }}>Get 1 raffle ticket</Text> for each pass
            </Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepBadge, { backgroundColor: 'rgba(63,185,80,0.2)' }]}>
              <Text style={[styles.stepNumber, { color: COLORS.green }]}>+</Text>
            </View>
            <Text style={styles.stepText}>0.01 SOL from each pass goes to jackpot</Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepBadge, { backgroundColor: 'rgba(251,191,36,0.2)' }]}>
              <Text style={[styles.stepNumber, { color: COLORS.gold }]}>$</Text>
            </View>
            <Text style={styles.stepText}>
              <Text style={{ color: COLORS.gold, fontWeight: '700' }}>Every Friday at noon</Text>, one ticket wins!
            </Text>
          </View>
        </View>

        {/* This Week's Entries */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🎟 THIS WEEK'S ENTRIES</Text>
            <Text style={styles.cardSubtitle}>
              {totalTickets} tickets / {jackpotData?.topUsers?.length || 0} players
            </Text>
          </View>

          {!jackpotData?.topUsers || jackpotData.topUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>NO ENTRIES YET</Text>
              <Text style={styles.emptyText}>Be the first to enter the raffle!</Text>
            </View>
          ) : (
            jackpotData.topUsers.map((user, index) => (
              <View key={user.wallet || index} style={styles.entryRow}>
                <View style={styles.entryLeft}>
                  <View style={styles.ticketBadge}>
                    <Text style={styles.ticketEmoji}>🎟</Text>
                  </View>
                  <View>
                    <Text style={styles.entryWallet}>
                      {formatWallet(user.wallet, user.skrDomain)}
                    </Text>
                    <Text style={styles.entryStatus}>ENTERED</Text>
                  </View>
                </View>
                <View style={styles.entryRight}>
                  <Text style={styles.entryTickets}>
                    {user.tickets} {user.tickets === 1 ? 'TICKET' : 'TICKETS'}
                  </Text>
                  <Text style={styles.entryChance}>
                    {totalTickets > 0 ? ((user.tickets / totalTickets) * 100).toFixed(1) : 0}% chance
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Winner */}
        {jackpotData?.lastWinner && (
          <View style={styles.winnerCard}>
            <Text style={styles.winnerTitle}>🏆 RECENT WINNER</Text>
            <View style={styles.winnerInfo}>
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerEmoji}>🏆</Text>
              </View>
              <View style={styles.winnerDetails}>
                <Text style={styles.winnerWallet}>
                  {formatWallet(jackpotData.lastWinner.wallet)}
                </Text>
                <Text style={styles.winnerLabel}>WINNER</Text>
              </View>
              <View style={styles.winnerPrizeContainer}>
                <Text style={styles.winnerPrize}>
                  {jackpotData.lastWinner.prize.toFixed(4)} SOL
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Fine Print */}
        <Text style={styles.finePrint}>
          Drawing happens every Friday at noon (same time as referral giveaway).
          More tickets = higher chance to win!
        </Text>

        <View style={{ height: 20 }} />
      </ScrollView>
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
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  jackpotCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.gold,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  jackpotLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  jackpotAmount: {
    color: COLORS.gold,
    fontSize: 32,
    fontWeight: '700',
    marginVertical: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginVertical: SPACING.sm,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    width: '100%',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },
  infoValue: {
    color: COLORS.green,
    fontSize: 12,
  },
  walletLink: {
    color: COLORS.teal,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  cardSubtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepText: {
    color: COLORS.textMuted,
    fontSize: 12,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(88,166,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(88,166,255,0.3)',
    marginBottom: SPACING.xs,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  ticketBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(88,166,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketEmoji: {
    fontSize: 14,
  },
  entryWallet: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
  },
  entryStatus: {
    color: COLORS.green,
    fontSize: 8,
    fontWeight: '700',
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  entryTickets: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '700',
  },
  entryChance: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  winnerCard: {
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.gold,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  winnerTitle: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  winnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  winnerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(251,191,36,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerEmoji: {
    fontSize: 14,
  },
  winnerDetails: {
    flex: 1,
  },
  winnerWallet: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
  },
  winnerLabel: {
    color: COLORS.gold,
    fontSize: 8,
    fontWeight: '700',
  },
  winnerPrizeContainer: {
    alignItems: 'flex-end',
  },
  winnerPrize: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '700',
  },
  finePrint: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
});
