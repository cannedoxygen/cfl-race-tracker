import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { useWalletStore } from '../store/walletStore';

export function SubscriptionTimer() {
  const { expiresAt, isVip } = useWalletStore();
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--');
  const [isLow, setIsLow] = useState(false);

  // Update countdown every second
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('--:--:--');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );

      // Warn when less than 1 hour
      setIsLow(hours < 1);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // VIP badge
  if (isVip) {
    return (
      <View style={[styles.container, styles.vipContainer]}>
        <Text style={styles.vipText}>VIP</Text>
      </View>
    );
  }

  // No subscription
  if (!expiresAt) return null;

  return (
    <View style={[styles.container, isLow && styles.lowContainer]}>
      <View style={[styles.dot, isLow ? styles.dotLow : styles.dotNormal]} />
      <Text style={[styles.timeText, isLow && styles.timeTextLow]}>
        {timeLeft}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  lowContainer: {
    borderColor: COLORS.red,
  },
  vipContainer: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderColor: COLORS.gold,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotNormal: {
    backgroundColor: COLORS.green,
  },
  dotLow: {
    backgroundColor: COLORS.red,
  },
  timeText: {
    color: COLORS.green,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  timeTextLow: {
    color: COLORS.red,
  },
  vipText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
