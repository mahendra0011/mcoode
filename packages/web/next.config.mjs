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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https: data: blob:",
              "font-src 'self' https: data:",
              "connect-src 'self' http://localhost:* ws://localhost:* wss: https:",
              "worker-src 'self' blob:",
              "frame-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
    ];
  },
};
