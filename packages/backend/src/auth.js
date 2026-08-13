import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function signTokens(userId, { secret, accessTtl = '15m', refreshTtl = '30d' } = {}) {
  const access = jwt.sign({ sub: userId, type: 'access' }, secret, { expiresIn: accessTtl });
  const refresh = jwt.sign({ sub: userId, type: 'refresh' }, secret, { expiresIn: refreshTtl });
  return { access, refresh };
}

export function verifyToken(token, secret) {
  return jwt.verify(token, secret);
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
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

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
