import { scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Shared AES-256-GCM encryption utilities for API keys stored in MongoDB.
 *
 * ── BSEC-001: two secret roles, never one ────────────────────────────────────
 *  • legacy (v1) blob  `MCCODEKEY:`  — key derived from the JWT secret + userId.
 *    Read-only support, kept so existing rows keep working.
 *  • envelope (v2) blob `MCCODEK2:`  — key derived from a DEDICATED
 *    API_KEY_ENCRYPTION_SECRET; the blob carries a `keyId` (keyring rotation),
 *    a random per-blob salt, and binds ciphertext to its owner via GCM AAD.
 *  New writes always use v2. Prefer `keyManagerFromEnv()` in routes — it
 *  auto-detects both formats and re-encrypts legacy blobs on write/read.
 */

const MAGIC_V1 = 'MCCODEKEY:';
const MAGIC_V2 = 'MCCODEK2:';
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_DOMAIN_V1 = 'mcode-apikey:';
const KEY_DOMAIN_V2 = 'mcode-apikey-v2:';

/** keyId for blobs written with the JWT-secret fallback (no dedicated secret configured). */
export const KEY_ID_JWT_FALLBACK = 'jwt1';
/** default keyId for blobs written with a dedicated API_KEY_ENCRYPTION_SECRET. */
export const DEFAULT_KEY_ID = 'ek1';

/** Legacy v1 derivation — kept byte-compatible so old blobs still decrypt. */
export function deriveMasterKey(secret, userId) {
  return scryptSync(`${KEY_DOMAIN_V1}${userId}:${secret}`, 'mcode', 32);
}

/** Legacy v1 write — retained for scripts/tests; routes use the key manager. */
export function encryptKey(plain, masterKey) {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = scryptSync(masterKey.toString('hex'), salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.from(plain, 'utf8');
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob = Buffer.concat([Buffer.from(MAGIC_V1, 'utf8'), salt, iv, tag, encrypted]).toString('base64');
  return blob;
}

/** Legacy v1 read — only used by the key manager for pre-existing blobs. */
export function decryptKey(blob, masterKey) {
  const buf = Buffer.from(blob, 'base64');
  let off = 0;
  if (buf.subarray(0, MAGIC_V1.length).toString('utf8') !== MAGIC_V1) {
    throw new Error('invalid key blob');
  }
  off += MAGIC_V1.length;
  const salt = buf.subarray(off, off + SALT_LEN); off += SALT_LEN;
  const iv = buf.subarray(off, off + IV_LEN); off += IV_LEN;
  const tag = buf.subarray(off, off + TAG_LEN); off += TAG_LEN;
  const encrypted = buf.subarray(off);
  const key = scryptSync(masterKey.toString('hex'), salt, 32);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/** GCM additional-authenticated-data: binds a blob to its owning user. */
function aadFor(userId) {
  return Buffer.from(`mcode-key-v2:${userId}`, 'utf8');
}

function deriveBlobKeyV2(secret, userId, salt) {
  return scryptSync(`${KEY_DOMAIN_V2}${userId}:${secret}`, salt, 32);
}

/** v2 envelope write: `MCCODEK2:` + base64(len|keyId|salt|iv|tag|ciphertext). */
export function encryptKeyV2(plain, { secret, userId, keyId = DEFAULT_KEY_ID }) {
  const keyIdBuf = Buffer.from(String(keyId), 'utf8');
  if (!keyIdBuf.length || keyIdBuf.length > 64) throw new Error('keyId must be 1-64 bytes');
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', deriveBlobKeyV2(secret, userId, salt), iv);
  cipher.setAAD(aadFor(userId));
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()]);
  const payload = Buffer.concat([Buffer.from([keyIdBuf.length]), keyIdBuf, salt, iv, cipher.getAuthTag(), encrypted]);
  return MAGIC_V2 + payload.toString('base64');
}

/** Reads the keyId from a v2 blob. Returns null for v1/legacy/malformed blobs. */
export function parseKeyId(blob) {
  if (typeof blob !== 'string' || !blob.startsWith(MAGIC_V2)) return null;
  const buf = Buffer.from(blob.slice(MAGIC_V2.length), 'base64');
  const len = buf[0] || 0;
  if (!len || buf.length < 1 + len + SALT_LEN + IV_LEN + TAG_LEN) return null;
  return buf.subarray(1, 1 + len).toString('utf8');
}

/** v2 envelope read (AAD + GCM tag verified — wrong user/secret throws). */
export function decryptKeyV2(blob, { secret, userId }) {
  if (typeof blob !== 'string' || !blob.startsWith(MAGIC_V2)) throw new Error('invalid key blob');
  const buf = Buffer.from(blob.slice(MAGIC_V2.length), 'base64');
  const klen = buf[0] || 0;
  let off = 1 + klen;
  if (!klen || buf.length < off + SALT_LEN + IV_LEN + TAG_LEN) throw new Error('invalid key blob');
  const salt = buf.subarray(off, off + SALT_LEN); off += SALT_LEN;
  const iv = buf.subarray(off, off + IV_LEN); off += IV_LEN;
  const tag = buf.subarray(off, off + TAG_LEN); off += TAG_LEN;
  const decipher = createDecipheriv('aes-256-gcm', deriveBlobKeyV2(secret, userId, salt), iv);
  decipher.setAAD(aadFor(userId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(buf.subarray(off)), decipher.final()]).toString('utf8');
}

export function maskSecret(value) {
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
}

/** Normalize optional secret inputs: empty/whitespace strings ⇒ null. */
function cleanSecret(v) {
  return typeof v === 'string' && v.trim() ? v : null;
}

/**
 * Key manager — the single place that knows how to encrypt/decrypt at rest.
 * `secret` is the JWT secret (legacy v1 read path + fallback); `encSecret` is the
 * dedicated API_KEY_ENCRYPTION_SECRET used for ALL new writes when present.
 * Rotation: keep the old secret as `encPreviousSecret` (+ its keyId) until every
 * stored blob has been re-encrypted (`needsRotation()` drives lazy re-encrypt).
 *
 * @param {{ secret?: string, encSecret?: string|null, encKeyId?: string|null,
 *           encPreviousSecret?: string|null, encPreviousKeyId?: string|null }} [opts]
 */
export function createKeyManager({ secret, encSecret = null, encKeyId = null, encPreviousSecret = null, encPreviousKeyId = null } = {}) {
  const jwtSecret = cleanSecret(secret);
  const dedicated = cleanSecret(encSecret);
  const writeSecret = dedicated || jwtSecret;
  const currentKeyId = cleanSecret(encKeyId) || (dedicated ? DEFAULT_KEY_ID : KEY_ID_JWT_FALLBACK);
  const keyring = new Map();
  if (writeSecret) keyring.set(currentKeyId, writeSecret);
  // Blobs written while no dedicated secret was configured carry the jwt1 keyId.
  if (jwtSecret) keyring.set(KEY_ID_JWT_FALLBACK, jwtSecret);
  const prevSecret = cleanSecret(encPreviousSecret);
  if (prevSecret) keyring.set(cleanSecret(encPreviousKeyId) || 'ek0', prevSecret);

  return {
    /** keyId used for new writes (null when no secret material is configured). */
    keyId: writeSecret ? currentKeyId : null,
    /** true when a dedicated encryption secret is in use (not the JWT fallback). */
    dedicated: Boolean(dedicated),
    encrypt(plain, userId) {
      if (!writeSecret) {
        throw new Error('no encryption secret configured — set API_KEY_ENCRYPTION_SECRET (or provide the JWT secret)');
      }
      return encryptKeyV2(plain, { secret: writeSecret, userId, keyId: currentKeyId });
    },
    decrypt(blob, userId) {
      const keyId = parseKeyId(blob);
      if (keyId === null) {
        // v1 legacy blob — encrypted with the JWT secret.
        if (!jwtSecret) throw new Error('legacy key blob requires the JWT secret to decrypt');
        return decryptKey(blob, deriveMasterKey(jwtSecret, userId));
      }
      const keySecret = keyring.get(keyId);
      if (!keySecret) {
        throw new Error(`unknown encryption key id "${keyId}" — add its secret via API_KEY_ENCRYPTION_SECRET_PREVIOUS`);
      }
      return decryptKeyV2(blob, { secret: keySecret, userId });
    },
    /** true when the blob is legacy (v1) or written under an older keyring entry. */
    needsRotation(blob) {
      const keyId = parseKeyId(blob);
      return keyId === null || keyId !== currentKeyId;
    },
  };
}

/**
 * Build a key manager from explicit options with environment fallback (BSEC-001):
 *   API_KEY_ENCRYPTION_SECRET            — dedicated secret for new writes
 *   API_KEY_ENCRYPTION_KEY_ID            — optional keyId label (default "ek1")
 *   API_KEY_ENCRYPTION_SECRET_PREVIOUS   — read-only secret kept during rotation
 *   API_KEY_ENCRYPTION_PREVIOUS_KEY_ID   — keyId of the previous secret (default "ek0")
 */
export function keyManagerFromEnv({ secret, encSecret, encKeyId, encPreviousSecret, encPreviousKeyId, env = process.env } = {}) {
  return createKeyManager({
    secret,
    encSecret: encSecret ?? env?.API_KEY_ENCRYPTION_SECRET,
    encKeyId: encKeyId ?? env?.API_KEY_ENCRYPTION_KEY_ID,
    encPreviousSecret: encPreviousSecret ?? env?.API_KEY_ENCRYPTION_SECRET_PREVIOUS,
    encPreviousKeyId: encPreviousKeyId ?? env?.API_KEY_ENCRYPTION_PREVIOUS_KEY_ID,
  });
}

