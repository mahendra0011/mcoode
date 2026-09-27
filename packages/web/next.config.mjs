const BACKEND = process.env.BACKEND_URL || 'http://localhost:3100';

export default {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '2.4.6',
  },
  transpilePackages: [
    '@radix-ui', 'cmdk', '@monaco-editor', '@xterm',
    'react-arborist', 'sonner', 'react-resizable-panels',
  ],
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND}/api/:path*` },
      { source: '/live', destination: `${BACKEND}/live/` },
      { source: '/live/:path*', destination: `${BACKEND}/live/:path*` },
    ];
  },
  // WEB-007: baseline Content-Security-Policy. Permissive where the app
  // needs it (Monaco workers = blob:, inline styles for dynamic theming,
  // ws(s) for Socket.IO, images from https/data/blob), strict everywhere
  // else (no object embeds, no base-uri hijack, upgrade-insecure-requests).
  //
  // The policy itself lives in `src/proxy.ts` because it needs a
  // per-request nonce for the scripts Next.js inlines into the document.
  // Setting it here as well would be a second, nonced-less policy that
  // browsers intersect with the nonce one, re-blocking the bootstrap.
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
      },
    ];
  },
};
