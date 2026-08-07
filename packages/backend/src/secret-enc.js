import { scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Shared AES-256-GCM encryption utilities for API keys stored in MongoDB.
 * Key is derived from the server JWT secret + user ID, so each user's
 * keys are encrypted with a unique key — DB leak alone is not enough.
 */

export function deriveMasterKey(secret, userId) {
  return scryptSync(`mcode-apikey:${userId}:${secret}`, 'mcode', 32);
}

const MAGIC = 'MCCODEKEY:';
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

export function encryptKey(plain, masterKey) {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = scryptSync(masterKey.toString('hex'), salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.from(plain, 'utf8');
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob = Buffer.concat([Buffer.from(MAGIC, 'utf8'), salt, iv, tag, encrypted]).toString('base64');
  return blob;
}

export function decryptKey(blob, masterKey) {
  const buf = Buffer.from(blob, 'base64');
  let off = 0;
  if (buf.subarray(0, MAGIC.length).toString('utf8') !== MAGIC) {
    throw new Error('invalid key blob');
  }
  off += MAGIC.length;
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

export function maskSecret(value) {
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
}
