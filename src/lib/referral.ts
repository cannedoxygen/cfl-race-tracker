import { supabase } from './supabase';
import { ReferralEntry, WeeklyDrawing } from '@/types';

export const REFERRAL_CODE = 'LPG8Y6L';

// Get the current week ID (ISO week format: YYYY-WXX)
export function getCurrentWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

// Get next Friday at noon (drawing time)
export function getNextDrawingTime(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;

  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  nextFriday.setHours(12, 0, 0, 0);

  // If it's Friday but past noon, go to next Friday
  if (dayOfWeek === 5 && now.getHours() >= 12) {
    nextFriday.setDate(nextFriday.getDate() + 7);
  }

  return nextFriday;
}

// Add a new entry
export async function addEntry(
  cflUsername: string,
  discordUsername?: string,
  twitterHandle?: string
): Promise<{ success: boolean; message: string; entry?: ReferralEntry }> {
  const weekId = getCurrentWeekId();

  // Check if user already entered this week
  const { data: existing } = await supabase
    .from('referral_entries')
    .select('id')
    .eq('cfl_username', cflUsername.toLowerCase())
    .eq('week_id', weekId)
    .single();

  if (existing) {
    return { success: false, message: 'You have already entered this week\'s drawing!' };
  }

  const { data, error } = await supabase
    .from('referral_entries')
    .insert({
      cfl_username: cflUsername,
      discord_username: discordUsername || null,
      twitter_handle: twitterHandle || null,
      week_id: weekId,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return { success: false, message: 'Failed to submit entry. Please try again.' };
  }

  const entry: ReferralEntry = {
    id: data.id,
    cflUsername: data.cfl_username,
    discordUsername: data.discord_username,
    twitterHandle: data.twitter_handle,
    enteredAt: new Date(data.created_at).getTime(),
    weekId: data.week_id,
  };

  return { success: true, message: 'Successfully entered the drawing!', entry };
}

// Get entries for current week
export async function getCurrentWeekEntries(): Promise<ReferralEntry[]> {
  const weekId = getCurrentWeekId();

  const { data, error } = await supabase
    .from('referral_entries')
    .select('*')
    .eq('week_id', weekId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('No entries found for week:', weekId);
    return [];
  }

  return data.map(row => ({
    id: row.id,
    cflUsername: row.cfl_username,
    discordUsername: row.discord_username,
    twitterHandle: row.twitter_handle,
    enteredAt: new Date(row.created_at).getTime(),
    weekId: row.week_id,
  }));
}

// Perform the weekly drawing
export async function performDrawing(): Promise<{ success: boolean; message: string; winner?: ReferralEntry }> {
  const weekId = getCurrentWeekId();
  const currentWeekEntries = await getCurrentWeekEntries();

  if (currentWeekEntries.length === 0) {
    return { success: false, message: 'No entries for this week!' };
  }

  // Random selection
  const winnerIndex = Math.floor(Math.random() * currentWeekEntries.length);
  const winner = currentWeekEntries[winnerIndex];

  // Create drawing record
  const { error } = await supabase
    .from('weekly_drawings')
    .insert({
      week_id: weekId,
      winner_id: winner.id,
      winner_username: winner.cflUsername,
      entry_count: currentWeekEntries.length,
      prize: '50% of weekly referral fees',
    });

  if (error) {
    console.error('Supabase drawing error:', error);
    return { success: false, message: 'Failed to record drawing result.' };
  }

  return { success: true, message: `Winner selected: ${winner.cflUsername}!`, winner };
}

// Take a snapshot of all referrals' earnings for the current week
// Called when the raffle runs - becomes the baseline for next week
export async function takeEarningsSnapshot(
  weekId: string,
  referrals: Array<{ username: string; referralEarnings: number }>
): Promise<{ success: boolean; count: number }> {
  if (referrals.length === 0) return { success: true, count: 0 };

  const rows = referrals.map(r => ({
    week_id: weekId,
    cfl_username: r.username.toLowerCase(),
    referral_earnings: r.referralEarnings,
  }));

  const { error } = await supabase
    .from('referral_snapshots')
    .upsert(rows, { onConflict: 'week_id,cfl_username' });

  if (error) {
    console.error('Snapshot insert error:', error);
    return { success: false, count: 0 };
  }

  return { success: true, count: rows.length };
}

// Get the most recent snapshot (last week's baseline)
// Returns a map of username -> earnings at snapshot time
export async function getLatestSnapshot(): Promise<Map<string, number>> {
  const currentWeek = getCurrentWeekId();

  // Get the most recent snapshot that is NOT the current week
  // (we want last week's snapshot as the baseline)
  const { data, error } = await supabase
    .from('referral_snapshots')
    .select('week_id')
    .neq('week_id', currentWeek)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return new Map();
  }

  const lastWeekId = data[0].week_id;

  const { data: snapshots, error: snapError } = await supabase
    .from('referral_snapshots')
    .select('cfl_username, referral_earnings')
    .eq('week_id', lastWeekId);

  if (snapError || !snapshots) {
    return new Map();
  }

  const map = new Map<string, number>();
  for (const row of snapshots) {
    map.set(row.cfl_username, Number(row.referral_earnings));
  }
  return map;
}

// Get past drawings
export async function getPastDrawings(): Promise<WeeklyDrawing[]> {
  const { data, error } = await supabase
    .from('weekly_drawings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Supabase fetch drawings error:', error);
    return [];
  }

  return data.map(row => ({
    weekId: row.week_id,
    entries: [],
    winner: {
      id: row.winner_id,
      cflUsername: row.winner_username,
      enteredAt: 0,
      weekId: row.week_id,
    },
    drawnAt: new Date(row.created_at).getTime(),
    prize: row.prize,
  }));
}
