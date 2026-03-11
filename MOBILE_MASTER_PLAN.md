# CFL Mobile Seeker App - Master Plan

## Executive Summary

Convert the CFL Volatility Race web app into a native Android app optimized for Solana Mobile Seeker devices. The app will be publishable to the Solana dApp Store.

---

## Current State Analysis

### Existing Web App Architecture
```
Next.js 14 + React 18 + TypeScript
├── Frontend: React components with Tailwind CSS
├── Charts: Recharts (SVG-based)
├── State: Zustand stores (raceStore, appStore)
├── Wallet: @solana/wallet-adapter + @solana-mobile/wallet-adapter-mobile
├── Backend: Next.js API routes
├── Database: Supabase (PostgreSQL)
└── Price Feeds: Pyth Network + CFL SSE
```

### What Can Be Reused
| Layer | Reusability | Notes |
|-------|-------------|-------|
| Zustand Stores | 100% | Works identically in React Native |
| Business Logic | 100% | All hooks/services portable |
| API Routes | 100% | Keep as backend, call from mobile |
| Type Definitions | 100% | TypeScript types transfer directly |
| Wallet Logic | 80% | Replace adapter with MWA |
| UI Components | 20% | Need React Native reimplementation |
| Styling | 0% | Tailwind → StyleSheet conversion |
| Charts | 0% | Recharts → Victory Native or similar |

---

## Technology Stack for Mobile

### Core Framework
- **Expo SDK 54+** - Recommended by Solana Mobile
- **React Native** - Via Expo managed workflow
- **TypeScript** - Consistent with web codebase

### Solana Integration
- **@solana/web3.js** - Core Solana library
- **@solana-mobile/mobile-wallet-adapter-protocol** - MWA core
- **@solana-mobile/mobile-wallet-adapter-protocol-web3js** - web3.js wrapper

### UI & Visualization
- **React Native StyleSheet** - Native styling
- **Victory Native** or **react-native-gifted-charts** - Charting
- **React Navigation** - Navigation stack
- **Expo Router** (optional) - File-based routing

### Additional Dependencies
- **@react-native-async-storage/async-storage** - Auth token persistence
- **react-native-get-random-values** - Crypto polyfill
- **buffer** - Buffer polyfill
- **expo-crypto** - Secure random for Expo 49+

---

## Project Structure

```
/mobile                          # New mobile app directory
├── app/                         # Expo Router pages (or screens/)
│   ├── (tabs)/                  # Tab navigation
│   │   ├── race.tsx             # Main race dashboard
│   │   ├── jackpot.tsx          # Jackpot display
│   │   └── referral.tsx         # Referral page
│   ├── _layout.tsx              # Root layout with providers
│   └── index.tsx                # Entry redirect
│
├── components/                  # React Native components
│   ├── RaceChart.tsx            # Victory Native chart
│   ├── Leaderboard.tsx          # Token rankings
│   ├── SmartMovers.tsx          # Metric panels
│   ├── TopMovers.tsx            # Hourly movers
│   ├── AlertBadge.tsx           # Alert notifications
│   ├── TokenCard.tsx            # Token detail modal
│   ├── SubscriptionModal.tsx    # Payment flow
│   └── WalletButton.tsx         # MWA connect button
│
├── hooks/                       # Custom hooks (mostly copied)
│   ├── useRaceData.ts           # Race logic (adapted)
│   ├── useMobileWallet.ts       # MWA hook
│   └── useSubscription.ts       # Subscription status
│
├── services/                    # Business logic
│   ├── walletService.ts         # MWA authorization
│   ├── solanaService.ts         # RPC operations
│   ├── apiService.ts            # Backend API calls
│   └── priceService.ts          # Price fetching
│
├── store/                       # Zustand stores (copied)
│   ├── raceStore.ts             # Race state
│   └── appStore.ts              # UI state
│
├── types/                       # TypeScript types (copied)
│   └── index.ts
│
├── constants/                   # Configuration
│   ├── api.ts                   # API endpoints
│   ├── wallet.ts                # Wallet addresses
│   └── colors.ts                # Theme colors
│
├── utils/                       # Utilities
│   └── helpers.ts
│
├── app.json                     # Expo config
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── babel.config.js              # Babel config
├── metro.config.js              # Metro bundler config
└── eas.json                     # EAS Build config
```

