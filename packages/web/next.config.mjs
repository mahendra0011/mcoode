import path from 'node:path';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3100';
// next.config.mjs is an ES module, so `__dirname` is not defined (and
// importing 'node:path' alone does not provide it). import.meta.dirname is
// the ESM equivalent and is available on Node 20.11+ / 22+.
const HERE = import.meta.dirname;

export default {
  reactStrictMode: true,
  // Socket.IO's engine.io path is `/live`, and the client requests
  // `/live/?EIO=4&transport=polling`. Next.js normalises the trailing slash by
  // default and answers 308 back to `/live`, which is a redirect loop: the
  // handshake never reaches the backend and the browser reports a socket
  // failure. Turning the redirect off lets the rewrite below proxy both
  // `/live` and `/live/...` straight through.
  skipTrailingSlashRedirect: true,
  turbopack: {
    // In this monorepo `next` is hoisted to the workspace root
    // (/app/node_modules/next), not into packages/web/node_modules. Turbopack
    // refuses to look outside its default root (packages/web) and fails with:
    //   Could not find the Next.js package (next/package.json)
    //   "files outside of the workspace root are not compiled"
    // Pointing the root at the monorepo root lets it resolve the hoisted
    // package. This is used by `next build` (Turbopack is the default bundler
    // for builds). `next dev` in the dev override runs with `--webpack` because
    // Turbopack's watcher does not pick up host edits through the Windows bind
    // mount, so this block is inert for dev but must stay for the image build.
    root: path.resolve(HERE, '..', '..'),
  },
  // File-watching polling for the dev server. Only webpack is configured to
  // honour it today (the dev override runs `next dev --webpack`); Turbopack
  // accepts it too but did not react to the bind mount here. `next build` /
  // `next start` never watch, so this is a no-op in the production image.
  watchOptions: {
    pollIntervalMs: 1000,
  },
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
      // No trailing slash on the destination: engine.io serves the handshake
      // on the bare path, and appending `/` here is what produced the loop.
      { source: '/live', destination: `${BACKEND}/live` },
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
