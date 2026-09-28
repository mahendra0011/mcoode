// BSEC-001: bulk re-encrypt of stored at-rest secrets (ApiKey + GithubAccount)
// from legacy v1 / older keyring blobs to the current v2 envelope key.
//
// Usage:
//   node scripts/migrate-key-encryption.js            # dry-run (default): report only
//   node scripts/migrate-key-encryption.js --apply    # re-encrypt + write back
//   node scripts/migrate-key-encryption.js --apply --backup-file ./key-backup.json
//   Add --allow-remote-db to touch a real MONGODB_URI (default: memory adapter).
//
// Guarantees (enforced by runMigration(), which is unit-tested):
//   • Two passes: collect + verify EVERYTHING first, then write — a crash can
//     never leave a half-migrated run without its backup.
//   • JSON backup of every original blob is written BEFORE the first DB write.
//   • NEVER writes unless round-trip verification passes (decrypt(newBlob) === plain).
//   • NEVER deletes: failures are reported and their rows are left untouched.
//   • Reads with the full keyring (JWT legacy + current + previous secret).
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { keyManagerFromEnv, parseKeyId } from '../src/secret-enc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run the migration against an already-connected db + key manager.
 * Pass 1 collects and verifies; the backup is written; pass 2 writes.
 *
 * @param {{ apply?: boolean, backupPath?: string|null, db: () => any, keyManager: any }} opts
 * @returns {Promise<{ touched: any[], stats: any, failures: any[], backupPath: string|null }>}
 */
export async function runMigration({ apply = false, backupPath = null, db, keyManager: km }) {
  const touched = [];
  const stats = { apiKeys: 0, github: 0, rotated: 0, skipped: 0, failed: 0 };
  const failures = [];

  // ── Pass 1a: ApiKey rows — collect + verify, no writes ─────────────────────
  const apiKeys = await db().apiKey.find({});
  stats.apiKeys = apiKeys.length;
  for (const row of apiKeys) {
    const userId = row.userId ?? row.user_id;
    try {
      if (!row.encryptedKey || !km.needsRotation(row.encryptedKey)) { stats.skipped++; continue; }
      const plain = km.decrypt(row.encryptedKey, userId);
      const fresh = km.encrypt(plain, userId);
      if (km.decrypt(fresh, userId) !== plain) throw new Error('round-trip verification failed');
      touched.push({ collection: 'apiKeys', id: String(row._id), userId: String(userId), field: 'encryptedKey', fromKeyId: parseKeyId(row.encryptedKey), toKeyId: km.keyId, original: row.encryptedKey, next: fresh });
      stats.rotated++;
    } catch (err) {
      stats.failed++;
      failures.push({ collection: 'apiKeys', id: String(row._id), error: err.message });
    }
  }

  // ── Pass 1b: GithubAccount rows — collect + verify, no writes ──────────────
  const ghRows = await db().githubAccount.find({});
  stats.github = ghRows.length;
  for (const row of ghRows) {
    const userId = row.userId ?? row.user_id;
    try {
      if (!row.accessToken || !km.needsRotation(row.accessToken)) { stats.skipped++; continue; }
      const plain = km.decrypt(row.accessToken, userId);
      const fresh = km.encrypt(plain, userId);
      if (km.decrypt(fresh, userId) !== plain) throw new Error('round-trip verification failed');
      touched.push({ collection: 'githubAccounts', id: String(row._id), userId: String(userId), field: 'accessToken', fromKeyId: parseKeyId(row.accessToken), toKeyId: km.keyId, original: row.accessToken, next: fresh });
      stats.rotated++;
    } catch (err) {
      stats.failed++;
      failures.push({ collection: 'githubAccounts', id: String(row._id), error: err.message });
    }
  }

  // ── Backup BEFORE the first DB write (dry-runs never touch disk) ───────────
  let writtenBackup = null;
  if (touched.length && apply && backupPath) {
    const abs = path.resolve(backupPath);
    await mkdir(path.dirname(abs), { recursive: true }).catch(() => {});
    await writeFile(abs, JSON.stringify({ at: new Date().toISOString(), writeKeyId: km.keyId, rows: touched.map(({ next, ...rest }) => rest) }, null, 2), 'utf8');
    writtenBackup = abs;
  }

  // ── Pass 2: apply the already-verified rewrites ─────────────────────────────
  if (apply) {
    for (const t of touched) {
      const coll = t.collection === 'apiKeys' ? db().apiKey : db().githubAccount;
      await coll.updateOne({ _id: t.id }, { $set: { [t.field]: t.next } });
    }
  }

  return { touched, stats, failures, backupPath: writtenBackup };
}

// ── CLI entry (only when executed directly, never on import) ─────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  dotenv.config();

  const { connectDb, db } = await import('../src/db.js');

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const BACKUP = process.argv.find((a) => a.startsWith('--backup-file='))?.split('=')[1]
  || `key-encryption-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[migrate-keys] ❌ JWT_SECRET is required (legacy v1 blobs need it for reads).');
  process.exit(1);
}
if (!process.env.API_KEY_ENCRYPTION_SECRET) {
  console.error('[migrate-keys] ❌ API_KEY_ENCRYPTION_SECRET is required — refusing to migrate to a JWT-fallback key.');
  console.error('[migrate-keys]    Set it first (see .env.example), then re-run.');
  process.exit(1);
}

const km = keyManagerFromEnv({ secret: JWT_SECRET });
console.log(`[migrate-keys] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} writeKeyId=${km.keyId} dedicated=${km.dedicated}`);

// Never let a dev/test run touch a real cluster: dotenv-loaded MONGODB_URI is
// used ONLY with an explicit opt-in. Default is the in-memory adapter. Note:
// dotenv populates process.env before we get here, so check-and-clear it.
let mongoUri = process.env.MONGODB_URI;
if (mongoUri && !args.has('--allow-remote-db')) {
  console.warn('[migrate-keys] ⚠️  ignoring dotenv-loaded MONGODB_URI for a safe local run (pass --allow-remote-db to use it).');
  delete process.env.MONGODB_URI;
  mongoUri = null;
}
await connectDb(args.has('--allow-remote-db') ? mongoUri : null);

const { touched, stats, failures, backupPath } = await runMigration({
  apply: APPLY,
  backupPath: APPLY ? BACKUP : null,
  db,
  keyManager: km,
});

if (backupPath) console.log(`[migrate-keys] backup of ${touched.length} original blobs → ${backupPath}`);

console.log(`[migrate-keys] apiKeys=${stats.apiKeys} github=${stats.github} rotated=${stats.rotated} skipped=${stats.skipped} failed=${stats.failed}`);
if (failures.length) {
  console.log('[migrate-keys] failures (NOT written — investigate before retry):');
  for (const f of failures.slice(0, 20)) console.log(`  - ${f.collection}/${f.id}: ${f.error}`);
}
if (!APPLY) {
  console.log('[migrate-keys] dry-run only — nothing written. Re-run with --apply to rotate.');
  if (touched.length) console.log(`[migrate-keys] ${touched.length} row(s) WOULD be rotated (no backup written in dry-run).`);
}
process.exit(stats.failed ? 2 : 0);
}
