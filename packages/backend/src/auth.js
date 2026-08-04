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

export function authMiddleware({ secret }) {
  return (req, res, next) => {
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
    } catch {
      res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'invalid or expired token' } });
    }
  };
}
