// Installs git hooks from scripts/ into .git/hooks (SEC-001/SEC-002).
// Runs on postinstall (best-effort, never fails the install).
import { copyFile, chmod, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

try {
  const src = join(root, 'scripts', 'pre-commit');
  const destDir = join(root, '.git', 'hooks');
  const dest = join(destDir, 'pre-commit');
  await mkdir(destDir, { recursive: true });
  await copyFile(src, dest);
  await chmod(dest, 0o755).catch(() => {});
  console.log('[mcode] git pre-commit hook installed (.env guard)');
} catch (err) {
  console.warn(`[mcode] could not install git hooks: ${err.message}`);
}
