import { imageHosts } from './image-hosts.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  distDir: process.env.DIST_DIR || '.next',

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 60,
  },

  // Proxy all /api/* calls through Vercel so the browser never makes a
  // cross-origin request to Render. CORS headers are irrelevant for same-origin
  // calls, so Render sleeping / missing headers stops being a browser error.
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL || 'https://edutechexos-backend.onrender.com';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};
export default nextConfig;