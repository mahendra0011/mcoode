import { hostname, userInfo } from 'node:os';
import { scryptSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { VAULT_PATH, ensureDirs } from './store.js';

/**
 * Encrypted secrets vault ("secrets stay local").
 * AES-256-GCM; key derived from a machine-bound scrypt of hostname+user
 * (+ optional user passphrase). No plaintext keys are ever written to disk.
 */
function machineKey(passphrase = '') {
  const salt = `mcode-vault-v1:${hostname()}:${userInfo().username}`;
  return scryptSync(salt + passphrase, 'mcode', 32);
}

export async function loadVault(passphrase = '') {
  await ensureDirs();
  try {
    const buf = Buffer.from(await readFile(VAULT_PATH, 'utf8'), 'base64');
    if (buf.length < 28) return {};
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', machineKey(passphrase), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(plain.toString('utf8'));
  } catch {
    return {};
  }
}

export async function saveVault(secrets, passphrase = '') {
  await ensureDirs();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', machineKey(passphrase), iv);
  const plain = Buffer.from(JSON.stringify(secrets), 'utf8');
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  await writeFile(VAULT_PATH, Buffer.concat([iv, tag, data]).toString('base64'), 'utf8');
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