---

## Implementation Phases

### Phase 1: Project Setup (Day 1)
- [ ] Initialize Expo project with Solana Mobile template
- [ ] Configure polyfills (buffer, crypto)
- [ ] Set up TypeScript configuration
- [ ] Install all dependencies
- [ ] Configure Metro bundler for web3.js compatibility
- [ ] Set up Android emulator with Mock Wallet

### Phase 2: Core Infrastructure (Days 2-3)
- [ ] Copy and adapt Zustand stores
- [ ] Copy type definitions
- [ ] Create API service for backend calls
- [ ] Implement MWA wallet service
- [ ] Set up navigation structure
- [ ] Create theme/styling constants

### Phase 3: Wallet Integration (Days 3-4)
- [ ] Implement `useMobileWallet` hook
- [ ] Create WalletButton component with MWA
- [ ] Test wallet connection flow
- [ ] Implement transaction signing
- [ ] Add auth token persistence

### Phase 4: Race Dashboard (Days 5-7)
- [ ] Create RaceChart with Victory Native
- [ ] Implement real-time price updates
- [ ] Build Leaderboard component
- [ ] Create SmartMovers panels (Hot/Momentum/Volatile/Trending)
- [ ] Build TopMovers (hourly)
- [ ] Add alert system

### Phase 5: Subscription System (Days 8-9)
- [ ] Create SubscriptionModal
- [ ] Implement payment flow via MWA
- [ ] Add subscription status checking
- [ ] Build PaywallGate equivalent

### Phase 6: Jackpot & Referral (Days 10-11)
- [ ] Build JackpotDisplay screen
- [ ] Create ReferralPage screen
- [ ] Implement entry submission
- [ ] Display winners/history

### Phase 7: Polish & Optimization (Days 12-14)
- [ ] Performance optimization
- [ ] Error handling & loading states
- [ ] Animations & transitions
- [ ] Dark theme refinement
- [ ] Accessibility improvements

### Phase 8: Testing & Release (Days 15+)
- [ ] Test on physical Seeker device
- [ ] Test with real wallets (Phantom, Solflare)
- [ ] Build release APK via EAS
- [ ] Prepare dApp Store submission
- [ ] Create promotional assets

---

## Key Technical Decisions

### 1. Navigation: Expo Router vs React Navigation
**Recommendation: Expo Router**
- File-based routing matches web mental model
- Better alignment with Next.js structure
- Built-in deep linking support

### 2. Charting Library
**Recommendation: Victory Native**
- Active maintenance
- Good performance
- Supports real-time updates
- Alternative: react-native-gifted-charts for simpler needs

### 3. State Management
**Decision: Keep Zustand**
- Already in use
- Works identically in React Native
- No migration needed

### 4. API Architecture
**Decision: Keep Next.js backend**
- No changes needed to API routes
- Mobile app calls same endpoints
- Consider edge functions for latency

### 5. Price Data
**Decision: Polling initially, SSE later**
- Start with HTTP polling (simpler)
- Add SSE/WebSocket support after MVP
- React Native supports both

---

## Mobile Wallet Adapter Implementation

### Core MWA Flow
```typescript
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

// Connect wallet
const connect = async () => {
  const authResult = await transact(async (wallet) => {
    const auth = await wallet.authorize({
      cluster: 'mainnet-beta',
      identity: {
        name: 'CFL Race',
        uri: 'https://cfl.gg',
        icon: 'favicon.ico',
      },
    });
    return auth;
  });
  // Store authResult.auth_token for reuse
};

// Sign and send transaction
const sendTransaction = async (tx: Transaction) => {
  await transact(async (wallet) => {
    const { signatures } = await wallet.signAndSendTransactions({
      transactions: [tx],
    });
    return signatures[0];
  });
};
```

### Auth Token Persistence
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store auth token
await AsyncStorage.setItem('mwa_auth_token', authResult.auth_token);

