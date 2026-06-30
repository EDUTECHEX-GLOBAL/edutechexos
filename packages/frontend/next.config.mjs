import { imageHosts } from './image-hosts.config.mjs';
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
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

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
              "font-src 'self' https://fonts.gstatic.com https://api.fontshare.com https://cdn.fontshare.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https: wss:",
              // Allow recordings/voice notes served from Cloudinary, the API
              // (same-origin via rewrite), and inline base64/blob fallbacks.
              "media-src 'self' blob: data: https:",
              "frame-src 'self' https://calendar.google.com https://vercel.live",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Proxy all /api/* calls through Vercel so the browser never makes a
  // cross-origin request to Render. CORS headers are irrelevant for same-origin
  // calls, so Render sleeping / missing headers stops being a browser error.
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL || 'https://edutechexos-ueoq.onrender.com';
    const rules = [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
    return rules;
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