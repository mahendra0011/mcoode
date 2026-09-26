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
};
