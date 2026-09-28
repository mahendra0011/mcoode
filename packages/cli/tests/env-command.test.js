import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const home = await mkdtemp(join(tmpdir(), 'mcode-env-test-'));
const cwd = await mkdtemp(join(tmpdir(), 'mcode-env-cwd-'));
vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal();
  return { ...os, homedir: () => home };
});

// SEC-003: the vault fails closed without a passphrase — give the suite one
// (mirrors vault.test.js). Set before vault.js is imported below.
const prevVaultPassword = process.env.MCODE_VAULT_PASSWORD;
process.env.MCODE_VAULT_PASSWORD = 'test-vault-passphrase';

const { envCommand, envListCommand } = await import('../src/commands/env.js');
const { loadVault } = await import('../src/core/vault.js');

describe('env command (isolated HOME)', () => {
  let origCwd;
  beforeEach(() => {
    origCwd = process.cwd();
    process.chdir(cwd);
  });

  afterAll(async () => {
    process.chdir(origCwd);
    if (prevVaultPassword === undefined) delete process.env.MCODE_VAULT_PASSWORD;
    else process.env.MCODE_VAULT_PASSWORD = prevVaultPassword;
    await rm(home, { recursive: true, force: true }).catch(() => {});
    await rm(cwd, { recursive: true, force: true }).catch(() => {});
  });

  it('stores in vault by default (never plaintext)', async () => {
    await envCommand({ action: 'add', key: 'TEST_KEY_ABC', value: 's3cret-value' });
    const secrets = await loadVault();
    expect(secrets.TEST_KEY_ABC).toBe('s3cret-value');
  });

  it('lists keys masked', async () => {
    await envCommand({ action: 'add', key: 'LIST_ME', value: '1234567890' });
    const keys = await envListCommand();
    expect(keys).toContain('LIST_ME');
  });

  it('plain mode writes .env (gitignore warning path)', async () => {
    await envCommand({ action: 'add', key: 'PLAIN_KEY', value: 'plainval', plain: true });
    const content = await readFile(join(cwd, '.env'), 'utf8');
    expect(content).toMatch(/PLAIN_KEY=plainval/);
  });

  it('remove deletes from vault', async () => {
    await envCommand({ action: 'add', key: 'GONE_KEY', value: 'x' });
    await envCommand({ action: 'remove', key: 'GONE_KEY' });
    const secrets = await loadVault();
    expect(secrets.GONE_KEY).toBeUndefined();
  });
});
