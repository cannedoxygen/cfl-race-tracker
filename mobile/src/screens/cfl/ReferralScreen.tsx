import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { fetchReferralEntries, submitReferralEntry } from '../../services/apiService';
import { ReferralEntry } from '../../types';

const REFERRAL_CODE = 'LPG8Y6L';

export function ReferralScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<ReferralEntry[]>([]);

  // Form state
  const [cflUsername, setCflUsername] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');

  const loadEntries = useCallback(async () => {
    const data = await fetchReferralEntries();
    setEntries(data);
    setIsLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEntries();
  }, []);

  const handleSubmit = async () => {
    if (!cflUsername.trim()) {
      Alert.alert('Error', 'Please enter your CFL username');
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);

    const result = await submitReferralEntry({
      cflUsername: cflUsername.trim(),
      discordUsername: discordUsername.trim() || undefined,
      twitterHandle: twitterHandle.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      Alert.alert('Success!', 'You have been entered into this week\'s drawing!');
      setCflUsername('');
      setDiscordUsername('');
      setTwitterHandle('');
      loadEntries();
    } else {
      Alert.alert('Error', result.message || 'Failed to submit entry');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🎁</Text>
          <Text style={styles.title}>WEEKLY REFERRAL DRAWING</Text>
          <Text style={styles.subtitle}>Free entry! Drawing every Friday</Text>
        </View>

        {/* Referral Code Display */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>REFERRAL CODE</Text>
          <Text style={styles.codeValue}>{REFERRAL_CODE}</Text>
          <Text style={styles.codeHint}>
            Use this code when signing up on CFL
          </Text>
        </View>

        {/* Entry Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>ENTER THIS WEEK'S DRAWING</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CFL Username *</Text>
            <TextInput
              style={styles.input}
              value={cflUsername}
              onChangeText={setCflUsername}
              placeholder="Your CFL username"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Discord Username (optional)</Text>
            <TextInput
              style={styles.input}
              value={discordUsername}
              onChangeText={setDiscordUsername}
              placeholder="username#1234"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Twitter Handle (optional)</Text>
            <TextInput
              style={styles.input}
              value={twitterHandle}
              onChangeText={setTwitterHandle}
              placeholder="@username"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Text style={styles.submitButtonText}>ENTER DRAWING</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Current Entries */}
        <View style={styles.entriesCard}>
          <Text style={styles.entriesTitle}>
            THIS WEEK'S ENTRIES ({entries.length})
          </Text>

          {entries.length === 0 ? (
            <Text style={styles.noEntries}>No entries yet. Be the first!</Text>
          ) : (
            entries.slice(0, 10).map((entry, index) => (
              <View key={entry.id} style={styles.entryRow}>
                <Text style={styles.entryRank}>#{index + 1}</Text>
                <Text style={styles.entryUsername}>{entry.cflUsername}</Text>
                {entry.twitterHandle && (
                  <Text style={styles.entrySocial}>@{entry.twitterHandle}</Text>
                )}
              </View>
            ))
          )}

          {entries.length > 10 && (
            <Text style={styles.moreEntries}>
              +{entries.length - 10} more entries
            </Text>
          )}
        </View>
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
  emoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  codeCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.orange,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  codeLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  codeValue: {
    color: COLORS.orange,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
    marginVertical: SPACING.sm,
  },
  codeHint: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  formTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.text,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  entriesCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  entriesTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
  },
  noEntries: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  entryRank: {
    color: COLORS.textMuted,
    fontSize: 11,
    width: 30,
  },
  entryUsername: {
    color: COLORS.text,
    fontSize: 12,
    flex: 1,
  },
  entrySocial: {
    color: COLORS.teal,
    fontSize: 11,
  },
  moreEntries: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
