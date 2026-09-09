const BACKEND = process.env.BACKEND_URL || 'http://localhost:3100';

export default {
  reactStrictMode: true,
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
