import { vaultSet, vaultDelete, vaultList, loadVault } from '../core/vault.js';
import { table, ok, fail } from '../core/logger.js';

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
      const { appendFile } = await import('node:fs/promises');
      const { join } = await import('node:path');
      await appendFile(join(process.cwd(), '.env'), `${key}=${value}\n`, 'utf8');
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
