import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'CFL Volatility Race | Crypto Fantasy League Companion',
  description:
    'Real-time volatility racing chart for Crypto Fantasy League (CFL) tokens. See which tokens are racing ahead on Solana.',
  keywords: ['CFL', 'Crypto Fantasy League', 'Solana', 'Seeker', 'volatility', 'trading'],
  authors: [{ name: 'CFL' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CFL Race',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0f',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
