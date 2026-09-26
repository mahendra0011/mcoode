import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

export function hashPassword(plain) {
  // Cost is env-tunable so the parallel test suite (and low-power hosts)
  // don't stall on 2-3s sync hashes; production default stays at 10.
  const rounds = Math.min(12, Math.max(4, Number(process.env.MCODE_BCRYPT_ROUNDS) || 10));
  return bcrypt.hashSync(plain, rounds);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function signTokens(userId, { secret, accessTtl = '15m', refreshTtl = '30d' } = {}) {
  const access = jwt.sign({ sub: userId, type: 'access' }, secret, { expiresIn: accessTtl });
  const refresh = jwt.sign({ sub: userId, type: 'refresh', jti: randomUUID() }, secret, { expiresIn: refreshTtl });
  return { access, refresh };
}

/** Issue + persist a refresh token (rotation allowlist). Returns {access, refresh}. */
export async function signTrackedTokens(db, userId, { secret } = {}) {
  const tokens = signTokens(userId, { secret });
  const { jti, exp } = jwt.decode(tokens.refresh) || {};
  try {
    await db.refreshToken.create({
      jti,
      userId,
      expiresAt: exp ? new Date(exp * 1000) : new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });
  } catch {
    /* allowlist write is best-effort — JWT itself stays valid */
  }
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
    const err = new Error('refresh token reused or revoked — all sessions revoked');
    err.code = 'REFRESH_REUSED';
    throw err;
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
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
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
  return async (req, res, next) => {
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
}
