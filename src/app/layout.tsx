import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'CFL Advantage | Crypto Fantasy League Trading Edge',
  description:
    'Real-time volatility racing chart for Crypto Fantasy League (CFL) tokens. See which tokens are racing ahead on Solana.',
  keywords: ['CFL', 'Crypto Fantasy League', 'Solana', 'Seeker', 'volatility', 'trading'],
  authors: [{ name: 'CFL' }],
  manifest: '/manifest.json',
  metadataBase: new URL('https://cfladv.fun'),
  openGraph: {
    title: 'CFL Advantage',
    description: 'Real-time volatility racing for Crypto Fantasy League tokens on Solana.',
    url: 'https://cfladv.fun',
    siteName: 'CFL Advantage',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'CFL Advantage - Crypto Fantasy League Trading Edge',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CFL Advantage',
    description: 'Real-time volatility racing for Crypto Fantasy League tokens on Solana.',
    images: ['/og.png'],
  },
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