// Reuse in subsequent sessions
const storedToken = await AsyncStorage.getItem('mwa_auth_token');
await wallet.reauthorize({ auth_token: storedToken });
```

---

## Component Migration Strategy

### Example: Leaderboard Migration

**Web (React + Tailwind):**
```tsx
<div className="flex items-center gap-2 px-2 py-1 bg-cfl-card">
  <span className="font-pixel text-[8px] text-cfl-gold">{rank}</span>
  <Image src={logo} width={20} height={20} />
  <span className="text-white">{symbol}</span>
</div>
```

**Mobile (React Native + StyleSheet):**
```tsx
<View style={styles.row}>
  <Text style={styles.rank}>{rank}</Text>
  <Image source={{ uri: logo }} style={styles.logo} />
  <Text style={styles.symbol}>{symbol}</Text>
</View>

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, backgroundColor: '#161b22' },
  rank: { fontFamily: 'PressStart2P', fontSize: 8, color: '#fbbf24' },
  logo: { width: 20, height: 20, borderRadius: 10 },
  symbol: { color: '#fff' },
});
```

---

## Environment Setup Checklist

### Android Development
- [ ] Install Android Studio (Narwhal or later)
- [ ] Configure JDK 17 (required for Gradle)
- [ ] Create AVD with Android 14+ (API 34+)
- [ ] Enable developer mode with PIN/pattern lock
- [ ] Install Mock Wallet APK for testing

### Expo Setup
- [ ] Install Expo CLI: `npm install -g expo-cli`
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login to Expo: `expo login`
- [ ] Configure EAS: `eas build:configure`

### Testing Wallets
- [ ] Mock Wallet (development only)
- [ ] Phantom Mobile
- [ ] Solflare Mobile
- [ ] Backpack Mobile

---

## API Endpoints (No Changes Needed)

The mobile app will call the same backend APIs:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/tokens` | Fetch token list |
| `GET /api/race-prices` | Get current prices |
| `GET /api/subscription?wallet=X` | Check subscription |
| `POST /api/verify-payment` | Verify SOL payment |
| `GET /api/jackpot` | Get jackpot info |
| `POST /api/referral/enter` | Submit referral entry |

**Base URL Configuration:**
```typescript
const API_BASE = __DEV__
  ? 'http://10.0.2.2:3000/api'  // Android emulator localhost
  : 'https://cfl.gg/api';       // Production
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Chart performance issues | Medium | High | Use Victory Native with optimizations |
| MWA wallet compatibility | Low | High | Test with multiple wallets |
| Real-time data latency | Medium | Medium | Implement efficient polling |
| Build/signing issues | Medium | Medium | Use EAS Build from start |
| Seeker-specific bugs | Low | Medium | Test on actual device |

---

## Success Metrics

### MVP Definition
- [ ] Connect wallet via MWA
- [ ] View live race chart with 50+ tokens
- [ ] See leaderboard updating in real-time
- [ ] Purchase subscription (0.02 SOL)
- [ ] View jackpot information
- [ ] Submit referral entries

### Performance Targets
- App launch: < 3 seconds
- Price update latency: < 2 seconds
- Chart render: 60 FPS
- Memory usage: < 200MB
- Battery drain: Minimal impact

---

## Resources

### Official Documentation
- [Solana Mobile Docs](https://docs.solanamobile.com)
- [Expo dApp Setup](https://docs.solanamobile.com/react-native/expo)
- [MWA Tutorial](https://docs.solanamobile.com/react-native/first_app_tutorial)
- [Victory Native](https://formidable.com/open-source/victory/docs/native/)

### Sample Repositories
- [Solana Mobile dApp Scaffold](https://github.com/solana-mobile/solana-mobile-dapp-scaffold)
- [Solana Mobile Expo Template](https://github.com/solana-mobile/solana-mobile-expo-template)
- [Mobile Wallet Adapter](https://github.com/solana-mobile/mobile-wallet-adapter)

### QuickNode Guide
- [Build Solana Mobile App](https://www.quicknode.com/guides/solana-development/dapps/build-a-solana-mobile-app-on-android-with-react-native)

---

## Next Steps

1. **Approve this plan** - Review and confirm approach
2. **Create `/mobile` directory** - Initialize Expo project
3. **Set up development environment** - Android Studio + emulator
4. **Begin Phase 1** - Project scaffolding

---

*Plan created: March 2, 2026*
*Target completion: 2-3 weeks for MVP*
