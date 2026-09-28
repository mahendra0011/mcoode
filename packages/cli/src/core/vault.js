import { hostname, userInfo } from 'node:os';
import { scryptSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFile, writeFile, chmod, rename } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { VAULT_PATH, ensureDirs } from './store.js';

/**
 * Encrypted secrets vault ("secrets stay local").
 * AES-256-GCM; key derived via scrypt from a user-supplied passphrase
 * plus a random per-vault salt stored in the file header.
 *
 * SEC-003: hostname+username alone is guessable, so the key now requires
 * a real passphrase. On first use, the caller must prompt interactively.
 * Non-interactive environments must pass an explicit passphrase.
 */
const MAGIC = 'MCODEV2:';
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

let _machineIdCache = null;
let _passphraseWarned = false;

export function getMachineId() {
  if (_machineIdCache !== null) return _machineIdCache;
  for (const p of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
    try {
      if (existsSync(p)) {
        const v = readFileSync(p, 'utf8').trim();
        if (v) { _machineIdCache = v; return v; }
      }
    } catch { /* try next */ }
  }
  _machineIdCache = '';
  return '';
}

function warnNoPassphrase() {
  if (_passphraseWarned) return;
  _passphraseWarned = true;
  process.stderr.write(
    '[vault] WARNING: no passphrase set. Vault encryption is weak without one.\n' +
    '  Set MCODE_VAULT_PASSWORD or use `mcode env add --prompt-passphrase`.\n'
  );
}

/**
 * Require a real passphrase — fail closed if none provided.
 * SEC-003: empty passphrase means the key is derivable from non-secret
 * hostname/username, so we refuse to operate without one.
 */
function requirePassphrase(passphrase) {
  if (process.env.MCODE_VAULT_ALLOW_WEAK === '1') {
    warnNoPassphrase();
    return passphrase || 'mcode-vault-weak';
  }
  if (!passphrase) {
    throw new Error(
      'A vault passphrase is required. Set MCODE_VAULT_PASSWORD or use `mcode env add --prompt-passphrase`.\n' +
      '  Or set MCODE_VAULT_ALLOW_WEAK=1 to allow weak encryption (not recommended).'
    );
  }
  return passphrase;
}

function machinePassword(passphrase = '') {
  const masterSecret = requirePassphrase(passphrase);
  const machineId = getMachineId();
  const machinePart = machineId || `${hostname()}:${userInfo().username}`;
  return `mcode-vault-v2:${machinePart}:${hostname()}:${userInfo().username}:${masterSecret}`;
}

/** Best-effort OS keychain lookup (macOS Keychain / Windows Credential Manager
 *  via optional `keytar`). Returns stored secret or null. Never throws.
 *  Usage: MCODE_VAULT_PASSWORD=$(keychain lookup) or
 *  `const kc = await getKeychainMaster(); await loadVault(kc || '')`.
 *  The `keytar` package is optional — install it to enable OS-keychain mode. */
export async function keychainGet(account = 'mcode-vault-master') {
  try {
    const mod = await import(/** @type {string} */ ('keytar')).catch(() => null);
    const keytar = mod?.default || mod;
    if (!keytar?.getPassword) return null;
    return await keytar.getPassword('mcode', account).catch(() => null);
  } catch {
    return null;
  }
}

function legacyKey(passphrase = '') {
  return scryptSync(`mcode-vault-v1:${hostname()}:${userInfo().username}${requirePassphrase(passphrase)}`, 'mcode', 32);
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

/**
 * Get the vault passphrase from env or keychain.
 * SEC-003: returns empty string if not configured — callers must handle
 * the requirePassphrase() error and prompt the user.
 */
export async function getVaultPassphrase() {
  if (process.env.MCODE_VAULT_PASSWORD) return process.env.MCODE_VAULT_PASSWORD;
  const kc = await keychainGet();
  return kc || '';
}

export async function loadVault(passphrase = process.env.MCODE_VAULT_PASSWORD || '') {
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

export async function saveVault(secrets, passphrase = process.env.MCODE_VAULT_PASSWORD || '') {
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

export async function vaultSet(key, value, passphrase = process.env.MCODE_VAULT_PASSWORD || '') {
  const secrets = await loadVault(passphrase);
  secrets[key] = value;
  await saveVault(secrets, passphrase);
}

export async function vaultGet(key, passphrase = process.env.MCODE_VAULT_PASSWORD || '') {
  const secrets = await loadVault(passphrase);
  return secrets[key];
}

export async function vaultDelete(key, passphrase = process.env.MCODE_VAULT_PASSWORD || '') {
  const secrets = await loadVault(passphrase);
  delete secrets[key];
  await saveVault(secrets, passphrase);
  return secrets;
}

export async function vaultList(passphrase = process.env.MCODE_VAULT_PASSWORD || '') {
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
  return `••••••${value.slice(-2)}`;
}
