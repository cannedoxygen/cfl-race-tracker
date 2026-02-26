// Price Data Source Configuration
// Set USE_CFL_SSE=true when CFL whitelists cfladvantage.vercel.app

export const PRICE_CONFIG = {
  // Toggle this to switch between polling and SSE
  // Set to true once CFL whitelists your domain
  useCflSSE: process.env.NEXT_PUBLIC_USE_CFL_SSE === 'true',

  // CFL SSE endpoint (real-time ~1s updates)
  cflSSEUrl: 'https://price-ingestor-production.up.railway.app/sse/prices',

  // Pyth polling endpoint (fallback, 2s polling)
  pythHermesUrl: 'https://hermes.pyth.network/v2/updates/price/latest',

  // Polling interval in ms (only used when SSE disabled)
  pollingInterval: 2000,
};

// Quick check function
export function isCflSSEEnabled(): boolean {
  return PRICE_CONFIG.useCflSSE;
}
