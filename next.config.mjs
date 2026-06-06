import { imageHosts } from './image-hosts.config.mjs';
import { withSentryConfig } from '@sentry/nextjs';

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

  experimental: {
    // React 19 Compiler — auto-memoizes all components, replaces manual useMemo/useCallback
    reactCompiler: true,
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
export default withSentryConfig(nextConfig, {
  // Sentry build options — org/project filled from env or sentry.properties
  org: process.env.SENTRY_ORG || 'edutechexos',
  project: process.env.SENTRY_PROJECT || 'edutechexos',
  // Upload source maps silently (no output spam on every build)
  silent: !process.env.CI,
  // Automatically tree-shake Sentry in production to minimise bundle size
  widenClientFileUpload: true,
  hideSourceMaps: true,
  // Skip source map upload if no auth token (local dev)
  authToken: process.env.SENTRY_AUTH_TOKEN,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});