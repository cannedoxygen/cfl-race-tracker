import { supabase } from './supabase';

export interface Subscription {
  id: string;
  wallet_address: string;
  expires_at: string;
  tx_signature: string;
  amount_lamports: number;
  created_at: string;
}

export interface User {
  wallet_address: string;
  subscription_count: number;
  total_paid_lamports: number;
  first_seen: string;
  last_seen: string;
}

export interface Jackpot {
  id: number;
  total_lamports: number;
  last_updated: string;
}

// Check if a wallet has an active subscription
export async function checkSubscription(walletAddress: string): Promise<{
  active: boolean;
  expiresAt: string | null;
}> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('expires_at')
    .eq('wallet_address', walletAddress)
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { active: false, expiresAt: null };
  }

  return { active: true, expiresAt: data.expires_at };
}

// Get current jackpot total
export async function getJackpotTotal(): Promise<number> {
  const { data, error } = await supabase
    .from('jackpot')
    .select('total_lamports')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return 0;
  }

  return data.total_lamports;
}

// Get top users by subscription count
export async function getTopUsers(limit = 10): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('subscription_count', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data;
}

// Record a new subscription (called by API after verifying payment)
export async function recordSubscription(
  walletAddress: string,
  txSignature: string,
  amountLamports: number,
  expiresAt: Date
): Promise<boolean> {
  // Insert subscription record
  const { error: subError } = await supabase.from('subscriptions').insert({
    wallet_address: walletAddress,
    tx_signature: txSignature,
    amount_lamports: amountLamports,
    expires_at: expiresAt.toISOString(),
  });

  if (subError) {
    console.error('Failed to insert subscription:', subError);
    return false;
  }

  // Upsert user record
  const { error: userError } = await supabase.from('users').upsert(
    {
      wallet_address: walletAddress,
      subscription_count: 1,
      total_paid_lamports: amountLamports,
      last_seen: new Date().toISOString(),
    },
    {
      onConflict: 'wallet_address',
      ignoreDuplicates: false,
    }
  );

  // If user exists, increment their count
  if (userError) {
    // Try updating existing user
    await supabase
      .from('users')
      .update({
        subscription_count: supabase.rpc('increment_subscription_count', {
          wallet: walletAddress,
        }),
        total_paid_lamports: supabase.rpc('increment_total_paid', {
          wallet: walletAddress,
          amount: amountLamports,
        }),
        last_seen: new Date().toISOString(),
      })
      .eq('wallet_address', walletAddress);
  }

  // Update jackpot (add 0.01 SOL = 10,000,000 lamports)
  const { error: jackpotError } = await supabase.rpc('increment_jackpot', {
    amount: 10_000_000,
  });

  if (jackpotError) {
    console.error('Failed to update jackpot:', jackpotError);
  }

  return true;
}

// Convert lamports to SOL for display
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

// Format SOL amount for display
export function formatSol(lamports: number): string {
  const sol = lamportsToSol(lamports);
  return sol.toFixed(sol < 1 ? 4 : 2);
}
