/**
 * Environment validation — fails fast if required vars are missing.
 * Following the mediCore reference pattern: require MONGODB_URI at minimum,
 * validate JWT_SECRET strength, and exit if production config is missing.
 */

const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];
const WEAK_SECRETS = ['mcode-dev-secret-change-me', 'changeme', 'secret', 'password'];

export function validateEnv(env = process.env, { exitOnMissing = true } = {}) {
  const missing = REQUIRED.filter((k) => !env[k]);
  const warnings = [];

  if (missing.length) {
    for (const k of missing) {
      console.error(`[env] ❌ Missing required variable: ${k}`);
    }
    if (exitOnMissing && env.NODE_ENV === 'production') {
      console.error('[env] Aborting startup — required env vars missing in production.');
      process.exit(1);
    }
  }

  const secret = env.JWT_SECRET || '';
  if (!secret || WEAK_SECRETS.includes(secret)) {
    console.warn('[env] ⚠️  JWT_SECRET is the default dev secret — set a strong value in production.');
  } else if (secret.length < 32) {
    console.warn('[env] ⚠️  JWT_SECRET is short (< 32 chars) — consider a longer secret.');
    warnings.push('JWT_SECRET is too short');
  }

  const mongoUri = env.MONGODB_URI || '';
  if (mongoUri && !mongoUri.startsWith('mongodb')) {
    console.error('[env] ❌ MONGODB_URI does not start with mongodb:// or mongodb+srv://');
    if (env.NODE_ENV === 'production') process.exit(1);
  } else if (!mongoUri) {
    console.error('[env] ❌ MONGODB_URI is not set — accounts will NOT be persisted to Atlas.');
    if (env.NODE_ENV === 'production' && exitOnMissing) process.exit(1);
  } else if (mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
    console.warn('[env] ⚠️  MONGODB_URI still contains placeholder credentials.');
    warnings.push('MONGODB_URI has placeholder credentials');
  }

  return { ok: missing.length === 0, missing, warnings };
}
