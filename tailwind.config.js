/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cfl-bg': '#0a0a0f',
        'cfl-card': '#12121a',
        'cfl-border': '#1e1e2e',
        'cfl-purple': '#9945FF',
        'cfl-cyan': '#14F195',
        'cfl-magenta': '#FF3B9A',
        'cfl-blue': '#00D1FF',
        'cfl-orange': '#FF9500',
        'cfl-yellow': '#FFD700',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
