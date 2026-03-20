import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { supabase } from './supabase';
import { SOLANA_RPC_ENDPOINT } from './wallet';
import { getCurrentWeekId } from './referral';

const RENT_BUFFER_LAMPORTS = 5000; // Keep enough for rent-exempt minimum

interface JackpotUser {
  wallet_address: string;
  subscription_count: number;
}

interface DrawingResult {
  success: boolean;
  message: string;
  winner?: string;
  prize?: number;
  prizeSol?: number;
  txSignature?: string;
  weekId?: string;
  dbError?: string;
}

// Get the jackpot wallet keypair from env
function getJackpotKeypair(): Keypair {
  const privateKey = process.env.JACKPOT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('JACKPOT_PRIVATE_KEY env var not set');
  }
  const decoded = bs58.decode(privateKey);
  return Keypair.fromSecretKey(decoded);
}

// Get on-chain balance of the jackpot wallet
export async function getJackpotBalance(): Promise<number> {
  const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');
  const keypair = getJackpotKeypair();
  const balance = await connection.getBalance(keypair.publicKey);
  return balance;
}

// Pick a random winner weighted by ticket count (entries since last drawing)
export async function pickWinner(): Promise<JackpotUser | null> {
  // Get the most recent drawing to find entries created AFTER it
  const recentDrawing = await getRecentDrawing();
  let entryCutoff: string;

  if (recentDrawing?.drawnAt) {
    entryCutoff = new Date(recentDrawing.drawnAt).toISOString();
    console.log('Jackpot pickWinner: Looking for subscriptions since last drawing:', entryCutoff);
  } else {
    // No previous drawing, use week start as fallback
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - dayOfWeek);
    weekStart.setUTCHours(0, 0, 0, 0);
    entryCutoff = weekStart.toISOString();
    console.log('Jackpot pickWinner: No previous drawing, using week start:', entryCutoff);
  }

  // Count subscriptions per wallet since last drawing
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('wallet_address')
    .gt('created_at', entryCutoff);

  if (error || !subscriptions || subscriptions.length === 0) {
    console.log('Jackpot pickWinner: No subscriptions found for this week');
    return null;
  }

  // Count tickets per wallet
  const ticketCounts: Record<string, number> = {};
  for (const sub of subscriptions) {
    ticketCounts[sub.wallet_address] = (ticketCounts[sub.wallet_address] || 0) + 1;
  }

  // Convert to array for selection
  const users: JackpotUser[] = Object.entries(ticketCounts).map(([wallet, count]) => ({
    wallet_address: wallet,
    subscription_count: count,
  }));

  console.log('Jackpot pickWinner: Found', users.length, 'eligible wallets with', subscriptions.length, 'total tickets this week');

  // Weighted random: more tickets = higher chance
  const totalTickets = users.reduce((sum, u) => sum + u.subscription_count, 0);
  let random = Math.random() * totalTickets;

  for (const user of users) {
    random -= user.subscription_count;
    if (random <= 0) {
      return user;
    }
  }

  // Fallback to last user
  return users[users.length - 1];
}

// Send SOL from jackpot wallet to winner
export async function sendPayout(
  winnerWallet: string,
  lamports: number
): Promise<string> {
  const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');
  const keypair = getJackpotKeypair();
  const recipientPubkey = new PublicKey(winnerWallet);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: recipientPubkey,
      lamports,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
  return signature;
}

// Record drawing result to database
export async function recordDrawing(
  weekId: string,
  winnerWallet: string,
  winnerTickets: number,
  totalTickets: number,
  prizeLamports: number,
  txSignature: string | null
): Promise<{ success: boolean; error?: string }> {
  console.log('Recording jackpot drawing:', {
    weekId,
    winnerWallet,
    winnerTickets,
    totalTickets,
    prizeLamports,
    txSignature,
  });

  // Try insert first
  const { data, error } = await supabase
    .from('jackpot_drawings')
    .insert({
      week_id: weekId,
      winner_wallet: winnerWallet,
      winner_tickets: winnerTickets,
      total_tickets: totalTickets,
      prize_lamports: prizeLamports,
      prize_sol: prizeLamports / LAMPORTS_PER_SOL,
      tx_signature: txSignature,
      status: txSignature ? 'paid' : 'failed',
    })
    .select();

  if (error) {
    console.error('Failed to record jackpot drawing:', JSON.stringify(error));

    // If it's a duplicate key error, try to update instead
    if (error.code === '23505') {
      console.log('Drawing already exists, updating...');
      const { data: updateData, error: updateError } = await supabase
        .from('jackpot_drawings')
        .update({
          winner_wallet: winnerWallet,
          winner_tickets: winnerTickets,
          total_tickets: totalTickets,
          prize_lamports: prizeLamports,
          prize_sol: prizeLamports / LAMPORTS_PER_SOL,
          tx_signature: txSignature,
          status: txSignature ? 'paid' : 'failed',
        })
        .eq('week_id', weekId)
        .select();

      if (updateError) {
        console.error('Failed to update jackpot drawing:', JSON.stringify(updateError));
        return { success: false, error: `Supabase update error: ${updateError.message}` };
      }
      console.log('Jackpot drawing updated successfully:', updateData);
      return { success: true };
    }

    return { success: false, error: `Supabase error: ${error.message} (code: ${error.code})` };
  }

  console.log('Jackpot drawing recorded successfully:', data);
  return { success: true };
}

