# CFL (Crypto Fantasy League) System Analysis

## Complete Breakdown for Competitive Advantage

---

## Table of Contents
1. [Core Game Mechanics](#core-game-mechanics)
2. [Match Types & Win Conditions](#match-types--win-conditions)
3. [Player (Token) System](#player-token-system)
4. [Level & Multiplier Math](#level--multiplier-math)
5. [Squad Management](#squad-management)
6. [Progression & MMR System](#progression--mmr-system)
7. [Economic Systems](#economic-systems)
8. [10x Tournament](#10x-tournament)
9. [Exploitable Mechanics](#exploitable-mechanics)
10. [Optimal Strategies](#optimal-strategies)

---

## Core Game Mechanics

CFL is a fantasy sports-style game where **crypto tokens are your players**. You build a squad of 10 tokens and compete in matches where **real-time price performance** determines the winner.

### Key Insight
> The game is NOT about picking tokens that will moon. It's about picking tokens that will **outperform your opponent's tokens** during the specific match window.

---

## Match Types & Win Conditions

### Long Matches (Default)
- **Win Condition**: Highest portfolio gain wins
- **Calculation**: Sum of all token price changes × their multipliers
- **Strategy**: Pick volatile tokens with upside momentum

### Short Matches
- **Win Condition**: Largest LOSS gets inverted to positive score
- **Calculation**: If your portfolio drops -15%, your score = +15%
- **Strategy**: Pick tokens likely to dump during the match window

### Match Duration
- Matches have set time windows
- MagicBlock provides on-chain price verification at start/end
- No manipulation possible - prices are cryptographically verified

### Scoring Formula
```
Final Score = Σ (Token Price Change % × Level Multiplier)
```

For a Level 3 token (+10% multiplier) that gains 5%:
```
Score Contribution = 5% × 1.10 = 5.5%
```

---

## Player (Token) System

### Rarity Tiers
| Tier | Color | Availability | Base Stats |
|------|-------|--------------|------------|
| Bronze | Brown | Common | Standard |
| Silver | Gray | Uncommon | Improved |
| Gold | Yellow | Rare | High |
| Diamond | Blue | Ultra Rare | Maximum |

### Player Attributes
1. **Level** - Determines multiplier (1-5+)
2. **Multiplier** - Applied to price performance
3. **Rarity** - Affects card acquisition and possibly base stats
4. **Token Address** - The actual Solana token being tracked

### Card Acquisition
- **Booster Packs**: Random cards, various rarities
- **Direct Purchase**: Buy specific player cards from market
- **Pack Contents**: Vary by pack type and price

---

## Level & Multiplier Math

### Level Progression
| Level | Cards Needed | Cumulative Cards | Multiplier |
|-------|--------------|------------------|------------|
| 1 | 1 | 1 | 1.00x |
| 2 | 10 | 11 | 1.05x |
| 3 | 20 | 31 | 1.10x |
| 4 | 40 | 71 | 1.15x |
| 5 | 80 | 151 | 1.20x |

### Critical Insight
> Each level costs DOUBLE the previous level. The multiplier increase is LINEAR (+5% per level).
>
> **ROI Analysis**: Level 2 costs 10 cards for +5%. Level 3 costs 20 MORE cards for another +5%.
> The diminishing returns are severe after Level 2-3.

### Multiplier Impact Example
Match scenario: Token moves +10%

| Level | Multiplier | Final Score |
|-------|------------|-------------|
| 1 | 1.00x | 10.0% |
| 2 | 1.05x | 10.5% |
| 3 | 1.10x | 11.0% |
| 4 | 1.15x | 11.5% |
| 5 | 1.20x | 12.0% |

**The difference between Level 1 and Level 5 is only 2% on a 10% move.**

---

## Squad Management

### Squad Composition
- **10 Tokens** per squad
- All 10 contribute to final score
- **3 Substitutions** allowed per match

### Substitution Strategy
> Substitutions are your edge. You can swap out underperforming tokens MID-MATCH.

**When to Substitute:**
1. Token is moving against your position (dumping in Long match)
2. Token is flat while opponents are moving
3. You have intel on incoming pump/dump

### Formation System
- Currently TBA (To Be Announced)
- Will likely add positional bonuses
- Watch for this - early adopters of optimal formations will have advantage

### Coach System
- Currently TBD (To Be Determined)
- Expected to add passive bonuses
- Another potential edge when released

---

## Progression & MMR System

### Trophy Road
- Linear progression system
- Earn trophies from wins
- Unlock rewards at milestones
- **Seasonal Reset**: Trophies reset each season

### MMR (Match Making Rating)
- Hidden skill rating
- Determines opponent matching
- Higher MMR = tougher opponents

### Bracket System
| Bracket | MMR Range | Bet Requirement |
|---------|-----------|-----------------|
| Bronze | 0-500 | Optional |
| Silver | 500-1000 | Small SOL |
| Gold | 1000-1500 | Medium SOL |
| Diamond | 1500+ | Large SOL |

### Critical Insight
> **MMR Manipulation**: If you can control your MMR, you can face easier opponents while still earning rewards.
>
> Consider: Strategic losses to lower MMR before high-stakes tournaments.

---

## Economic Systems

### Booster Packs
- Random card distribution
- Multiple pack tiers (different prices)
- Higher tier = better odds of rare cards
- **Expected Value varies by pack type**

### Player Market
- Buy/Sell player cards directly
- Price determined by supply/demand
- **Arbitrage opportunity**: Pack EV vs Market prices

### Match Betting
- SOL wagered on match outcomes
- Winner takes pot (minus fees)
- Higher brackets = mandatory betting

### Seasonal Rewards
- End of season payouts based on:
  - Final trophy count
  - Leaderboard position
  - MMR bracket

---

## 10x Tournament

### Structure
- **10 Players** enter
- **Same SOL wager** from each
- **Winner takes ALL** (10x return)

### Key Details
- Single elimination or round-robin (TBD)
- Highest combined score wins
- All normal match rules apply

### Strategy
> This is HIGH VARIANCE. You need to maximize upside, not consistency.
>
> In 10x, pick the most volatile tokens possible. A safe 5% gain loses to a lucky 50% moon.

---

## Exploitable Mechanics

### 1. Multiplier Efficiency
**Exploit**: Focus leveling on tokens you use MOST, not equally across all.

A Level 3 token you use every match > Level 1 tokens you never field.

### 2. Substitution Timing
**Exploit**: Watch price feeds during match. Substitute BEFORE dumps complete, not after.

The 3-sub limit means you need to be selective. Save subs for catastrophic moves.

### 3. Short Match Edge
**Exploit**: In Short matches, pick tokens with:
- Recent pump (due for correction)
- Low liquidity (easier to dump)
- Negative news catalyst

Most players think "Long" by default. Short match specialists are rare.

### 4. MMR Gaming
**Exploit**: Intentionally lose matches at season end if you're borderline for next bracket.

Lower bracket = easier opponents = higher win rate = more total rewards.

### 5. Pack vs Market Arbitrage
**Exploit**: Calculate pack Expected Value:
```
Pack EV = Σ (Card Value × Drop Rate) for all possible cards
```

If Pack EV > Pack Price, buy packs.
If Pack EV < Pack Price, buy singles from market.

### 6. Volatility Timing
**Exploit**: Match during high-volatility windows:
- Token unlock events
- Major announcements
- Market opens (if applicable)

Higher volatility = higher score differentials = multipliers matter more.

### 7. Meta Gaming
**Exploit**: Track what tokens other top players are using.

If everyone uses the same tokens, matches become coin flips. Diversify to create edge.

### 8. Early Bracket Grinding
**Exploit**: At season start, grind hard before MMR stabilizes.

Early matches have wider skill gaps = easier wins = faster trophy accumulation.

---

## Optimal Strategies

### Squad Building Priority
1. **Diversify volatility profiles** - Mix stable + volatile tokens
2. **Level up your core 5-6** - Don't spread cards thin
3. **Keep 2-3 "specialists"** - Short match dumps, moonshot plays

### Match Preparation
1. Check token momentum (1h, 4h, 24h trends)
2. Check for catalysts (unlocks, news, listings)
3. Set substitution triggers before match starts

### Resource Allocation
1. **Early Season**: Grind matches, ignore pack purchases
2. **Mid Season**: Evaluate pack EV, level key players
3. **Late Season**: Push for bracket thresholds, ignore sunk costs

### Tournament Play (10x)
1. Maximum volatility squad
2. All-in on momentum plays
3. No "safe" picks - you need to WIN, not place

### Long-Term Edge
1. Track your win rate by token
2. Identify your best performers
3. Double down on what works, cut what doesn't

---

## Token Watchlist for Race Tracker

Based on CFL mechanics, track these metrics:

| Metric | Why It Matters |
|--------|----------------|
| 5min Volume | Indicates active trading |
| Price Velocity | Shows momentum direction |
| Buy/Sell Ratio | Predicts short-term direction |
| Large Txns | Whale activity signals |

### High-Value Signals
- **Sudden volume spike** = Incoming volatility
- **Buy ratio > 60%** = Bullish pressure
- **Large sells** = Potential dump (good for Short matches)

---

## Summary: The Meta

1. **Multipliers are marginal** - Don't over-invest in leveling
2. **Substitutions are king** - Master the 3-sub limit
3. **Short matches are underplayed** - Specialize here for edge
4. **Volatility wins tournaments** - Safe plays lose to moon shots
5. **MMR is gameable** - Strategic losses have value
6. **Track everything** - Data creates edge over time

---

## Next Steps for Race Tracker App

To make this tracker useful for CFL gameplay:

1. **Real-time buy/sell ratio** - Critical for momentum reads
2. **Volume alerts** - Notify on sudden spikes
3. **Price velocity** - Not just price, but rate of change
4. **Whale tracking** - Large transaction alerts
5. **Historical performance** - Win rate by token in YOUR matches

---

*Document compiled from CFL GitBook documentation*
*https://crypto-fantasy-league.gitbook.io/crypto-fantasy-league/*
