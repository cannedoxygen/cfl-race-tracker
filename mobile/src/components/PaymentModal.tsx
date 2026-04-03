import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
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

// Try to import Mobile Wallet Adapter
let transact: any = null;
let hasMobileWallet = false;

try {
  const mwa = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  transact = mwa.transact;
  hasMobileWallet = true;
} catch (e) {
  console.log('Mobile Wallet Adapter not available');
}

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ModalState = 'connect' | 'pay' | 'processing';

const APP_IDENTITY = {
  name: 'CFL ADV',
  uri: 'https://cfl.gg',
  icon: 'favicon.ico',
};

const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export function PaymentModal({ visible, onClose, onSuccess }: Props) {
  const [state, setState] = useState<ModalState>('connect');
  const [error, setError] = useState<string | null>(null);

  const {
    address: walletAddress,
    setWallet,
    setSubscription,
  } = useWalletStore();

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const checkVip = (address: string) => {
    return VIP_ADDRESSES.includes(address);
  };

  const checkSubscriptionStatus = async (address: string) => {
    try {
      const data = await checkSubscription(address);
      if (data.active && (data.expiresAt || data.vip)) {
        const expiry = data.expiresAt ? new Date(data.expiresAt) : null;
        setSubscription(expiry, data.vip || false);
        onSuccess();
        onClose();
      } else {
        setSubscription(null, false);
        setState('pay');
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
      setSubscription(null, false);
      setState('pay');
    }
  };

  const handleConnect = async () => {
    setError(null);

    if (!hasMobileWallet || !transact) {
      Alert.alert(
        'Dev Client Required',
        'Mobile Wallet Adapter requires a custom dev client. Continue in demo mode?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Demo Mode',
            onPress: () => {
              setWallet('demo-wallet');
              setSubscription(new Date(Date.now() + 24 * 60 * 60 * 1000), false);
              onSuccess();
              onClose();
            },
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

      const account = authResult.accounts[0];
      let address: string;

      try {
        const addressBytes = Uint8Array.from(atob(account.address), c => c.charCodeAt(0));
        const pubkey = new PublicKey(addressBytes);
        address = pubkey.toBase58();
      } catch (e) {
        address = account.address;
      }

      console.log('Connected wallet:', address);
      setWallet(address);

      if (checkVip(address)) {
        setSubscription(null, true);
        onSuccess();
        onClose();
        return;
      }

      await checkSubscriptionStatus(address);
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const handlePay = async () => {
    if (!walletAddress) {
      handleConnect();
      return;
    }

    if (walletAddress === 'demo-wallet' || !hasMobileWallet) {
      setSubscription(new Date(Date.now() + 24 * 60 * 60 * 1000), false);
      onSuccess();
      onClose();
      return;
    }

    setError(null);
    setState('processing');

    try {
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const fromPubkey = new PublicKey(walletAddress);
      const treasuryPubkey = new PublicKey(TREASURY_WALLET);
      const jackpotPubkey = new PublicKey(JACKPOT_WALLET);

      const transaction = new Transaction();

      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: treasuryPubkey,
          lamports: TREASURY_SPLIT_SOL * 1_000_000_000,
        })
      );

      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: jackpotPubkey,
          lamports: JACKPOT_SPLIT_SOL * 1_000_000_000,
        })
      );

      transaction.feePayer = fromPubkey;

      const signature = await transact(async (wallet: any) => {
        await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: APP_IDENTITY,
        });

        // Get blockhash right before signing so it doesn't expire
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        const signedTransactions = await wallet.signAndSendTransactions({
          transactions: [transaction],
        });

        return signedTransactions[0];
      });

      await connection.confirmTransaction(signature, 'confirmed');

      const result = await verifyPayment(walletAddress, signature);

      if (result.success) {
        await checkSubscriptionStatus(walletAddress);
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

  const handleClose = () => {
    setState('connect');
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoGold}>CFL</Text>
              <Text style={styles.logoTeal}>ADV</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          {/* Connect State */}
          {state === 'connect' && !walletAddress && (
            <>
              <Text style={styles.title}>Connect to Race</Text>
              <Text style={styles.subtitle}>
                Connect your wallet to start the race
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleConnect}>
                <Text style={styles.primaryButtonText}>CONNECT WALLET</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Pay State */}
          {(state === 'pay' || (state === 'connect' && walletAddress)) && walletAddress && (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Connected as</Text>
                <Text style={styles.infoValue}>{truncateAddress(walletAddress)}</Text>
              </View>

              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>24-Hour Access Pass</Text>
                <Text style={styles.priceValue}>{SUBSCRIPTION_COST_SOL} SOL</Text>
                <Text style={styles.priceNote}>
                  0.05 SOL goes to the jackpot pool
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

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pay once, race for 24 hours</Text>
            <Text style={styles.footerSubtext}>50% goes to weekly jackpot</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 340,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoContainer: {
    flexDirection: 'row',
  },
  logoGold: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  logoTeal: {
    color: COLORS.teal,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  closeButton: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
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
    marginBottom: SPACING.md,
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
  checkButton: {
    backgroundColor: 'rgba(88,166,255,0.2)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(88,166,255,0.5)',
    padding: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.md,
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
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  footerSubtext: {
    color: COLORS.green,
    fontSize: 10,
    marginTop: 4,
  },
});
