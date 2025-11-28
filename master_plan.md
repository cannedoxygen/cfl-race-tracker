You are an expert Solana + TypeScript + React/React Native engineer and product designer.

You are building a **companion app** for **Crypto Fantasy League (CFL)**, optimized for the **Solana Seeker phone** (Solana Mobile) and also runnable as a web app.

The project is called:

> **CLF Crypto Fantasy League – Volatility Race Companion**

It is NOT a generic crypto dashboard. It is SPECIFICALLY designed as a tool for CFL players to see which CFL tokens are the most volatile *right now* and visualize them as a real-time “racing” chart.

--------------------------------
## 1. Context (crypto + CFL + Seeker)
--------------------------------

Before doing anything, briefly research and internalize:

- **Crypto Fantasy League (CFL)**:
  - A “fantasy sports for crypto tokens” game: users draft a **token squad** and compete in PvP contests based on **real-time market movements** of those tokens.
  - Runs on **Solana**, built for **Solana Mobile / Seeker**, and uses on-chain infra (MagicBlock, etc.). :contentReference[oaicite:0]{index=0}
  - CFL has multiple game modes (PvP, tournaments, winner-takes-all, etc.) where token performance matters a lot.

- **Solana Seeker / Solana Mobile**:
  - Seeker is Solana’s second-gen phone featuring the **Solana dApp Store** and a growing set of mobile-first dApps, including CFL itself. :contentReference[oaicite:1]{index=1}

Use that context to shape product decisions, UI, and technical stack. This companion app should feel like a **native Seeker dApp**: fast, dark-mode first, tactile, and tuned for one-thumb use.

Do NOT output your research; just use it to inform your design.

--------------------------------
## 2. High-Level Product Definition
--------------------------------

You are building a **live “Volatility Race” companion** for CFL:

- The app **ingests the token list used by CFL** (I will provide or you will design a way to plug in a token list).
- It **fetches real-time market data** for only those tokens (price, volume, % change over short windows).
- It **computes a “volatility score”** for each token at this exact moment.
- It **renders a live racing chart** where:
  - Each token is represented by a **colored line** and a **tiny circular token-logo marker** racing upward.
  - The higher the volatility, the faster / higher the line moves.
- It also shows a **live leaderboard** of tokens ranked by volatility.

Think of it as: **“horse racing but the horses are CFL tokens, and the track is volatility.”**

This is a **companion tool**:
- CFL players open CFL to play.
- They open this app on Seeker to see **which tokens are currently going crazy**, in a single glance.

--------------------------------
## 3. Core Requirements
--------------------------------

### 3.1 Token Input

Design the system so the CFL token list can be provided as:

