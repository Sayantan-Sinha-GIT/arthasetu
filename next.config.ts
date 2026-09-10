import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  env: {
    // A per-deployment marker for the offline worker, so phones know when their
    // saved screens belong to an older version and must be saved again. Vercel's
    // deployment ID changes even when the same commit is redeployed; a local
    // build falls back to its build time.
    ARTHASETU_BUILD_ID:
      process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now()),
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=(self)',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        /*
         * Chrome fetches this before it will drop the browser toolbar in the
         * Android app, and it was being served `max-age=0, must-revalidate` —
         * a full round trip to the origin on every single launch, in front of
         * the user, while the address bar sat visible. The file changes only
         * when the signing key does, so a short freshness window with a long
         * stale-while-revalidate lets the edge answer instantly and check for a
         * new one in the background.
         */
        source: '/.well-known/assetlinks.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=600, stale-while-revalidate=604800',
          },
        ],
      },
      {
        /*
         * Not content-hashed the way `/_next/static` is, so they cannot be
         * immutable — but re-fetching the logo and the photographs on every
         * launch is exactly the cost we are trying to remove from a slow link.
         */
        source: '/:dir(icons|images|fonts)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        /*
         * The worker itself must never be cached, or a bad one could not be
         * replaced. Service-Worker-Allowed lets it claim the whole origin.
         */
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
