import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const home = await mkdtemp(join(tmpdir(), 'mcode-vault-test-'));
vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal();
  return { ...os, homedir: () => home };
});

const { loadVault, saveVault, vaultSet, vaultGet, vaultDelete, vaultList, maskSecret } =
  await import('../src/core/vault.js');

describe('vault roundtrip (isolated HOME)', () => {
  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it('returns empty for a fresh vault', async () => {
    expect(await loadVault()).toEqual({});
  });

  it('round-trips secrets encrypted', async () => {
    await vaultSet('OPENROUTER_API_KEY', 'sk-secret-value-1234');
    await vaultSet('ANTHROPIC_API_KEY', 'sk-ant-xxxx');
    expect(await vaultGet('OPENROUTER_API_KEY')).toBe('sk-secret-value-1234');

    const raw = await readFile(join(home, '.mcode', 'vault.json.enc'), 'utf8');
    expect(raw).not.toContain('sk-secret-value-1234');

    expect(await vaultList()).toHaveLength(2);
    expect(await vaultList()).toContainEqual(
      expect.objectContaining({ key: 'OPENROUTER_API_KEY', set: true })
    );
  });

  it('deletes keys', async () => {
    await vaultSet('K', 'v');
    await vaultDelete('K');
    expect(await vaultGet('K')).toBeUndefined();
  });

  it('fails closed on wrong passphrase', async () => {
    await saveVault({ A: '1' }, 'correct horse');
    expect(await loadVault('wrong')).toEqual({});
    expect(await loadVault('correct horse')).toEqual({ A: '1' });
  });
});

describe('maskSecret', () => {
  it('masks long secrets, blanks empty', () => {
    expect(maskSecret('')).toBe('');
    const masked = maskSecret('abcdefghijklmnop');
    expect(masked).not.toBe('abcdefghijklmnop');
    expect(masked.startsWith('abcd')).toBe(true);
    expect(masked.endsWith('mnop')).toBe(true);
    expect(maskSecret('short')).toContain('\u2022');
  });
});
