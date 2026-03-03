/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Exclude mobile React Native app from Next.js build
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/mobile/**'],
    };
    return config;
  },
  // Exclude mobile folder from TypeScript compilation
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
