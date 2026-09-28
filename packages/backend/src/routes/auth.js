import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { hashPassword, verifyPassword, hashOtpCode, verifyOtpCode, signTrackedTokens, rotateRefreshToken, setAuthCookies, clearAuthCookies, readAuthCookies, authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { validate } from '../validate.js';
import { sendMail, isMailEnabled } from '../mailer.js';

const OTP_TTL_MS = 10 * 60 * 1000;
// AUTH-002: 3 attempts per code (was 5) — 6-digit codes only survive
// ~3M guesses/day theoretical max; tighter window, same UX.
const OTP_MAX_ATTEMPTS = 3;
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
      // AUTH-003/004: sweep expired windows first; only then evict LRU.
      for (const [k, v] of sendLog) {
        if (now - v.windowStart > OTP_SEND_WINDOW_MS) sendLog.delete(k);
        if (sendLog.size <= SENDLOG_MAX_KEYS) break;
      }
      if (sendLog.size > SENDLOG_MAX_KEYS) {
        // AUTH-004: true LRU — evict least recently used (first key in
        // insertion-ordered Map after access-order maintenance below).
        sendLog.delete(sendLog.keys().next().value);
      }
    }
    return false;
  }
  // AUTH-004: maintain access order — move to end (most recently used)
  sendLog.delete(email);
  sendLog.set(email, row);
  row.count += 1;
  return row.count > OTP_SEND_LIMIT;
}

