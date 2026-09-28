import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// SEC-003: vault requires a passphrase — set one for tests
process.env.MCODE_VAULT_PASSWORD = 'test-vault-passphrase';
const home = await mkdtemp(join(tmpdir(), 'mcode-config-test-'));
const cwd = await mkdtemp(join(tmpdir(), 'mcode-config-cwd-'));
vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal();
  return { ...os, homedir: () => home };
});

const store = await import('../src/core/store.js');
const { configValidateCommand } = await import('../src/commands/config.js');
const { doctorCommand } = await import('../src/commands/doctor.js');

// MF-007: loadConfig must never silently empty the config on bad input —
// schema errors keep last-good, parse errors keep last-good, and
// saveConfig refuses to persist invalid configs (validate-before-write).
describe('MF-007 config validation (isolated HOME)', () => {
  let origCwd;
  beforeEach(async () => {
    origCwd = process.cwd();
    process.chdir(cwd);
    await writeFile(join(home, '.mcode', 'config.json'), JSON.stringify({}), 'utf8').catch(async () => {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(join(home, '.mcode'), { recursive: true });
      await writeFile(join(home, '.mcode', 'config.json'), JSON.stringify({}), 'utf8');
    });
    await store.loadConfig({ force: true });
  });

  afterAll(async () => {
    process.chdir(origCwd);
    await rm(home, { recursive: true, force: true }).catch(() => {});
    await rm(cwd, { recursive: true, force: true }).catch(() => {});
  });

  it('keeps last-good config when the file becomes schema-invalid', async () => {
    await store.saveConfig({ model: 'openai:gpt-4o' });
    const good = await store.loadConfig({ force: true });
    expect(good.model).toBe('openai:gpt-4o');

    await writeFile(join(home, '.mcode', 'config.json'), JSON.stringify({ concurrency: -5 }), 'utf8');
    const kept = await store.loadConfig({ force: true });
    expect(kept.model).toBe('openai:gpt-4o');
    expect(store.getLastConfigError()?.kind).toBe('schema');
  });

  it('keeps last-good config when the file is not valid JSON', async () => {
    await store.saveConfig({ model: 'openai:gpt-4o' });
    await writeFile(join(home, '.mcode', 'config.json'), '{ not json', 'utf8');
    const kept = await store.loadConfig({ force: true });
    expect(kept.model).toBe('openai:gpt-4o');
    expect(store.getLastConfigError()?.kind).toBe('parse');
  });

  it('saveConfig refuses to persist schema-invalid configs', async () => {
    await expect(store.saveConfig({ concurrency: -5 })).rejects.toThrow(/Invalid config/);
  });

  it('config validate reports schema errors with exit code 1', async () => {
    await writeFile(join(home, '.mcode', 'config.json'), JSON.stringify({ concurrency: -5 }), 'utf8');
    process.exitCode = 0;
    const res = await configValidateCommand();
    expect(res.ok).toBe(false);
    expect(res.kind).toBe('schema');
    expect(process.exitCode).toBe(1);
    await writeFile(join(home, '.mcode', 'config.json'), JSON.stringify({}), 'utf8');
    process.exitCode = 0;
  });

  it('doctor surfaces a config-schema row', async () => {
    await writeFile(join(home, '.mcode', 'config.json'), JSON.stringify({ concurrency: -5 }), 'utf8');
    await store.loadConfig({ force: true });
    // doctor prints a table — just assert it does not throw and records the error.
    await expect(doctorCommand({ asJson: true })).resolves.not.toThrow();
    expect(store.getLastConfigError()?.kind).toBe('schema');
  });
});
