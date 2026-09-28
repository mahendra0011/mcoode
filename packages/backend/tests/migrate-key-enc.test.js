import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { connectDb, db, clearMemoryDb } from '../src/db.js';
import {
  encryptKey,
  deriveMasterKey,
  createKeyManager,
  parseKeyId,
  DEFAULT_KEY_ID,
  KEY_ID_JWT_FALLBACK,
} from '../src/secret-enc.js';
import { runMigration } from '../scripts/migrate-key-encryption.js';

// BSEC-001 migration script: two-pass (collect+verify → backup → write),
// never writes without round-trip proof, never deletes.
const JWT = 'unit-test-jwt-secret-0123456789abcdef';
const ENC = 'unit-test-enc-secret-0123456789abcdef-0123456789abcdef';
const USER_A = '64b0000000000000000000a1';
const USER_B = '64b0000000000000000000b2';

let backupDir;

function v1Blob(userId, plain) {
  return encryptKey(plain, deriveMasterKey(JWT, userId));
}

describe('BSEC-001 migrate-key-encryption script', () => {
  beforeAll(async () => {
    await connectDb(null); // memory adapter — never a real cluster in tests
    backupDir = await mkdtemp(path.join(tmpdir(), 'mcode-migrate-'));
  });
  afterAll(async () => { await rm(backupDir, { recursive: true, force: true }).catch(() => {}); });
  beforeEach(() => { clearMemoryDb(); });

  const km = () => createKeyManager({ secret: JWT, encSecret: ENC, encKeyId: DEFAULT_KEY_ID });

  it('dry-run reports rotation but writes nothing (no DB write, no backup file)', async () => {
    const v1 = v1Blob(USER_A, 'sk-plain-aaa');
    await db().apiKey.create({ userId: USER_A, providerId: 'openrouter', envVar: 'OPENROUTER_API_KEY', encryptedKey: v1 });

    const res = await runMigration({ apply: false, backupPath: path.join(backupDir, 'dry.json'), db, keyManager: km() });

    expect(res.stats.rotated).toBe(1);
    expect(res.stats.failed).toBe(0);
    expect(res.backupPath).toBeNull(); // dry-run never touches disk
    const row = await db().apiKey.findOne({ userId: USER_A });
    expect(row.encryptedKey).toBe(v1); // untouched
    expect(parseKeyId(row.encryptedKey)).toBeNull(); // still legacy v1
    await expect(access(path.join(backupDir, 'dry.json'))).rejects.toThrow();
  });

  it('apply: backs up ORIGINAL blobs, then rewrites v1 → v2 verifiably', async () => {
    const v1 = v1Blob(USER_A, 'sk-plain-aaa');
    await db().apiKey.create({ userId: USER_A, providerId: 'openrouter', envVar: 'OPENROUTER_API_KEY', encryptedKey: v1 });
    const backupPath = path.join(backupDir, 'apply.json');

    const res = await runMigration({ apply: true, backupPath, db, keyManager: km() });
    expect(res.stats.rotated).toBe(1);
    expect(res.stats.failed).toBe(0);
    expect(res.backupPath).toBe(path.resolve(backupPath));

    // Backup holds the ORIGINAL v1 blob (usable to restore).
    const backup = JSON.parse(await readFile(backupPath, 'utf8'));
    expect(backup.writeKeyId).toBe(DEFAULT_KEY_ID);
    expect(backup.rows).toHaveLength(1);
    expect(backup.rows[0].original).toBe(v1);
    expect(backup.rows[0].fromKeyId).toBeNull(); // came from legacy v1
    expect(backup.rows[0].next).toBeUndefined(); // new blob material never in backup

    // DB row now v2 and round-trips to the same plaintext under the new key.
    const row = await db().apiKey.findOne({ userId: USER_A });
    expect(row.encryptedKey.startsWith('MCCODEK2:')).toBe(true);
    expect(parseKeyId(row.encryptedKey)).toBe(DEFAULT_KEY_ID);
    expect(km().decrypt(row.encryptedKey, USER_A)).toBe('sk-plain-aaa');
    expect(km().needsRotation(row.encryptedKey)).toBe(false);
  });

  it('skips rows already on the current keyId (idempotent second run)', async () => {
    await db().apiKey.create({ userId: USER_A, providerId: 'p', envVar: 'P_KEY', encryptedKey: km().encrypt('sk-1', USER_A) });

    const res = await runMigration({ apply: true, backupPath: path.join(backupDir, 'idem.json'), db, keyManager: km() });
    expect(res.stats.rotated).toBe(0);
    expect(res.stats.skipped).toBe(1);
    expect(res.backupPath).toBeNull(); // nothing to back up → no file
  });

  it('rotates GithubAccount accessToken rows too', async () => {
    const v1 = v1Blob(USER_B, 'gho_token_plain');
    await db().githubAccount.create({ userId: USER_B, accessToken: v1, username: 'octocat' });

    const res = await runMigration({ apply: true, backupPath: path.join(backupDir, 'gh.json'), db, keyManager: km() });
    expect(res.stats.rotated).toBe(1);
    expect(res.stats.failed).toBe(0);

    const row = await db().githubAccount.findOne({ userId: USER_B });
    expect(km().decrypt(row.accessToken, USER_B)).toBe('gho_token_plain');
    const backup = JSON.parse(await readFile(path.join(backupDir, 'gh.json'), 'utf8'));
    expect(backup.rows[0].original).toBe(v1);
  });

  it('leaves undecryptable rows untouched and reports them as failures', async () => {
    const garbage = Buffer.from('not-a-key-blob').toString('base64');
    await db().apiKey.create({ userId: USER_A, providerId: 'p', envVar: 'P_KEY', encryptedKey: garbage });

    const res = await runMigration({ apply: true, backupPath: path.join(backupDir, 'fail.json'), db, keyManager: km() });
    expect(res.stats.failed).toBe(1);
    expect(res.stats.rotated).toBe(0);
    expect(res.failures[0].collection).toBe('apiKeys');
    expect(res.backupPath).toBeNull(); // nothing verified → nothing backed up/written

    const row = await db().apiKey.findOne({ userId: USER_A });
    expect(row.encryptedKey).toBe(garbage); // untouched — never deleted
  });

  it('fails closed on unknown keyId (rotation key not in keyring)', async () => {
    const foreign = createKeyManager({ secret: JWT, encSecret: ENC, encKeyId: 'ek9' }).encrypt('sk-x', USER_A);
    await db().apiKey.create({ userId: USER_B, providerId: 'p', envVar: 'P_KEY', encryptedKey: foreign });

    const res = await runMigration({ apply: true, backupPath: path.join(backupDir, 'aad.json'), db, keyManager: km() });
    // ek9 is not in the keyring → decrypt fails → reported, not written
    expect(res.stats.failed).toBe(1);
    const row = await db().apiKey.findOne({ userId: USER_B });
    expect(row.encryptedKey).toBe(foreign);
  });

  it('classifies blob formats via parseKeyId (v1 vs v2)', () => {
    expect(parseKeyId(v1Blob(USER_A, 'x'))).toBeNull();
    expect(parseKeyId(km().encrypt('x', USER_A))).toBe(DEFAULT_KEY_ID);
    expect(parseKeyId('not-base64-magic')).toBeNull();
    expect(KEY_ID_JWT_FALLBACK).toBe('jwt1'); // dual-read constant still exported
  });
});

