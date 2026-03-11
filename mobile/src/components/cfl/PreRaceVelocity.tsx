import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { RacePosition } from '../../types';

interface Props {
  positions: RacePosition[];
  selectedToken: string | null;
  onSelectToken: (mint: string | null) => void;
}

interface VelocityData {
  mint: string;
  symbol: string;
  logoURI: string;
  color: string;
  velocity: number;
  direction: 'accelerating' | 'decelerating' | 'steady';
  change: number;
}

interface TokenHistory {
  changes: number[];
  timestamps: number[];
}

const WINDOW_SIZE = 15; // 30 seconds at 2s updates

export function PreRaceVelocity({ positions, selectedToken, onSelectToken }: Props) {
  const [topVelocity, setTopVelocity] = useState<VelocityData[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const historyRef = useRef<Map<string, TokenHistory>>(new Map());

  useEffect(() => {
    if (positions.length === 0) return;

    const now = Date.now();

    // Update history
    positions.forEach(pos => {
      const existing = historyRef.current.get(pos.mint);
      const currentChange = pos.position;

      if (existing) {
        const newChanges = [...existing.changes, currentChange];
        const newTimestamps = [...existing.timestamps, now];

        while (newChanges.length > WINDOW_SIZE) {
          newChanges.shift();
          newTimestamps.shift();
        }

        historyRef.current.set(pos.mint, {
          changes: newChanges,
          timestamps: newTimestamps,
        });
      } else {
        historyRef.current.set(pos.mint, {
          changes: [currentChange],
          timestamps: [now],
        });
      }
    });

    // Calculate velocity for each token
    const velocities = positions.map(pos => {
      const history = historyRef.current.get(pos.mint);
      if (!history || history.changes.length < 3) {
        return { pos, velocity: 0, direction: 'steady' as const, rawVelocity: 0 };
      }

      const changes = history.changes;
      const timestamps = history.timestamps;

      const timeDelta = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
      const changeDelta = changes[changes.length - 1] - changes[0];
      const velocity = timeDelta > 0 ? changeDelta / timeDelta : 0;

      let direction: 'accelerating' | 'decelerating' | 'steady' = 'steady';
      if (changes.length >= 6) {
        const mid = Math.floor(changes.length / 2);
        const firstHalfVelocity = (changes[mid] - changes[0]) / mid;
        const secondHalfVelocity = (changes[changes.length - 1] - changes[mid]) / (changes.length - mid);

        if (Math.abs(secondHalfVelocity) > Math.abs(firstHalfVelocity) * 1.2) {
          direction = 'accelerating';
        } else if (Math.abs(secondHalfVelocity) < Math.abs(firstHalfVelocity) * 0.8) {
          direction = 'decelerating';
        }
      }

      return { pos, velocity: Math.abs(velocity), direction, rawVelocity: velocity };
    });

    velocities.sort((a, b) => b.velocity - a.velocity);

    const top5 = velocities.slice(0, 5).map(({ pos, velocity, direction, rawVelocity }) => ({
      mint: pos.mint,
      symbol: pos.symbol,
      logoURI: pos.logoURI,
      color: pos.color,
      velocity: rawVelocity,
      direction,
      change: pos.position,
    } as VelocityData));

    setTopVelocity(top5);
  }, [positions]);

  const getDirectionIcon = (direction: string, velocity: number) => {
    if (direction === 'accelerating') return velocity >= 0 ? '⬆⬆' : '⬇⬇';
    if (direction === 'decelerating') return '→';
    return velocity >= 0 ? '⬆' : '⬇';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setShowInfo(true)}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>⚡</Text>
          <Text style={styles.title}>PRE-RACE VELOCITY</Text>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </View>
        <Text style={styles.timeframe}>30s</Text>
      </TouchableOpacity>

      {topVelocity.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>TRACKING...</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {topVelocity.map((token, index) => {
            const isSelected = selectedToken === token.mint;
            const isPositive = token.velocity >= 0;

            return (
              <TouchableOpacity
                key={token.mint}
                style={[
                  styles.row,
                  index === 0 && styles.rowFirst,
                  isSelected && styles.rowSelected,
                ]}
                onPress={() => onSelectToken(isSelected ? null : token.mint)}
              >
                <Text style={[styles.rank, index === 0 && styles.rankFirst]}>
                  {index + 1}
                </Text>

                <View style={[styles.logoContainer, { borderColor: token.color }]}>
                  {typeof token.logoURI === 'string' && token.logoURI.length > 0 ? (
                    <Image source={{ uri: token.logoURI }} style={styles.logo} />
                  ) : (
                    <Text style={[styles.logoFallback, { color: token.color }]}>
                      {token.symbol.slice(0, 2)}
                    </Text>
                  )}
                </View>

                <Text style={styles.symbol} numberOfLines={1}>{token.symbol}</Text>

                <Text style={[
                  styles.directionIcon,
                  isPositive ? styles.textGreen : styles.textRed
                ]}>
                  {getDirectionIcon(token.direction, token.velocity)}
                </Text>

                <Text style={[styles.velocity, isPositive ? styles.textGreen : styles.textRed]}>
                  {isPositive ? '+' : ''}{(token.velocity * 10).toFixed(2)}/s
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Modal visible={showInfo} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowInfo(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PRE-RACE VELOCITY</Text>
            <Text style={styles.modalText}>
              Shows which tokens are moving fastest RIGHT NOW. High velocity = likely to continue in race. ⬆⬆ = accelerating, → = slowing down.
            </Text>
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
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    color: COLORS.teal,
    fontSize: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  infoIcon: {
    color: COLORS.textMuted,
    fontSize: 8,
  },
  timeframe: {
    color: COLORS.textMuted,
    fontSize: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,17,23,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(48,54,61,0.5)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  rowFirst: {
    borderColor: 'rgba(45,212,191,0.5)',
  },
  rowSelected: {
    borderColor: COLORS.pink,
    borderWidth: 2,
  },
  rank: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    width: 16,
    textAlign: 'center',
  },
  rankFirst: {
    color: COLORS.teal,
  },
  logoContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 6,
  },
  logo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  logoFallback: {
    fontSize: 7,
    fontWeight: '700',
  },
  symbol: {
    flex: 1,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '500',
  },
  directionIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  velocity: {
    fontSize: 10,
    fontWeight: '600',
    width: 55,
    textAlign: 'right',
  },
  textGreen: {
    color: COLORS.green,
  },
  textRed: {
    color: COLORS.red,
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
    borderColor: COLORS.teal,
    padding: SPACING.lg,
    maxWidth: 300,
  },
  modalTitle: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  modalText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  modalButton: {
    alignSelf: 'flex-start',
  },
  modalButtonText: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '700',
  },
});
