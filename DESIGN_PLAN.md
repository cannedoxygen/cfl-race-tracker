# CFL Race Tracker - Design Overhaul Plan

## Goal
Match CFL's pixel art aesthetic with retro game vibes, vibrant colors, and chunky UI elements.

---

## 1. COLOR PALETTE

### Primary Colors (from CFL)
```css
--cfl-bg-dark: #0d1117;        /* Deep dark background */
--cfl-card: #161b22;           /* Card/panel background */
--cfl-border: #30363d;         /* Subtle borders */

/* Accents */
--cfl-green: #3fb950;          /* Success, positive */
--cfl-teal: #58a6ff;           /* Info, links */
--cfl-purple: #a855f7;         /* Premium, special */
--cfl-orange: #f97316;         /* CTA, highlights */
--cfl-gold: #fbbf24;           /* Money, prizes, rewards */
--cfl-red: #f85149;            /* Negative, shorts */
--cfl-pink: #ec4899;           /* Accents */

/* Text */
--cfl-text: #ffffff;           /* Primary text */
--cfl-text-muted: #8b949e;     /* Secondary text */
--cfl-text-gold: #fcd34d;      /* Prize amounts */
```

### Gradient Accents
```css
--gradient-gold: linear-gradient(135deg, #f59e0b, #fbbf24);
--gradient-green: linear-gradient(135deg, #059669, #10b981);
--gradient-red: linear-gradient(135deg, #dc2626, #ef4444);
--gradient-purple: linear-gradient(135deg, #7c3aed, #a855f7);
```

---

## 2. TYPOGRAPHY

### Pixel Fonts (Google Fonts)
- **Headings**: "Press Start 2P" - authentic pixel game font
- **Body/UI**: "VT323" or "Silkscreen" - readable pixel font
- **Numbers/Stats**: "Press Start 2P" for that retro feel

### Implementation
```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&family=Silkscreen&display=swap');

font-family: 'VT323', monospace;        /* Body text */
font-family: 'Press Start 2P', cursive; /* Headings, numbers */
```

---

## 3. UI COMPONENTS

### Buttons
- Chunky, pill-shaped with pixel borders
- Bright colored backgrounds
- Hover: slight scale + glow effect
- Active: pressed-in shadow effect

### Cards/Panels
- Rounded corners (12-16px)
- Semi-transparent dark backgrounds
- Subtle pixel-style borders
- Inner shadow for depth

### Badges/Pills
- Small rounded pills for status
- Icon + text combo
- Glowing effect for active states

### Progress Bars
- Chunky pixel-style
- Animated fill
- Color coded (green/red/gold)

---

## 4. SPECIFIC COMPONENT UPDATES

### Header
- [ ] Add pixel-style logo/icon
- [ ] Chunky pill buttons for navigation
- [ ] Gold text for money displays
- [ ] Pixel font for title
- [ ] Add SOL balance display like CFL's top bar

### Race Chart
- [ ] Pixel-style grid lines
- [ ] Chunky token lines
- [ ] Retro color scheme for tokens
- [ ] Pixel-art token icons (if available)
- [ ] Gold sparkle effects for leaders

### Leaderboard
- [ ] Pixel borders on rows
- [ ] Trophy icons for top 3
- [ ] Gold/silver/bronze highlights
- [ ] Animated rank changes
- [ ] Pixel avatars

### Referral Page
- [ ] Pixel-art decorative elements
- [ ] Gold prize display with sparkles
- [ ] Chunky entry cards
- [ ] Trophy/reward icons
- [ ] Retro countdown timer

---

## 5. ANIMATIONS & EFFECTS

### Hover Effects
```css
.cfl-button:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
}
```

### Glow Effects
```css
.gold-glow {
  text-shadow: 0 0 10px #fbbf24, 0 0 20px #f59e0b;
}

.active-glow {
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
}
```

### Pixel Transitions
- Slightly "stepped" animations
- Quick, snappy transitions (150-200ms)
- Scale bounces on interactions

---

## 6. ICONS & ASSETS

### Replace with pixel-style icons
- Trophy (gold pixel trophy)
- Timer (pixel clock)
- Play/Pause (chunky pixel buttons)
- Currency (SOL icon, pixel style)
- Chart indicators (pixel arrows)

### Sources
- Custom pixel art
- 8-bit style icon libraries
- CFL's own assets (if permitted for fan projects)

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Colors & Typography
1. Update Tailwind config with CFL colors
2. Add Google Fonts imports
3. Apply new color palette globally
4. Update text styles

### Phase 2: Core Components
1. Restyle Header with new aesthetic
2. Update buttons and interactive elements
3. Restyle cards and panels
4. Add pixel borders/effects

### Phase 3: Data Displays
1. Restyle race chart
2. Update leaderboard design
3. Restyle referral page
4. Add trophy/reward visuals

### Phase 4: Polish
1. Add animations and transitions
2. Implement glow effects
3. Add pixel art decorations
4. Final color tweaks

---

## 8. TAILWIND CONFIG UPDATES

```javascript
// tailwind.config.js additions
module.exports = {
  theme: {
    extend: {
      colors: {
        'cfl-bg': '#0d1117',
        'cfl-card': '#161b22',
        'cfl-border': '#30363d',
        'cfl-gold': '#fbbf24',
        'cfl-teal': '#58a6ff',
        'cfl-purple': '#a855f7',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'cursive'],
        'pixel-body': ['"VT323"', 'monospace'],
      },
      boxShadow: {
        'pixel': '4px 4px 0px rgba(0,0,0,0.5)',
        'gold-glow': '0 0 20px rgba(251, 191, 36, 0.4)',
      },
    },
  },
}
```

---

## 9. REFERENCE ELEMENTS FROM CFL

From the screenshot:
- **Top bar**: Dark with currency pills (SOL icon + amount + plus button)
- **Side panels**: Rounded corners, semi-transparent dark bg
- **Badges**: Small pills with icons and text
- **Timer**: Chunky digital display
- **Prize displays**: Gold text with "$" and sparkle effects
- **User cards**: Avatar + username + verification badge
- **Buildings/elements**: Pixel art style (not needed for our app but inspiration for icons)

---

## 10. FILES TO UPDATE

1. `tailwind.config.js` - Colors, fonts, shadows
2. `src/app/globals.css` - Font imports, base styles
3. `src/components/Header.tsx` - Full restyle
4. `src/components/Dashboard.tsx` - Layout adjustments
5. `src/components/RaceLeaderboard.tsx` - Pixel style
6. `src/components/UnifiedRaceChart.tsx` - Chart styling
7. `src/components/MostVolatile.tsx` - Card styling
8. `src/components/ReferralPage.tsx` - Full restyle
9. `src/components/AlertPanel.tsx` - Notification styling

---

Ready to start Phase 1?
