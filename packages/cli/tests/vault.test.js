import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir, hostname, userInfo } from 'node:os';
import { join } from 'node:path';
import { scryptSync, randomBytes, createCipheriv } from 'node:crypto';

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

  it('reads legacy pre-salt vaults', async () => {
    // old format: iv(12) + tag(16) + data, key = scrypt(host:user + passphrase, 'mcode')
    const key = scryptSync(`mcode-vault-v1:${hostname()}:${userInfo().username}oldpass`, 'mcode', 32);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(Buffer.from(JSON.stringify({ LEGACY: 'yes' }), 'utf8')), cipher.final()]);
    const tag = cipher.getAuthTag();
    await mkdir(join(home, '.mcode'), { recursive: true });
    await writeFile(
      join(home, '.mcode', 'vault.json.enc'),
      Buffer.concat([iv, tag, data]).toString('base64'),
      'utf8'
    );
    expect(await loadVault('oldpass')).toEqual({ LEGACY: 'yes' });
    // wrong passphrase on legacy content also fails closed
    expect(await loadVault('nope')).toEqual({});
  });

  it('backs up an undecryptable vault on save instead of clobbering', async () => {
    await saveVault({ A: '1' }, 'p');
    const original = await readFile(join(home, '.mcode', 'vault.json.enc'), 'utf8');
    // corrupt the file
    await writeFile(join(home, '.mcode', 'vault.json.enc'), 'not-base64-at-all!!', 'utf8');
    expect(await loadVault('p')).toEqual({});
    await saveVault({ B: '2' }, 'p');
    const files = await import('node:fs/promises').then((fs) => fs.readdir(join(home, '.mcode')));
    expect(files.some((f) => f.startsWith('vault.json.enc.corrupt-'))).toBe(true);
    expect(await loadVault('p')).toEqual({ B: '2' });
    void original;
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
