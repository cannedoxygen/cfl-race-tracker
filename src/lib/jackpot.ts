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

// Pick a random winner weighted by ticket count
export async function pickWinner(): Promise<JackpotUser | null> {
  const { data: users, error } = await supabase
    .from('users')
    .select('wallet_address, subscription_count')
    .gt('subscription_count', 0);

  if (error || !users || users.length === 0) {
    return null;
  }

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
): Promise<void> {
  const { error } = await supabase
    .from('jackpot_drawings')
    .upsert({
      week_id: weekId,
      winner_wallet: winnerWallet,
      winner_tickets: winnerTickets,
      total_tickets: totalTickets,
      prize_lamports: prizeLamports,
      prize_sol: prizeLamports / LAMPORTS_PER_SOL,
      tx_signature: txSignature,
      status: txSignature ? 'paid' : 'failed',
    }, { onConflict: 'week_id' });

  if (error) {
    console.error('Failed to record jackpot drawing:', error);
  }
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

  // Get total tickets for stats
  const { data: allUsers } = await supabase
    .from('users')
    .select('subscription_count')
    .gt('subscription_count', 0);
  const totalTickets = allUsers?.reduce((sum, u) => sum + u.subscription_count, 0) ?? 0;

  // Payout = total tickets × 0.01 SOL (only what was earned from entries)
  const JACKPOT_PER_TICKET_LAMPORTS = 10_000_000; // 0.01 SOL
  const payoutAmount = totalTickets * JACKPOT_PER_TICKET_LAMPORTS;
  if (payoutAmount <= 0) {
    return { success: false, message: 'No tickets to pay out' };
  }

  // Verify on-chain balance covers the payout
  let balance: number;
  try {
    balance = await getJackpotBalance();
  } catch (err) {
    console.error('Failed to get jackpot balance:', err);
    return { success: false, message: 'Failed to get jackpot balance' };
  }

  if (balance < payoutAmount + RENT_BUFFER_LAMPORTS) {
    return { success: false, message: `Insufficient balance: have ${balance} lamports, need ${payoutAmount + RENT_BUFFER_LAMPORTS}` };
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
  await recordDrawing(weekId, winner.wallet_address, winner.subscription_count, totalTickets, payoutAmount, txSignature);

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
