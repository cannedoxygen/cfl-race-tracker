import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { RaceStatus } from '../../types';

interface Props {
  status: RaceStatus;
  elapsedTime: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function RaceControls({ status, elapsedTime, onStart, onPause, onReset }: Props) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Timer Display */}
      <View style={styles.timerContainer}>
        <View
          style={[
            styles.statusDot,
            status === 'racing' && styles.statusDotRacing,
            status === 'paused' && styles.statusDotPaused,
          ]}
        />
        <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        {status === 'idle' && (
          <TouchableOpacity style={styles.playButton} onPress={onStart}>
            <Text style={styles.playIcon}>▶</Text>
            <Text style={styles.buttonText}>PLAY</Text>
          </TouchableOpacity>
        )}

        {status === 'racing' && (
          <TouchableOpacity style={styles.pauseButton} onPress={onPause}>
            <Text style={styles.pauseIcon}>⏸</Text>
            <Text style={styles.buttonTextDark}>PAUSE</Text>
          </TouchableOpacity>
        )}

        {status === 'paused' && (
          <TouchableOpacity style={styles.playButton} onPress={onStart}>
            <Text style={styles.playIcon}>▶</Text>
            <Text style={styles.buttonText}>RESUME</Text>
          </TouchableOpacity>
        )}

        {(status === 'racing' || status === 'paused') && (
          <TouchableOpacity style={styles.resetButton} onPress={onReset}>
            <Text style={styles.resetIcon}>↻</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
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
    fontVariant: ['tabular-nums'],
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  resetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  playIcon: {
    color: COLORS.text,
    fontSize: 12,
  },
  pauseIcon: {
    color: '#000',
    fontSize: 12,
  },
  resetIcon: {
    color: COLORS.text,
    fontSize: 14,
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
});