/** @param {{ secret?: string }} opts */
export function authRoutes({ secret } = {}) {
  const router = Router();

  router.post('/send-otp', validate('sendOtp'), async (req, res, next) => {
    try {
      const { email, intent } = req.body;
      const users = db().user;
      // AUTH-005: uniform response — existence is never revealed here.
      // Signup mail goes only to the address owner; login/reset for unknown
      // addresses return success without sending anything.
      const existingUser = await users.findOne({ email });
      if (!existingUser && intent !== 'signup') {
        return res.json({ ok: true, expiresInSec: OTP_TTL_MS / 1000 });
      }
      if (await rateLimited(email)) {
        return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'too many OTP requests — wait a few minutes' } });
      }
      // AUTH-002/020: 8 digits (100x the space of 6) and never an
      // all-identical run (00000000 looks like a placeholder and is every
      // attacker's first guess).
      let code = String(randomInt(0, 100_000_000)).padStart(8, '0');
      if (/^(\d)\1{7}$/.test(code)) {
        code = String((Number(code) + 11111111) % 100_000_000).padStart(8, '0');
      }
      const codeHash = hashOtpCode(code, secret);
      await db().otp.deleteMany({ email, intent });
      await db().otp.create({ email, codeHash, intent, expiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0 });
      const mail = await sendMail({
        to: email,
        subject: 'mcode verification code',
        text: `Your mcode ${intent} code is ${code}. It expires in 10 minutes.`
      });
      // AUTH-007: dev OTP echo requires an explicit opt-in, not just
      // NODE_ENV=test (which must never enable it in a real deployment).
      const dev = process.env.NODE_ENV === 'test' && process.env.MCODE_DEV_OTP === '1';
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
      // AUTH-008: password-reset codes are single-purpose — they verify here
      // only for signup/login. Use /reset-password for intent 'reset'.
      // AUTH-005: signup for an existing address is idempotent — a valid OTP
      // proves email ownership, so it logs into the existing account instead
      // of leaking EMAIL_TAKEN.
      if (intent !== 'signup' && intent !== 'login') {
        return res.status(400).json({ error: { code: 'WRONG_INTENT', message: 'this code was issued for password reset — use /reset-password' } });
      }
      const pending = await db().otp.findOne({ email, intent });
      if (!pending || new Date(pending.expiresAt) < new Date()) {
        return res.status(400).json({ error: { code: 'OTP_EXPIRED', message: 'code expired — request a new one' } });
      }
      if (pending.attempts >= OTP_MAX_ATTEMPTS) {
        // 1054: exhausted codes are destroyed, not left for further guessing.
        await db().otp.deleteOne({ _id: pending._id }).catch(() => {});
        return res.status(400).json({ error: { code: 'OTP_EXPIRED', message: 'too many attempts — request a new code' } });
      }
      if (!(await verifyOtpCode(otp, pending.codeHash, secret))) {
        await db().otp.updateOne({ _id: pending._id }, { attempts: pending.attempts + 1 });
        return res.status(401).json({ error: { code: 'BAD_OTP', message: 'incorrect code' } });
      }
      await db().otp.deleteOne({ _id: pending._id });

      const users = db().user;
      let user;
      let existingAccount = false;
      if (intent === 'signup') {
        // AUTH-016: use a transaction/atomic guard to prevent TOCTOU on email uniqueness
        const existing = await users.findOne({ email }).catch(() => null);
        if (existing) {
          user = existing;
          existingAccount = true;
        } else {
          try {
            user = await users.create({
              email,
              passwordHash: await hashPassword(password),
              name,
              plan: process.env.DEFAULT_USER_PLAN || 'free',
              settings: { defaultConcurrency: 5, notifyOnBuildComplete: true, routingOverrides: {} }
            });
          } catch (err) {
            // Duplicate key error — another request created the user first
            if (err?.code === 11000) {
              user = await users.findOne({ email });
              existingAccount = true;
            } else {
              throw err;
            }
          }
        }
      } else {
        user = await users.findOne({ email });
        if (!user) {
          return res.status(401).json({ error: { code: 'BAD_CREDENTIALS', message: 'no account for this email' } });
        }
      }
      const tokens = await signTrackedTokens(db(), user._id, { secret });
      setAuthCookies(res, tokens);
      res.json({ user: { id: user._id, email: user.email, name: user.name, plan: user.plan }, existingAccount, ...tokens });
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
        passwordHash: await hashPassword(password),
        name,
        plan: process.env.DEFAULT_USER_PLAN || 'free',
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
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
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
      // AUTH-008: dedicated 'reset' intent — login/signup codes are rejected.
      // AUTH-009: new password floor (min 8) mirrors /change-password; the
      // Joi schema already enforces it, this is defense in depth.
      if (!password || password.length < 8) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'new password must be at least 8 characters' } });
      }
      const pending = await db().otp.findOne({ email, intent: 'reset' });
      if (!pending || new Date(pending.expiresAt) < new Date()) {
        return res.status(400).json({ error: { code: 'OTP_EXPIRED', message: 'code expired — request a new one via send-otp (intent: reset)' } });
      }
      if (pending.attempts >= OTP_MAX_ATTEMPTS) {
        await db().otp.deleteOne({ _id: pending._id }).catch(() => {});
        return res.status(400).json({ error: { code: 'OTP_EXPIRED', message: 'too many attempts — request a new code' } });
      }
      if (!(await verifyOtpCode(otp, pending.codeHash, secret))) {
        await db().otp.updateOne({ _id: pending._id }, { attempts: pending.attempts + 1 });
        return res.status(401).json({ error: { code: 'BAD_OTP', message: 'incorrect code' } });
      }
      const user = await db().user.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'no account for this email' } });
      }
      await db().user.updateOne({ _id: user._id }, { passwordHash: await hashPassword(password) });
      await db().otp.deleteMany({ email, intent: 'reset' });
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
      if (err?.name?.includes('Mongo') || err?.code === 'ENOTFOUND') {
        return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' } });
      }
      // AUTH-013: unexpected errors are server faults, not auth failures.
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'unexpected error during token refresh' } });
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
      const user = await db().user.findById(req.userId);
      if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'user not found' } });
      // AUTH-011: a stolen JWT alone must not be able to wipe an account.
      // GitHub-only users: set a password first via /reset-password (OTP).
      const { currentPassword } = req.body || {};
      if (!currentPassword || !(await verifyPassword(currentPassword, user.passwordHash))) {
        return res.status(401).json({ error: { code: 'PASSWORD_REQUIRED', message: 'account deletion requires your current password (GitHub-only accounts: set one via reset-password first)' } });
      }
      const email = user?.email;
      // 048: remove workspace directories too — otherwise account deletion
      // leaves orphaned gigabytes on disk with no owning record.
      try {
        const owned = await db().workspace.find({ userId: req.userId });
        if (Array.isArray(owned)) {
          const { rm } = await import('node:fs/promises');
          for (const w of owned) {
            if (w?.diskPath) await rm(w.diskPath, { recursive: true, force: true }).catch(() => {});
          }
        }
      } catch {
        /* disk cleanup is best-effort — DB deletes below still run */
      }
      await db().user.deleteOne({ _id: req.userId });
      if (db().session) await db().session.deleteMany({ userId: req.userId });
      if (db().apiKey) await db().apiKey.deleteMany({ userId: req.userId });
      if (db().userSettings) await db().userSettings.deleteMany({ userId: req.userId });
      if (db().githubAccount) await db().githubAccount.deleteMany({ userId: req.userId });
      if (db().workspace) await db().workspace.deleteMany({ userId: req.userId });
      if (db().refreshToken) await db().refreshToken.deleteMany({ userId: req.userId });
      if (db().otp && email) await db().otp.deleteMany({ email });
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
      // AUTH-012: sanitize settings — block operator injection ($keys/dots),
      // prototype pollution, and document-bloat payloads (10KB cap).
      const sanitizeSettings = (input) => {
        if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
        if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 10_240) return undefined;
        const clean = (val) => {
          if (Array.isArray(val)) return val.slice(0, 100).map(clean);
          if (val && typeof val === 'object') {
            const out = {};
            for (const [k, v] of Object.entries(val).slice(0, 100)) {
              if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
              if (k.startsWith('$') || k.includes('.')) continue;
              out[k.slice(0, 100)] = clean(v);
            }
            return out;
          }
          return typeof val === 'string' ? val.slice(0, 2000) : val;
        };
        return clean(input);
      };
      const incoming = sanitizeSettings(req.body.settings);
      const safeSettings = incoming !== undefined
        ? { ...(user.settings || {}), ...incoming }
        : undefined;
      const patch = {
        name: typeof req.body.name === 'string' ? req.body.name.slice(0, 100) : undefined,
        settings: safeSettings
      };
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
      const { currentPassword, newPassword, otp } = req.body;
      if (!newPassword) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'newPassword is required' } });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'new password must be at least 8 characters' } });
      }
      const user = await db().user.findById(req.userId);
      if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'user not found' } });
      if (currentPassword) {
        if (!(await verifyPassword(currentPassword, user.passwordHash))) {
          return res.status(401).json({ error: { code: 'BAD_CREDENTIALS', message: 'current password is incorrect' } });
        }
      } else if (otp) {
        // GH-003: passwordless (GitHub-only) accounts prove email ownership
        // with a login-intent OTP instead of a password they were never given.
        const pending = await db().otp.findOne({ email: user.email, intent: 'login' });
        if (!pending || new Date(pending.expiresAt) < new Date() ||
            !(await verifyOtpCode(otp, pending.codeHash, secret))) {
          return res.status(401).json({ error: { code: 'BAD_OTP', message: 'invalid or expired code — request one via send-otp (intent: login)' } });
        }
        await db().otp.deleteOne({ _id: pending._id }).catch(() => {});
      } else {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'currentPassword or otp is required' } });
      }
      await db().user.findByIdAndUpdate(user._id, { passwordHash: await hashPassword(newPassword) });
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
