import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { hashPassword, verifyPassword, signTrackedTokens, rotateRefreshToken, setAuthCookies, clearAuthCookies, readAuthCookies, authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { validate } from '../validate.js';
import { sendMail, isMailEnabled } from '../mailer.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_SEND_WINDOW_MS = 10 * 60 * 1000;
const OTP_SEND_LIMIT = 5;

const sendLog = new Map();
const SENDLOG_MAX_KEYS = 5000;

// OTP send throttle: Redis-backed when available (multi-instance safe),
// in-memory capped Map fallback for single-process dev/test.
async function rateLimited(email) {
  try {
    const { cache } = await import('../cache.js');
    const c = cache();
    if (c.mode === 'redis') {
      const key = `otp:send:${email}`;
      const count = await c.incr(key, OTP_SEND_WINDOW_MS / 1000);
      return count > OTP_SEND_LIMIT;
    }
  } catch {}
  const now = Date.now();
  const row = sendLog.get(email);
  if (!row || now - row.windowStart > OTP_SEND_WINDOW_MS) {
    sendLog.set(email, { windowStart: now, count: 1 });
    if (sendLog.size > SENDLOG_MAX_KEYS) {
      const oldest = sendLog.keys().next().value;
      sendLog.delete(oldest);
    }
    return false;
  }
  row.count += 1;
  return row.count > OTP_SEND_LIMIT;
}

export function authRoutes({ secret }) {
  const router = Router();

  router.post('/send-otp', validate('sendOtp'), async (req, res, next) => {
    try {
      const { email, intent } = req.body;
      const users = db().user;
      if (intent === 'signup' && await users.findOne({ email })) {
        return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'email already registered — try login' } });
      }
      if (intent === 'login' && !await users.findOne({ email })) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'no account found for this email — try signup' } });
      }
      if (await rateLimited(email)) {
        return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'too many OTP requests — wait a few minutes' } });
      }
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const codeHash = hashPassword(code);
      await db().otp.deleteMany({ email, intent });
      await db().otp.create({ email, codeHash, intent, expiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0 });
      const mail = await sendMail({
        to: email,
        subject: `mcode verification code: ${code}`,
        text: `Your mcode ${intent} code is ${code}. It expires in 10 minutes.`
      });
      const dev = process.env.NODE_ENV === 'test';
      res.json({
        ok: true,
        expiresInSec: OTP_TTL_MS / 1000,
        delivered: mail.delivered,
        devOtp: dev ? code : undefined
      });
    } catch (err) {
      // DB hiccup — return 503 so client retries
      if (err?.name?.includes('Mongo') || err?.code === 'ENOTFOUND') {
        return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' } });
      }
      next(err);
    }
  });

  router.post('/verify-otp', validate('verifyOtp'), async (req, res, next) => {
    try {
      const { email, otp, intent, name, password } = req.body;
      const pending = await db().otp.findOne({ email, intent });
      if (!pending || new Date(pending.expiresAt) < new Date()) {
        return res.status(400).json({ error: { code: 'OTP_EXPIRED', message: 'code expired — request a new one' } });
      }
      if (pending.attempts >= OTP_MAX_ATTEMPTS) {
        return res.status(400).json({ error: { code: 'OTP_EXPIRED', message: 'too many attempts — request a new code' } });
      }
      if (!verifyPassword(otp, pending.codeHash)) {
        await db().otp.updateOne({ _id: pending._id }, { attempts: pending.attempts + 1 });
        return res.status(401).json({ error: { code: 'BAD_OTP', message: 'incorrect code' } });
      }
      await db().otp.deleteOne({ _id: pending._id });

      const users = db().user;
      let user;
      if (intent === 'signup') {
        if (await users.findOne({ email })) {
          return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'email already registered' } });
        }
        user = await users.create({
          email,
          passwordHash: hashPassword(password),
          name,
          plan: 'free',
          settings: { defaultConcurrency: 5, notifyOnBuildComplete: true, routingOverrides: {} }
        });
      } else {
        user = await users.findOne({ email });
        if (!user) {
          return res.status(401).json({ error: { code: 'BAD_CREDENTIALS', message: 'no account for this email' } });
        }
      }
      const tokens = await signTrackedTokens(db(), user._id, { secret });
      setAuthCookies(res, tokens);
      res.json({ user: { id: user._id, email: user.email, name: user.name, plan: user.plan }, ...tokens });
    } catch (err) {
      // DB hiccup during OTP verify — return 503 so client retries
      if (err?.name?.includes('Mongo') || err?.code === 'ENOTFOUND') {
        return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' } });
      }
      next(err);
    }
  });

  router.post('/signup', validate('signup'), async (req, res, next) => {
    try {
      const { email, password, name } = req.body;
      const users = db().user;
      if (await users.findOne({ email })) {
        return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'email already registered' } });
      }
      const user = await users.create({
        email,
        passwordHash: hashPassword(password),
        name,
        plan: 'free',
        settings: { defaultConcurrency: 5, notifyOnBuildComplete: true, routingOverrides: {} }
      });
      const tokens = await signTrackedTokens(db(), user._id, { secret });
      setAuthCookies(res, tokens);
      res.status(201).json({ user: { id: user._id, email, name, plan: user.plan }, ...tokens });
    } catch (err) {
      // DB hiccup is not a validation error — return 503 so client retries
      if (err?.name?.includes('Mongo') || err?.code === 'ENOTFOUND') {
        return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' } });
      }
      next(err);
    }
  });

  router.post('/login', validate('login'), async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const users = db().user;
      const user = await users.findOne({ email });
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: { code: 'BAD_CREDENTIALS', message: 'invalid email or password' } });
      }
      const tokens = await signTrackedTokens(db(), user._id, { secret });
      setAuthCookies(res, tokens);
      res.json({ user: { id: user._id, email: user.email, name: user.name, plan: user.plan }, ...tokens });
    } catch (err) {
      // DB hiccup is not an auth failure — return 503 so client retries
      if (err?.name?.includes('Mongo') || err?.code === 'ENOTFOUND') {
        return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' } });
      }
      next(err);
    }
  });

  router.post('/reset-password', validate('resetPassword'), async (req, res, next) => {
    try {
      const { email, otp, password } = req.body;
      const pending = await db().otp.findOne({ email, intent: 'login' });
      if (!pending || new Date(pending.expiresAt) < new Date()) {
        return res.status(400).json({ error: { code: 'OTP_EXPIRED', message: 'code expired — request a new one via send-otp (intent: login)' } });
      }
      if (pending.attempts >= OTP_MAX_ATTEMPTS) {
        return res.status(400).json({ error: { code: 'OTP_EXPIRED', message: 'too many attempts — request a new code' } });
      }
      if (!verifyPassword(otp, pending.codeHash)) {
        await db().otp.updateOne({ _id: pending._id }, { attempts: pending.attempts + 1 });
        return res.status(401).json({ error: { code: 'BAD_OTP', message: 'incorrect code' } });
      }
      const user = await db().user.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'no account for this email' } });
      }
      await db().user.updateOne({ _id: user._id }, { passwordHash: hashPassword(password) });
      await db().otp.deleteMany({ email, intent: 'login' });
      await db().refreshToken.deleteMany({ userId: user._id });
      res.json({ ok: true });
    } catch (err) {
      if (err?.name?.includes('Mongo') || err?.code === 'ENOTFOUND') {
        return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' } });
      }
      next(err);
    }
  });

  router.post('/refresh', validate('refresh'), async (req, res, _next) => {
    try {
      const incoming = req.body.refresh || readAuthCookies(req).mcode_refresh;
      if (!incoming) {
        return res.status(401).json({ error: { code: 'INVALID_REFRESH', message: 'invalid refresh token' } });
      }
      const tokens = await rotateRefreshToken(db(), incoming, secret);
      setAuthCookies(res, tokens);
      res.json(tokens);
    } catch (err) {
      if (err?.code === 'REFRESH_REUSED') {
        return res.status(401).json({ error: { code: 'REFRESH_REUSED', message: err.message } });
      }
      res.status(401).json({ error: { code: 'INVALID_REFRESH', message: 'invalid refresh token' } });
    }
  });

  // Session management — list active refresh sessions + revoke one/all.
  router.get('/sessions', authMiddleware({ secret }), async (req, res, next) => {
    try {
      const rows = await db().refreshToken.find({ userId: req.userId }, { createdAt: -1 });
      res.json({ sessions: rows.map((r) => ({ jti: r.jti, createdAt: r.createdAt, expiresAt: r.expiresAt })) });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/sessions/:jti', authMiddleware({ secret }), async (req, res, next) => {
    try {
      const row = await db().refreshToken.findOne({ jti: req.params.jti });
      if (!row || String(row.userId) !== String(req.userId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'session not found' } });
      }
      await db().refreshToken.deleteOne({ jti: req.params.jti });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/sessions', authMiddleware({ secret }), async (req, res, next) => {
    try {
      await db().refreshToken.deleteMany({ userId: req.userId });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', authMiddleware({ secret }), async (req, res, next) => {
    try {
      const user = await db().user.findById(req.userId);
      if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'user not found' } });
      res.json({ id: user._id, email: user.email, name: user.name, plan: user.plan, settings: user.settings });
    } catch (err) {
      // DB hiccup (reconnect/restart) is not an auth failure — return 503 so
      // the client retries instead of logging the user out. (Follows mediCore pattern.)
      if (err?.name?.includes('Mongo') || err?.code === 'ENOTFOUND') {
        return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' } });
      }
      next(err);
    }
  });

  router.delete('/me', authMiddleware({ secret }), async (req, res, next) => {
    try {
      await db().user.deleteOne({ _id: req.userId });
      if (db().session) await db().session.deleteMany({ userId: req.userId });
      if (db().apiKey) await db().apiKey.deleteMany({ userId: req.userId });
      if (db().userSettings) await db().userSettings.deleteMany({ userId: req.userId });
      if (db().githubAccount) await db().githubAccount.deleteMany({ userId: req.userId });
      if (db().workspace) await db().workspace.deleteMany({ userId: req.userId });
      if (db().refreshToken) await db().refreshToken.deleteMany({ userId: req.userId });
      if (db().otp) await db().otp.deleteMany({ email: req.user?.email });
      clearAuthCookies(res);
      res.json({ ok: true });
    } catch (err) {
      if (err?.name?.includes('Mongo') || err?.code === 'ENOTFOUND') {
        return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' } });
      }
      next(err);
    }
  });

  router.patch('/me', authMiddleware({ secret }), async (req, res, next) => {
    try {
      const user = await db().user.findById(req.userId);
      if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'user not found' } });
      const patch = { name: req.body.name, settings: req.body.settings };
      const merged = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      const updated = await db().user.findByIdAndUpdate(user._id, merged);
      res.json({ id: updated._id, email: updated.email, name: updated.name, plan: updated.plan, settings: updated.settings });
    } catch (err) {
      if (err?.name?.includes('Mongo') || err?.code === 'ENOTFOUND') {
        return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' } });
      }
      next(err);
    }
  });

  router.post('/change-password', authMiddleware({ secret }), async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'currentPassword and newPassword are required' } });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'new password must be at least 8 characters' } });
      }
      const user = await db().user.findById(req.userId);
      if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'user not found' } });
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return res.status(401).json({ error: { code: 'BAD_CREDENTIALS', message: 'current password is incorrect' } });
      }
      await db().user.findByIdAndUpdate(user._id, { passwordHash: hashPassword(newPassword) });
      res.json({ ok: true });
    } catch (err) {
      if (err?.name?.includes('Mongo') || err?.code === 'ENOTFOUND') {
        return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' } });
      }
      next(err);
    }
  });

  return router;
}
