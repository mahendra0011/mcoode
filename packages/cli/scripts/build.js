import { build } from 'esbuild';
import { mkdir, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));

await mkdir(join(root, 'dist'), { recursive: true });

const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node26',
  jsx: 'automatic',
  jsxImportSource: '@opentui/react',
  loader: { '.js': 'jsx' },
  external: ['@mcode/backend', 'chromium-bidi/lib/cjs/bidiMapper/BidiMapper', 'chromium-bidi/lib/cjs/cdp/CdpConnection'],
  alias: {
    'react-devtools-core': join(root, 'scripts', 'stubs', 'react-devtools-core.js')
  },
  sourcemap: false,
  minify: false,
  define: { 'process.env.MCCODE_BUNDLED': '"1"' },
  // some CJS deps (commander) use dynamic require() — shim it for ESM
  banner: {
    js: `import { createRequire as __mcodeCreateRequire } from 'node:module';\nimport { fileURLToPath as __mcodeFileURLToPath } from 'node:url';\nconst require = __mcodeCreateRequire(import.meta.url);\nconst __dirname = __mcodeFileURLToPath(new URL('.', import.meta.url));`
  }
};

await build({
  ...common,
  entryPoints: [join(root, 'src', 'entry.js')],
  outfile: join(root, 'dist', 'mcode.mjs'),
  banner: { ...common.banner, js: '#!/usr/bin/env node\n' + common.banner.js }
});

await build({
  ...common,
  entryPoints: [join(root, 'src', 'watch-process.js')],
  outfile: join(root, 'dist', 'watch-process.mjs')
});

// ship templates alongside the bundle
await cp(join(root, 'templates'), join(root, 'dist', 'templates'), { recursive: true });

console.log('mcode-cli bundled \u2192 packages/cli/dist/mcode.mjs');