// Get the most recent jackpot drawing
export async function getRecentDrawing() {
  const { data, error } = await supabase
    .from('jackpot_drawings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    weekId: data.week_id,
    winnerWallet: data.winner_wallet,
    winnerTickets: data.winner_tickets,
    totalTickets: data.total_tickets,
    prizeSol: Number(data.prize_sol),
    txSignature: data.tx_signature,
    status: data.status,
    drawnAt: data.created_at,
  };
}

// Get all jackpot drawings (history)
export async function getAllDrawings() {
  const { data, error } = await supabase
    .from('jackpot_drawings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(row => ({
    weekId: row.week_id,
    winnerWallet: row.winner_wallet,
    winnerTickets: row.winner_tickets,
    totalTickets: row.total_tickets,
    prizeSol: Number(row.prize_sol),
    txSignature: row.tx_signature,
    status: row.status,
    drawnAt: row.created_at,
  }));
}

// Full draw + payout flow
export async function performJackpotDraw(): Promise<DrawingResult> {
  const weekId = getCurrentWeekId();

  // Check if already drawn this week
  const { data: existing } = await supabase
    .from('jackpot_drawings')
    .select('id')
    .eq('week_id', weekId)
    .single();

  if (existing) {
    return { success: false, message: `Already drawn for ${weekId}` };
  }

  // Pick winner
  const winner = await pickWinner();
  if (!winner) {
    return { success: false, message: 'No eligible users found' };
  }

  // Get total tickets for stats (entries since last drawing)
  const recentDrawingForStats = await getRecentDrawing();
  let statsCutoff: string;

  if (recentDrawingForStats?.drawnAt) {
    statsCutoff = new Date(recentDrawingForStats.drawnAt).toISOString();
  } else {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - dayOfWeek);
    weekStart.setUTCHours(0, 0, 0, 0);
    statsCutoff = weekStart.toISOString();
  }

  const { data: weekSubs } = await supabase
    .from('subscriptions')
    .select('wallet_address')
    .gt('created_at', statsCutoff);
  const totalTickets = weekSubs?.length ?? 0;

  // Get on-chain balance - this is the source of truth
  let balance: number;
  try {
    balance = await getJackpotBalance();
  } catch (err) {
    console.error('Failed to get jackpot balance:', err);
    return { success: false, message: 'Failed to get jackpot balance' };
  }

  // Payout = wallet balance minus rent buffer (pay out everything available)
  const payoutAmount = balance - RENT_BUFFER_LAMPORTS;
  if (payoutAmount <= 0) {
    return { success: false, message: `Insufficient balance: have ${balance} lamports, need more than ${RENT_BUFFER_LAMPORTS}` };
  }

  // Send payout
  let txSignature: string | null = null;
  try {
    txSignature = await sendPayout(winner.wallet_address, payoutAmount);
    console.log(`Jackpot payout sent: ${txSignature}`);
  } catch (err) {
    console.error('Payout failed:', err);
    // Record the failed attempt
    await recordDrawing(weekId, winner.wallet_address, winner.subscription_count, totalTickets, payoutAmount, null);
    return { success: false, message: `Payout transaction failed: ${err}` };
  }

  // Record success
  const recordResult = await recordDrawing(weekId, winner.wallet_address, winner.subscription_count, totalTickets, payoutAmount, txSignature);
  if (!recordResult.success) {
    console.error('Failed to record drawing after successful payout:', recordResult.error);
    // Still return success since payout went through, but include the error
    return {
      success: true,
      message: `Winner: ${winner.wallet_address} (WARNING: DB record failed: ${recordResult.error})`,
      winner: winner.wallet_address,
      prize: payoutAmount,
      prizeSol: payoutAmount / LAMPORTS_PER_SOL,
      txSignature,
      weekId,
      dbError: recordResult.error,
    };
  }

  // Note: No need to reset anything - entries are filtered by last drawing time
  // New entries after this drawing will be the next pool

  return {
    success: true,
    message: `Winner: ${winner.wallet_address}`,
    winner: winner.wallet_address,
    prize: payoutAmount,
    prizeSol: payoutAmount / LAMPORTS_PER_SOL,
    txSignature,
    weekId,
  };
}
