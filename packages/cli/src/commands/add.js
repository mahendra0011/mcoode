import { ok, fail } from '../core/logger.js';
import { loadConfig, saveConfig } from '../core/store.js';

const REGISTRY = {
  eslint: { category: 'lint', desc: 'ESLint flat-config preset (JS-only ruleset)', config: { lint: { eslintConfig: 'flat' } } },
  prettier: { category: 'format', desc: 'Prettier formatting preset', config: { format: { tool: 'prettier' } } },
  'test-watcher': { category: 'testing', desc: 'Vitest watch preset with changed-file mode', config: { test: { watch: true } } },
  'deploy-netlify': { category: 'deploy', desc: 'Netlify deploy preset', config: { deploy: { target: 'netlify' } } },
  'deploy-vercel': { category: 'deploy', desc: 'Vercel deploy preset', config: { deploy: { target: 'vercel' } } },
  'deploy-docker': { category: 'deploy', desc: 'Dockerfile + compose preset', config: { deploy: { target: 'docker' } } },
  'secrets-gpg': { category: 'security', desc: 'GPG-encrypted secrets preset', config: { security: { secrets: 'gpg' } } }
};

export async function addCommand(plugin) {
  const entry = REGISTRY[plugin];
  if (!entry) {
    fail(`plugin "${plugin}" not found in registry. Available:\n  ${Object.keys(REGISTRY).join('\n  ')}`);
    process.exit(1);
  }
  const config = await loadConfig();
  config.plugins = { ...(config.plugins || {}), [plugin]: entry.config };
  await saveConfig();
  ok(`plugin ${plugin} installed (${entry.category}) \u2014 ${entry.desc}`);
}

export async function pluginsListCommand() {
  return Object.entries(REGISTRY).map(([name, p]) => ({ name, ...p }));
}
