import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import {
  TREASURY_ADDRESS,
  JACKPOT_ADDRESS,
  TREASURY_AMOUNT_LAMPORTS,
  JACKPOT_AMOUNT_LAMPORTS,
  SUBSCRIPTION_DURATION_MS,
  SOLANA_RPC_ENDPOINT,
} from '@/lib/wallet';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, txSignature } = body;

    console.log('verify-payment: Starting verification for', walletAddress, txSignature);

    if (!walletAddress || !txSignature) {
      console.log('verify-payment: Missing params');
      return NextResponse.json(
        { error: 'Missing walletAddress or txSignature' },
        { status: 400 }
      );
    }

    // Check if this transaction was already processed
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('tx_signature', txSignature)
      .single();

    if (existing) {
      console.log('verify-payment: Tx already processed, returning success');
      // Return success if already processed - user is already subscribed
      return NextResponse.json({ success: true, alreadyProcessed: true });
    }

    // Verify the transaction on-chain
    const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');

    // Wait a moment for transaction to be confirmed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });

    // Retry once if not found (RPC might be slow)
    if (!tx) {
      console.log('verify-payment: Tx not found, retrying in 3s...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      tx = await connection.getParsedTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
      });
    }

    if (!tx) {
      console.log('verify-payment: Tx still not found after retry');
      return NextResponse.json(
        { error: 'Transaction not found. Please wait a moment and tap "ALREADY PAID?"' },
        { status: 400 }
      );
    }

    if (tx.meta?.err) {
      console.log('verify-payment: Tx failed on-chain:', tx.meta.err);
      return NextResponse.json(
        { error: 'Transaction failed' },
        { status: 400 }
      );
    }

    // Verify the transaction contains correct transfers
    const instructions = tx.transaction.message.instructions;
    let treasuryTransferFound = false;
    let jackpotTransferFound = false;

    console.log('verify-payment: Checking', instructions.length, 'instructions');

    for (const ix of instructions) {
      if ('parsed' in ix && ix.parsed?.type === 'transfer') {
        const info = ix.parsed.info;
        const lamports = info.lamports;
        const destination = info.destination;

        console.log('verify-payment: Found transfer to', destination, 'amount', lamports);

        // Check treasury transfer (allow small variance for fees)
        if (
          destination === TREASURY_ADDRESS.toBase58() &&
          lamports >= TREASURY_AMOUNT_LAMPORTS - 1000
        ) {
          treasuryTransferFound = true;
        }

        // Check jackpot transfer
        if (
          destination === JACKPOT_ADDRESS.toBase58() &&
          lamports >= JACKPOT_AMOUNT_LAMPORTS - 1000
        ) {
          jackpotTransferFound = true;
        }
      }
    }

    console.log('verify-payment: treasury=', treasuryTransferFound, 'jackpot=', jackpotTransferFound);

    if (!treasuryTransferFound || !jackpotTransferFound) {
      return NextResponse.json(
        { error: 'Invalid payment: missing required transfers' },
        { status: 400 }
      );
    }

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date(Date.now() + SUBSCRIPTION_DURATION_MS);

    // Record subscription
    const { error: subError } = await supabase.from('subscriptions').insert({
      wallet_address: walletAddress,
      tx_signature: txSignature,
      amount_lamports: TREASURY_AMOUNT_LAMPORTS + JACKPOT_AMOUNT_LAMPORTS,
      expires_at: expiresAt.toISOString(),
    });

    if (subError) {
      console.error('Failed to insert subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to record subscription' },
        { status: 500 }
      );
    }

    // Upsert user record
    const { data: existingUser } = await supabase
      .from('users')
      .select('subscription_count, total_paid_lamports')
      .eq('wallet_address', walletAddress)
      .single();

    if (existingUser) {
      // Update existing user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_count: existingUser.subscription_count + 1,
          total_paid_lamports:
            existingUser.total_paid_lamports +
            TREASURY_AMOUNT_LAMPORTS +
            JACKPOT_AMOUNT_LAMPORTS,
          last_seen: new Date().toISOString(),
        })
        .eq('wallet_address', walletAddress);

      if (updateError) {
        console.error('Failed to update user:', updateError);
      }
    } else {
      // Insert new user
      const { error: insertError } = await supabase.from('users').insert({
        wallet_address: walletAddress,
        subscription_count: 1,
        total_paid_lamports: TREASURY_AMOUNT_LAMPORTS + JACKPOT_AMOUNT_LAMPORTS,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      });

      if (insertError) {
        console.error('Failed to insert user:', insertError);
      }
    }

    // Update jackpot total
    const { data: jackpotData, error: jackpotFetchError } = await supabase
      .from('jackpot')
      .select('total_lamports')
      .eq('id', 1)
      .single();

    if (jackpotFetchError) {
      console.error('Failed to fetch jackpot:', jackpotFetchError);
      // Try to create the row if it doesn't exist
      const { error: insertJackpotError } = await supabase.from('jackpot').insert({
        id: 1,
        total_lamports: JACKPOT_AMOUNT_LAMPORTS,
        last_updated: new Date().toISOString(),
      });
      if (insertJackpotError) {
        console.error('Failed to create jackpot row:', insertJackpotError);
      }
    } else if (jackpotData) {
      const { error: updateJackpotError } = await supabase
        .from('jackpot')
        .update({
          total_lamports: jackpotData.total_lamports + JACKPOT_AMOUNT_LAMPORTS,
          last_updated: new Date().toISOString(),
        })
        .eq('id', 1);

      if (updateJackpotError) {
        console.error('Failed to update jackpot:', updateJackpotError);
      }
    }

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
