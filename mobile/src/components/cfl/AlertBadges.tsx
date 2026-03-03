import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface Alert {
  id: string;
  type: 'big_mover' | 'momentum_shift' | 'leader_change';
  symbol: string;
  message: string;
  timestamp: number;
}

interface Props {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

const ALERT_INFO: Record<Alert['type'], { title: string; description: string; emoji: string }> = {
  big_mover: {
    title: 'Big Mover',
    description: 'A token just made a significant price move. Great for catching sudden pumps or dumps.',
    emoji: '📈',
  },
  leader_change: {
    title: 'Leader Change',
    description: 'A new token has taken the #1 spot in the race. The leaderboard just shifted!',
    emoji: '🏆',
  },
  momentum_shift: {
    title: 'Momentum Shift',
    description: "A token's momentum has changed direction - it was going up and now going down, or vice versa.",
    emoji: '🔄',
  },
};

export function AlertBadges({ alerts, onDismiss }: Props) {
  const [showInfo, setShowInfo] = useState(false);

  if (alerts.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info button */}
        <TouchableOpacity style={styles.infoButton} onPress={() => setShowInfo(true)}>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </TouchableOpacity>

        {/* Alert badges */}
        {alerts.slice(0, 5).map((alert) => {
          const info = ALERT_INFO[alert.type];
          return (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.badge,
                alert.type === 'big_mover' && styles.badgeBigMover,
                alert.type === 'leader_change' && styles.badgeLeaderChange,
                alert.type === 'momentum_shift' && styles.badgeMomentumShift,
              ]}
              onPress={() => setShowInfo(true)}
            >
              <Text style={styles.badgeEmoji}>{info.emoji}</Text>
              <Text style={styles.badgeSymbol}>{alert.symbol}</Text>
              <TouchableOpacity
                onPress={() => onDismiss(alert.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.dismissIcon}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Info Modal */}
      <Modal visible={showInfo} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowInfo(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>RACE ALERTS</Text>

            {Object.entries(ALERT_INFO).map(([type, info]) => (
              <View key={type} style={styles.infoRow}>
                <Text style={styles.infoEmoji}>{info.emoji}</Text>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>{info.title}</Text>
                  <Text style={styles.infoDescription}>{info.description}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.modalButton} onPress={() => setShowInfo(false)}>
              <Text style={styles.modalButtonText}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.xs,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(48,54,61,0.5)',
    borderRadius: 4,
  },
  infoIcon: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeBigMover: {
    backgroundColor: 'rgba(251,191,36,0.2)',
  },
  badgeLeaderChange: {
    backgroundColor: 'rgba(168,85,247,0.2)',
  },
  badgeMomentumShift: {
    backgroundColor: 'rgba(88,166,255,0.2)',
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeSymbol: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  dismissIcon: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.purple,
    padding: SPACING.lg,
    maxWidth: 320,
    width: '100%',
  },
  modalTitle: {
    color: COLORS.purple,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  infoEmoji: {
    fontSize: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoDescription: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  modalButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
  },
  modalButtonText: {
    color: COLORS.purple,
    fontSize: 10,
    fontWeight: '700',
  },
});
