import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import {
  SUBSCRIPTION_COST_SOL,
  TREASURY_WALLET,
  JACKPOT_WALLET,
  TREASURY_SPLIT_SOL,
  JACKPOT_SPLIT_SOL,
  VIP_ADDRESSES,
} from '../constants/wallet';
import { checkSubscription, verifyPayment } from '../services/apiService';
import { useWalletStore } from '../store/walletStore';

// Try to import Mobile Wallet Adapter - may not be available in Expo Go
let transact: any = null;
let Web3MobileWallet: any = null;
let hasMobileWallet = false;

try {
  const mwa = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  transact = mwa.transact;
  Web3MobileWallet = mwa.Web3MobileWallet;
  hasMobileWallet = true;
} catch (e) {
  console.log('Mobile Wallet Adapter not available (requires dev client build)');
}

// Import web3 for transactions
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';

interface Props {
  children: React.ReactNode;
}

type PaywallState = 'loading' | 'connect' | 'pay' | 'processing' | 'active';

const APP_IDENTITY = {
  name: 'CFL Race',
  uri: 'https://cfl.gg',
  icon: 'favicon.ico',
};

// RPC endpoint
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export function PaywallGate({ children }: Props) {
  const [state, setState] = useState<PaywallState>('loading');
  const [error, setError] = useState<string | null>(null);

  // Use wallet store for global state
  const {
    address: walletAddress,
    isVip,
    expiresAt,
    hasAccess: hasVerifiedAccess,
    setWallet,
    setSubscription,
    disconnect,
  } = useWalletStore();

  // Check if wallet is VIP
  const checkVip = (address: string) => {
    return VIP_ADDRESSES.includes(address);
  };

  // Check subscription status
  const checkSubscriptionStatus = useCallback(async (address: string) => {
    try {
      const data = await checkSubscription(address);

      if (data.active && (data.expiresAt || data.vip)) {
        const expiry = data.expiresAt ? new Date(data.expiresAt) : null;
        setSubscription(expiry, data.vip || false);
        setState('active');
      } else {
        setSubscription(null, false);
        setState('pay');
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
      setSubscription(null, false);
      setState('pay');
    }
  }, [setSubscription]);

  // Initial load - check for saved wallet
  useEffect(() => {
    // For now, start in connect state
    // In a full implementation, you'd check AsyncStorage for saved wallet
    setState('connect');
  }, []);

  // Check if subscription expired
  useEffect(() => {
    if (!expiresAt || isVip) return;

    const checkExpiry = () => {
      if (new Date() >= expiresAt) {
        setState('pay');
        setSubscription(null, false);
      }
    };

    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, isVip, setSubscription]);

  // Connect wallet using Mobile Wallet Adapter
  const handleConnect = async () => {
    setError(null);
    setState('loading');

    // Check if Mobile Wallet Adapter is available
    if (!hasMobileWallet || !transact) {
      // Mobile Wallet Adapter not available - user needs dev client build
      Alert.alert(
        'Wallet Required',
        'This app requires a Solana wallet. Please install Phantom, Solflare, or another Solana wallet app, then use the CFL Advantage dev client build.',
        [
          {
            text: 'OK',
            onPress: () => setState('connect'),
          },
        ]
      );
      return;
    }

    try {
      const authResult = await transact(async (wallet: any) => {
        const authorizationResult = await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: APP_IDENTITY,
        });
        return authorizationResult;
      });

      // Mobile Wallet Adapter returns address as base64-encoded bytes
      const account = authResult.accounts[0];
      let address: string;

      // The address field is base64-encoded public key bytes
      // We need to decode it and convert to base58
      try {
        // Decode base64 to bytes
        const addressBytes = Uint8Array.from(atob(account.address), c => c.charCodeAt(0));
        // Create PublicKey and get base58 string
        const pubkey = new PublicKey(addressBytes);
        address = pubkey.toBase58();
      } catch (e) {
        // Fallback: try using address directly if it's already base58
        console.log('Fallback: using address directly', account.address);
        address = account.address;
      }

      console.log('Connected wallet address:', address);
      setWallet(address);

      // Check if VIP
      if (checkVip(address)) {
        setSubscription(null, true);
        setState('active');
        return;
      }

      // Check subscription
      await checkSubscriptionStatus(address);
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError('Failed to connect wallet. Please try again.');
      setState('connect');
    }
  };

  // Handle payment
  const handlePay = async () => {
    if (!walletAddress) {
      handleConnect();
      return;
    }

    // Require Mobile Wallet Adapter for payments
    if (!hasMobileWallet || !transact) {
      Alert.alert(
        'Wallet Required',
        'Payment requires a Solana wallet. Please use the CFL Advantage dev client build with a wallet app installed.',
        [{ text: 'OK' }]
      );
      setState('pay');
      return;
    }

    setError(null);
    setState('processing');

    try {
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const fromPubkey = new PublicKey(walletAddress);
      const treasuryPubkey = new PublicKey(TREASURY_WALLET);
      const jackpotPubkey = new PublicKey(JACKPOT_WALLET);

      // Create transaction with two transfers
      const transaction = new Transaction();

      // Transfer to treasury (0.01 SOL)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: treasuryPubkey,
          lamports: TREASURY_SPLIT_SOL * 1_000_000_000,
        })
      );

      // Transfer to jackpot (0.01 SOL)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: jackpotPubkey,
          lamports: JACKPOT_SPLIT_SOL * 1_000_000_000,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Sign and send via Mobile Wallet Adapter
      const signature = await transact(async (wallet: any) => {
        // Re-authorize
        await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: APP_IDENTITY,
        });

        // Sign and send
        const signedTransactions = await wallet.signAndSendTransactions({
          transactions: [transaction],
        });

        return signedTransactions[0];
      });

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Verify with backend
      const result = await verifyPayment(walletAddress, signature);

      if (result.success) {
        // Refresh subscription status to get expiry time
        await checkSubscriptionStatus(walletAddress);
        setState('active');
      } else {
        setError('Payment verification failed. Please try again.');
        setState('pay');
      }
    } catch (err: any) {
      console.error('Payment failed:', err);
      setError(err.message || 'Transaction failed. Please try again.');
      setState('pay');
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setState('connect');
  };

  // Truncate address for display
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // If verified access, show the app
  if (hasVerifiedAccess && state === 'active') {
    return <>{children}</>;
  }

  // Loading state
  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Paywall screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoGold}>CFL</Text>
            <Text style={styles.logoTeal}>ADV</Text>
          </View>
          <Text style={styles.subtitle}>
            Real-time volatility racing for CFL tokens
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Connect State */}
          {state === 'connect' && (
            <>
              <Text style={styles.cardText}>
                Connect your wallet to access the race
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleConnect}>
                <Text style={styles.primaryButtonText}>CONNECT WALLET</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Pay State */}
          {state === 'pay' && walletAddress && (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Connected as</Text>
                <Text style={styles.infoValue}>{truncateAddress(walletAddress)}</Text>
              </View>

              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>24-Hour Access Pass</Text>
                <Text style={styles.priceValue}>{SUBSCRIPTION_COST_SOL} SOL</Text>
                <Text style={styles.priceNote}>
                  0.01 SOL goes to the jackpot pool
                </Text>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.payButton} onPress={handlePay}>
                <Text style={styles.payButtonText}>PAY {SUBSCRIPTION_COST_SOL} SOL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleDisconnect}
              >
                <Text style={styles.secondaryButtonText}>Disconnect</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkButton}
                onPress={() => checkSubscriptionStatus(walletAddress)}
              >
                <Text style={styles.checkButtonText}>ALREADY PAID? TAP HERE</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Processing State */}
          {state === 'processing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={COLORS.green} />
              <Text style={styles.processingText}>Processing payment...</Text>
              <Text style={styles.processingSubtext}>
                Please confirm in your wallet
              </Text>
            </View>
          )}
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pay once, race for 24 hours
          </Text>
          <Text style={styles.footerSubtext}>
            50% of payments go to weekly jackpot
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logoGold: {
    color: COLORS.gold,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
  },
  logoTeal: {
    color: COLORS.teal,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  cardText: {
    color: COLORS.text,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  infoBox: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  priceBox: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  priceLabel: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: SPACING.xs,
  },
  priceValue: {
    color: COLORS.gold,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  priceNote: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  errorBox: {
    backgroundColor: 'rgba(248,81,73,0.2)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(248,81,73,0.5)',
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  payButton: {
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  payButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  secondaryButtonText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  checkButton: {
    backgroundColor: 'rgba(88,166,255,0.2)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(88,166,255,0.5)',
    padding: SPACING.sm,
    alignItems: 'center',
  },
  checkButtonText: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '700',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  processingText: {
    color: COLORS.text,
    fontSize: 14,
    marginTop: SPACING.md,
  },
  processingSubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  footerSubtext: {
    color: COLORS.green,
    fontSize: 11,
    marginTop: 4,
  },
});
