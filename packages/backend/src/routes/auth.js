import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { hashPassword, verifyPassword, signTokens, verifyToken, authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { validate } from '../validate.js';
import { sendMail, isMailEnabled } from '../mailer.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_SEND_WINDOW_MS = 10 * 60 * 1000;
const OTP_SEND_LIMIT = 5;

const sendLog = new Map();

function rateLimited(email) {
  const now = Date.now();
  const row = sendLog.get(email);
  if (!row || now - row.windowStart > OTP_SEND_WINDOW_MS) {
    sendLog.set(email, { windowStart: now, count: 1 });
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
      if (rateLimited(email)) {
        return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'too many OTP requests — wait a few minutes' } });
      }
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const codeHash = hashPassword(code);
      await db().otp.deleteOne({ email, intent });
      await db().otp.create({ email, codeHash, intent, expiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0 });
      const mail = await sendMail({
        to: email,
        subject: `mcode verification code: ${code}`,
        text: `Your mcode ${intent} code is ${code}. It expires in 10 minutes.`
      });
      const dev = process.env.NODE_ENV !== 'production';
      res.json({
        ok: true,
        expiresInSec: OTP_TTL_MS / 1000,
        delivered: mail.delivered,
        devOtp: dev ? code : undefined
      });
    } catch (err) {
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
      const tokens = signTokens(user._id, { secret });
      res.json({ user: { id: user._id, email: user.email, name: user.name, plan: user.plan }, ...tokens });
    } catch (err) {
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
      const tokens = signTokens(user._id, { secret });
      res.status(201).json({ user: { id: user._id, email, name, plan: user.plan }, ...tokens });
    } catch (err) {
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
      const tokens = signTokens(user._id, { secret });
      res.json({ user: { id: user._id, email: user.email, name: user.name, plan: user.plan }, ...tokens });
    } catch (err) {
      next(err);
    }
  });

  router.post('/refresh', validate('refresh'), async (req, res, _next) => {
    try {
      const payload = verifyToken(req.body.refresh, secret);
      if (payload.type !== 'refresh') throw new Error('wrong token type');
      const tokens = signTokens(payload.sub, { secret });
      res.json(tokens);
    } catch {
      res.status(401).json({ error: { code: 'INVALID_REFRESH', message: 'invalid refresh token' } });
    }
  });

  router.get('/me', authMiddleware({ secret }), async (req, res, next) => {
    try {
      const user = await db().user.findById(req.userId);
      if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'user not found' } });
      res.json({ id: user._id, email: user.email, name: user.name, plan: user.plan, settings: user.settings });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/me', authMiddleware({ secret }), async (req, res, next) => {
    try {
      await db().user.deleteOne({ _id: req.userId });
      if (db().session) await db().session.deleteOne({ userId: req.userId });
      if (db().apiKey) await db().apiKey.deleteOne({ userId: req.userId });
      if (db().userSettings) await db().userSettings.deleteOne({ userId: req.userId });
      if (db().githubAccount) await db().githubAccount.deleteOne({ userId: req.userId });
      res.json({ ok: true });
    } catch (err) {
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
      next(err);
    }
  });

  return router;
}
