import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  additionalPrecacheEntries: [
    { url: '/offline', revision: process.env.VERCEL_GIT_COMMIT_SHA || new Date().toISOString() },
    {
      url: '/shared-offline',
      revision: process.env.VERCEL_GIT_COMMIT_SHA || new Date().toISOString(),
    },
  ],
});
const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'" +
              (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '') +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'" +
              (process.env.NODE_ENV === 'development' ? ' ws: wss:' : '') +
              "; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          },
        ],
      },
      {
        source: '/s/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
};
export default withSerwist(config);