- A simple JSON file like:
  ```json
  [
    {
      "symbol": "SOL",
      "mint": "<SOL_MINT>",
      "logoURI": "https://...",
      "name": "Solana"
    },
    {
      "symbol": "BONK",
      "mint": "<BONK_MINT>",
      "logoURI": "https://...",
      "name": "Bonk"
    }
  ]
OR a configurable source (e.g., environment variable pointing to a URL).

You do NOT need to actually scrape CFL for the list; just design the app so it expects a CFL-style token list and can easily be wired up later.

3.2 Data Fetching (Real-Time Market Data)
Use Solana token price APIs like (you can pick, but you must wire at least one):

Birdeye Public API (good for volume & short-interval changes).

Jupiter Price API for fast price snapshots.

Implement:

Fetch current price for each token.

Fetch 1m % change and 5m % change (or compute from history if the API doesn’t expose it directly).

Optionally fetch:

Short window volume (1–5m).

Liquidity or market cap (if available).

Implement robust:

Error handling (retry, backoff, fallback).

Rate-limit awareness (respect API limits).

Local caching so the UI doesn’t spam the API.

3.3 Volatility Score
Define and implement a volatility score per token.

Start with this formula (you may refine but must explain if you do):

text
Copy code
volatility_score =
    abs(percent_change_1m) * 0.6
  + abs(percent_change_5m) * 0.4
  + (stddev_last_10m * 0.2)
Where:

percent_change_1m and percent_change_5m are % changes over those windows.

stddev_last_10m is the standard deviation of price over the last ~10 minutes (approximate this if needed based on sampled data).

Normalize / scale values so that the chart is visually readable.

Update data every 10 seconds (configurable).

3.4 Visualization – “Volatility Race” Chart
Create a live animated chart with these properties:

Racing Lines

Each token gets:

A unique line color.

A circular marker at the current point.

The marker should:

Display the token logo inside (16–24px circle).

Follow the line as it moves.

Lines should be smoothly animated (easing / lerp) between updates instead of jumping.

Axes / Layout

X-axis: time (rolling window, e.g. last 5–10 minutes).

Y-axis: volatility score (or normalized score).

Optionally provide a toggle between:

“Absolute volatility”

“% change 1m”

“% change 5m”

Leaderboard

On the side or bottom (depending on screen size) show:

Token logo

Symbol

Volatility score

1m % change

5m % change

Sort descending by volatility.

Update in sync with chart updates.

Interactivity

Tap on a token in the leaderboard to highlight its line on the chart.

Tap on a token logo bubble on the chart to show a small tooltip (latest stats).

3.5 Mobile-First UX (Seeker)
Design for portrait, one-handed use on Seeker:

Dark theme.

Minimal clutter.

Large touch targets.

Smooth 60fps animation.

The layout should adapt:

On small screens (Seeker):

Chart on top.

Leaderboard below.

On wider screens (tablet / web):

Chart on the left.

Leaderboard as a vertical list on the right.

4. Technical Stack Requirements
4.1 Frontend
You MUST choose a stack and commit to it. Prefer:

React + Next.js for web, and

React Native / Expo for mobile,

OR one unified Expo + React Native Web approach if you want a single codebase.

Whichever you choose, you must:

Use TypeScript.

Use a modern charting approach:

e.g., Recharts, VisX, React Native SVG + D3 logic, or a canvas-based custom solution.

Implement state management with either:

React Query / TanStack Query (for data fetching), or

A lightweight global store (Zustand, Redux Toolkit, or simple context).

4.2 Backend (Optional)
Prefer fully client-side where possible.

If you decide a backend is needed (for aggregation / caching / secret API keys), use:

Node.js + TypeScript (Express or Next.js API routes).

Backend responsibilities (if used):

Periodically fetch price data for all CFL tokens.

Compute volatility scores server-side.

Serve a clean /api/volatility endpoint for the frontend.

Enforce API rate limits.

Explain your decision: purely client-side vs. thin backend.

4.3 Configuration & Secrets
Design:

.env file support for:

API keys (Birdeye, etc.).

CFL token list URL (optional).

Document exactly how to configure:

Example .env.local / .env file.

Where to plug in token lists.

5. Architecture & Code Output
You MUST output a complete, runnable project with:

Project structure

A full folder tree.

package.json with all dependencies.

Scripts (dev, build, start).

Core files

Main app entry.

Components:

VolatilityRaceChart

Leaderboard

TokenSelector (if any)

Layout (mobile-first)

Hooks / services:

useTokenPrices

useVolatilityScores

Types:

Token, TokenMetadata, PricePoint, VolatilityScore, etc.

Styling

A dark-theme design:

Background: near-black, subtle gradient.

Tokens: vibrant accent colors.

Use Tailwind, CSS Modules, or Styled Components (pick one and be consistent).

Example Data

Provide a small example CFL token list JSON file.

Provide mocked response samples if necessary.

Instructions

Exact commands to:

Install dependencies.

Run locally.

Build for production.

Notes on:

How to plug in real API keys.

How to replace the example token list with CFL’s real token list.

6. Visual & Brand Style
Style direction:

Dark Solana aesthetic:

Deep navy / black background.

Neon-like accent colors (purple, cyan, magenta).

Tokens as small glowing circles with their logos.

Motion feels like a race:

Lines “climb” as volatility increases.

Subtle easing to make it feel alive without being chaotic.

Optional but nice:

A small CFL badge (“Powered by CFL”) somewhere in the UI.

A small “Seeker” badge or indication this is tuned for Solana Mobile.

7. Output Format & Constraints
When responding:

Do NOT just explain the idea.
You MUST output:

The architecture overview.

The project structure.

The full TypeScript code for:

Frontend app.

Any backend/API routes (if you choose to use them).

The example token list JSON.

The run instructions.

The response should be long and complete.
Do NOT shorten for brevity.
Do NOT summarize instead of giving code.

Use clear section headers so I can copy pieces easily.

Assume I’m comfortable with Node, TypeScript, and React, but I want everything scaffolded and ready to paste into a repo.

8. Final Task
Using everything above:

Propose the stack (Next.js-only, Expo-only, or Expo + Web).

Design the architecture.

Output the entire codebase (or as close as possible in one response).

Include a short “Next Steps” section describing how I can:

Deploy this to a web host.

Package it as a Seeker-ready dApp (high-level steps).

Do NOT ask me questions.
Make reasonable assumptions and ship a full solution.

pgsql
Copy code

If you want, I can now also give you a **second monster prompt** specifically aimed at “turn this into a polished Seeker dApp UI only” (no backend), for a separate design/model run.
::contentReference[oaicite:2]{index=2}