import { vaultSet, vaultDelete, vaultList, loadVault } from '../core/vault.js';
import { table, ok, fail, warn } from '../core/logger.js';

export async function envCommand({ action = 'list', key = null, value = null, plain = false, file = null }) {
  if (action === 'add') {
    if (!key) {
      fail('usage: mcode env add KEY value');
      process.exit(1);
    }
    if (!value && file) {
      const { readFile } = await import('node:fs/promises');
      value = (await readFile(file, 'utf8')).trim();
    }
    if (!value) {
      fail('a value is required (or use --file)');
      process.exit(1);
    }
    if (plain) {
      const { readFile, writeFile } = await import('node:fs/promises');
      const { join } = await import('node:path');
      // CLI-005: never let a plaintext secret become committable by accident.
      try {
        const { default: gitignore } = await import('ignore').catch(() => ({ default: null }));
        const giRaw = await readFile(join(process.cwd(), '.gitignore'), 'utf8').catch(() => '');
        const ignored = gitignore
          ? gitignore().add(giRaw).ignores('.env')
          : giRaw.split('\n').map((l) => l.trim()).some((l) => l === '.env' || l === '/.env');
        if (!ignored) {
          warn('.env is NOT in .gitignore — writing a plaintext secret risks committing it. Add ".env" to .gitignore first (continuing anyway).');
        }
      } catch {
        /* gitignore check is best-effort — the write below still happens */
      }
      const envPath = join(process.cwd(), '.env');
      const gitignorePath = join(process.cwd(), '.gitignore');
      try {
        const giContent = await readFile(gitignorePath, 'utf8').catch(() => null);
        if (giContent !== null && !giContent.split('\n').some((l) => l.trim() === '.env' || l.trim() === '*.env' || l.trim().startsWith('.env'))) {
          const { warn } = await import('../core/logger.js');
          warn('SECURITY WARNING: .env is not in .gitignore! Secrets written in plaintext may be accidentally committed to git.');
        }
      } catch { /* best-effort check */ }

      let lines = [];
      try {
        lines = (await readFile(envPath, 'utf8')).split('\n');
      } catch {
        lines = [];
      }
      const prefix = `${key}=`;
      lines = lines.filter((l) => !l.startsWith(prefix) && l.trim() !== prefix.slice(0, -1));
      lines.push(`${key}=${value}`);
      await writeFile(envPath, `${lines.join('\n').replace(/\n+$/, '\n')}`, 'utf8');
      ok(`${key} written to .env (plaintext, CI mode)`);
    } else {
      await vaultSet(key, value);
      ok(`${key} stored in encrypted vault (~/.mcode/vault.json.enc)`);
    }
    return;
  }
  if (action === 'remove' || action === 'rm') {
    if (!key) {
      fail('usage: mcode env remove KEY');
      process.exit(1);
    }
    await vaultDelete(key);
    ok(`${key} removed`);
    return;
  }
  const entries = await vaultList();
  table(entries.map((e) => [e.key, e.set ? 'set' : 'empty', e.masked]), {
    columns: ['KEY', 'STATE', 'VALUE']
  });
}

export async function envListCommand() {
  const secrets = await loadVault();
  return Object.keys(secrets);
}
