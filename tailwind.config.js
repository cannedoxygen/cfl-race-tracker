/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Landscape mobile
      'landscape': { 'raw': '(orientation: landscape) and (max-height: 500px)' },
    },
    extend: {
      colors: {
        // CFL Dark theme
        'cfl-bg': '#0d1117',
        'cfl-card': '#161b22',
        'cfl-border': '#30363d',
        // Accents
        'cfl-green': '#3fb950',
        'cfl-teal': '#58a6ff',
        'cfl-purple': '#a855f7',
        'cfl-orange': '#f97316',
        'cfl-gold': '#fbbf24',
        'cfl-red': '#f85149',
        'cfl-pink': '#ec4899',
        // Legacy support
        'cfl-cyan': '#14F195',
        'cfl-magenta': '#FF3B9A',
        'cfl-blue': '#00D1FF',
        'cfl-yellow': '#FFD700',
        // Text
        'cfl-text': '#ffffff',
        'cfl-text-muted': '#8b949e',
        'cfl-text-gold': '#fcd34d',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'cursive'],
        'pixel-body': ['"VT323"', 'monospace'],
        'silkscreen': ['"Silkscreen"', 'cursive'],
      },
      boxShadow: {
        'pixel': '4px 4px 0px rgba(0,0,0,0.5)',
        'pixel-sm': '2px 2px 0px rgba(0,0,0,0.5)',
        'gold-glow': '0 0 20px rgba(251, 191, 36, 0.4)',
        'green-glow': '0 0 15px rgba(63, 185, 80, 0.4)',
        'purple-glow': '0 0 15px rgba(168, 85, 247, 0.4)',
        'orange-glow': '0 0 15px rgba(249, 115, 22, 0.4)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'gold-shimmer': 'gold-shimmer 2s ease-in-out infinite',
        'bounce-pixel': 'bounce-pixel 0.3s ease-in-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'gold-shimmer': {
          '0%, 100%': { textShadow: '0 0 10px #fbbf24, 0 0 20px #f59e0b' },
          '50%': { textShadow: '0 0 20px #fbbf24, 0 0 40px #f59e0b' },
        },
        'bounce-pixel': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
};
