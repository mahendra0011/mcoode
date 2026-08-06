import { hostname, userInfo } from 'node:os';
import { scryptSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFile, writeFile, chmod, rename } from 'node:fs/promises';
import { VAULT_PATH, ensureDirs } from './store.js';

/**
 * Encrypted secrets vault ("secrets stay local").
 * AES-256-GCM; key derived via scrypt from a machine-bound passphrase
 * (hostname+user) plus a random per-vault salt stored in the file header.
 * No plaintext keys are ever written to disk.
 */
const MAGIC = 'MCODEV2:';
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

function machinePassword(passphrase = '') {
  return `mcode-vault-v2:${hostname()}:${userInfo().username}:${passphrase}`;
}

function legacyKey(passphrase = '') {
  return scryptSync(`mcode-vault-v1:${hostname()}:${userInfo().username}${passphrase}`, 'mcode', 32);
}

function deriveKey(salt, passphrase) {
  return scryptSync(machinePassword(passphrase), salt, 32);
}

function decrypt(buf, passphrase) {
  let iv;
  let tag;
  let data;
  let key;
  if (buf.subarray(0, MAGIC.length).toString('utf8') === MAGIC) {
    let off = MAGIC.length;
    const salt = buf.subarray(off, off + SALT_LEN);
    off += SALT_LEN;
    iv = buf.subarray(off, off + IV_LEN);
    off += IV_LEN;
    tag = buf.subarray(off, off + TAG_LEN);
    off += TAG_LEN;
    data = buf.subarray(off);
    key = deriveKey(salt, passphrase);
  } else {
    // legacy format (pre-salt): iv(12) + tag(16) + data, static salt
    if (buf.length < IV_LEN + TAG_LEN) throw new Error('vault too short');
    iv = buf.subarray(0, IV_LEN);
    tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    data = buf.subarray(IV_LEN + TAG_LEN);
    key = legacyKey(passphrase);
  }
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export async function loadVault(passphrase = '') {
  await ensureDirs();
  let raw;
  try {
    raw = await readFile(VAULT_PATH, 'utf8');
  } catch {
    return {};
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length === 0) return {};
  try {
    return JSON.parse(decrypt(buf, passphrase));
  } catch (err) {
    // fail closed without destroying data: the original file is left on
    // disk untouched — a later saveVault backs it up instead of clobbering.
    process.stderr.write(`[vault] could not decrypt vault (${err.message}) — treating as empty\n`);
    return {};
  }
}

export async function saveVault(secrets, passphrase = '') {
  await ensureDirs();
  // never destroy an undecryptable existing vault — move it aside first
  let existing = null;
  try {
    existing = await readFile(VAULT_PATH, 'utf8');
  } catch {
    /* no existing vault */
  }
  if (existing) {
    const buf = Buffer.from(existing, 'base64');
    if (buf.length > 0) {
      try {
        decrypt(buf, passphrase);
      } catch (err) {
        const backup = `${VAULT_PATH}.corrupt-${Date.now()}`;
        await rename(VAULT_PATH, backup).catch(() => {});
        process.stderr.write(`[vault] existing vault undecryptable — moved to ${backup} (${err.message})\n`);
      }
    }
  }
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(salt, passphrase), iv);
  const plain = Buffer.from(JSON.stringify(secrets), 'utf8');
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  await writeFile(VAULT_PATH, Buffer.concat([Buffer.from(MAGIC, 'utf8'), salt, iv, tag, data]).toString('base64'), 'utf8');
  await chmod(VAULT_PATH, 0o600).catch(() => {});
}

export async function vaultSet(key, value, passphrase = '') {
  const secrets = await loadVault(passphrase);
  secrets[key] = value;
  await saveVault(secrets, passphrase);
}

export async function vaultGet(key, passphrase = '') {
  const secrets = await loadVault(passphrase);
  return secrets[key];
}

export async function vaultDelete(key, passphrase = '') {
  const secrets = await loadVault(passphrase);
  delete secrets[key];
  await saveVault(secrets, passphrase);
  return secrets;
}

export async function vaultList(passphrase = '') {
  const secrets = await loadVault(passphrase);
  return Object.keys(secrets).map((key) => ({
    key,
    set: Boolean(secrets[key]),
    masked: maskSecret(secrets[key])
  }));
}

export function maskSecret(value) {
  if (!value) return '';
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
}
