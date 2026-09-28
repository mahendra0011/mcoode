import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';

export async function hashPassword(plain) {
  // RTR-009: async (libuv threadpool) so password hashing never blocks the
  // event loop for ~100ms per call. Cost stays env-tunable so the parallel
  // test suite (and low-power hosts) don't stall; production default is 10.
  const rounds = Math.min(12, Math.max(4, Number(process.env.MCODE_BCRYPT_ROUNDS) || 10));
  return bcrypt.hash(plain, rounds);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/** @param {string} userId
 *  @param {{ secret: string, accessTtl?: string, refreshTtl?: string }} opts
 */
export function signTokens(userId, { secret, accessTtl = '15m', refreshTtl = '30d' }) {
  const access = jwt.sign({ sub: userId, type: 'access' }, secret, { expiresIn: accessTtl });
  const refresh = jwt.sign({ sub: userId, type: 'refresh', jti: randomUUID() }, secret, { expiresIn: refreshTtl });
  return { access, refresh };
}

/** AUTH-001: OTP codes are hashed with HMAC-SHA256 (keyed, ~µs) instead of
 *  bcrypt (~100ms for a 6-digit code — 1000x waste). The digest is bound to
 *  the server secret; legacy bcrypt hashes still verify (one-time compat). */
export function hashOtpCode(code, secret) {
  return `hmac-sha256:${createHmac('sha256', String(secret)).update(`otp:${code}`).digest('hex')}`;
}

export async function verifyOtpCode(code, stored, secret) {
  if (typeof stored === 'string' && stored.startsWith('hmac-sha256:')) {
    const a = Buffer.from(hashOtpCode(code, secret));
    const b = Buffer.from(stored);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  return bcrypt.compare(code, stored); // legacy bcrypt-hashed OTPs
}

/** Issue + persist a refresh token (rotation allowlist). Returns {access, refresh}.
 *  AUTH-019: the JTI write is REQUIRED, not best-effort — returning an
 *  untracked refresh token would get all of the user's sessions revoked on
 *  first use (rotateRefreshToken treats unknown JTIs as reuse). Callers map
 *  DB errors to 503 so clients retry instead of failing closed. */
/** @param {any} db @param {string} userId @param {{ secret: string }} opts */
export async function signTrackedTokens(db, userId, { secret }) {
  const tokens = signTokens(userId, { secret });
  const { jti, exp } = jwt.decode(tokens.refresh) || {};
  await db.refreshToken.create({
    jti,
    userId,
    expiresAt: exp ? new Date(exp * 1000) : new Date(Date.now() + 30 * 24 * 3600 * 1000),
  });
  return tokens;
}

/** Rotate: consume one refresh jti, return fresh tracked tokens.
 *  Reuse of an unknown/expired jti revokes ALL of the user's sessions. */
export async function rotateRefreshToken(db, refresh, secret) {
  const payload = verifyToken(refresh, secret);
  if (payload.type !== 'refresh' || !payload.jti) throw new Error('wrong token type');
  const row = await db.refreshToken.findOne({ jti: payload.jti });
  if (!row || String(row.userId) !== String(payload.sub)) {
    try {
      await db.refreshToken.deleteMany({ userId: payload.sub });
    } catch {}
    throw Object.assign(new Error('refresh token reused or revoked — all sessions revoked'), {
      code: 'REFRESH_REUSED'
    });
  }
  await db.refreshToken.deleteOne({ jti: payload.jti });
  return signTrackedTokens(db, payload.sub, { secret });
}

export function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

function cookieFlags(maxAgeMs) {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: prod,
    path: '/',
    maxAge: maxAgeMs,
  };
}

/** httpOnly cookie pair (XSS-safe session transport; body tokens kept for compat). */
export function setAuthCookies(res, { access, refresh }) {
  res.cookie('mcode_access', access, cookieFlags(15 * 60 * 1000));
  res.cookie('mcode_refresh', refresh, cookieFlags(30 * 24 * 3600 * 1000));
}

export function clearAuthCookies(res) {
  res.clearCookie('mcode_access', { path: '/' });
  res.clearCookie('mcode_refresh', { path: '/' });
}

/** Minimal cookie parse (no extra dep) for the session cookies. */
export function readAuthCookies(req) {
  const out = {};
  const header = req.headers?.cookie;
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const raw = part.slice(i + 1).trim();
    try {
      out[part.slice(0, i).trim()] = decodeURIComponent(raw);
    } catch {
      out[part.slice(0, i).trim()] = raw; // AUTH-015: stray % must not kill parsing
    }
  }
  return out;
}

/**
 * Express middleware — validates JWT Bearer token and attaches req.userId.
 *
 * Key: on transient DB errors (connection hiccup, reconnect), returns
 * **503** instead of 401 so the client retries instead of logging out.
 * Only genuine auth failures (bad/expired token) return 401.
 */
export function authMiddleware({ secret }) {
  const mw = async (req, res, next) => {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || readAuthCookies(req).mcode_access || null;

    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'missing bearer token' } });
    }

    try {
      const payload = verifyToken(token, secret);
      if (payload.type !== 'access') throw new Error('wrong token type');
      req.userId = payload.sub;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'token expired' } });
      }
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'invalid token' } });
    }
  };
  // BSEC-002: machine-readable marker so route-policy tests can assert that
  // every non-public mount actually installs this middleware.
  mw._mcodeAuth = true;
  return mw;
}
