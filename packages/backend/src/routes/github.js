import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { keyManagerFromEnv } from '../secret-enc.js';

export function githubRoutes({ secret } = {}) {
  const router = Router();
  // We attach authMiddleware selectively
  return router;
}

export function githubAuthRoutes({ secret, env = process.env } = {}) {
  const router = Router();
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  // Passwordless GitHub login — no session needed. Links/creates the
  // account by verified primary email, then returns tokens via fragment.
  router.get('/login', (req, res) => {
    if (!CLIENT_ID) {
      return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'GITHUB_CLIENT_ID not set' } });
    }
    const loginRedirect = process.env.GITHUB_REDIRECT_URI || `http://localhost:3100/api/v1/auth/github/callback`;
    const stateToken = jwt.sign({ purpose: 'github_login', nonce: crypto.randomUUID() }, secret, { expiresIn: '10m', issuer: 'mcode', audience: 'mcode-github' });
    const loginUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(loginRedirect)}&scope=${encodeURIComponent('read:user user:email')}&state=${encodeURIComponent(stateToken)}`;
    res.redirect(loginUrl);
  });

  // The frontend needs to know where to redirect, or we can just serve the redirect here.
  // /api/v1/auth/github (connect: needs ?token=<access JWT> as state)
  router.get('/', (req, res) => {
    if (!CLIENT_ID) {
       return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'GITHUB_CLIENT_ID not set' }});
    }
    const redirectUri = process.env.GITHUB_REDIRECT_URI || `http://localhost:3100/api/v1/auth/github/callback`;
    const scope = 'repo user'; // We need repo access for cloning private repos and pushing
    let userState = '';
    if (req.query.token) {
      try {
        const decoded = jwt.verify(req.query.token, secret);
        userState = jwt.sign({ sub: decoded.sub, purpose: 'github_connect', nonce: crypto.randomUUID() }, secret, { expiresIn: '10m', issuer: 'mcode', audience: 'mcode-github' });
      } catch {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
      }
    } else {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Token required to connect GitHub' } });
    }
    const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(userState)}`;
    res.redirect(url);
  });

  // GH-004: redeem a single-use login code for tokens (one POST, no URLs).
  router.post('/exchange', async (req, res) => {
    try {
      const code = String(req.body?.code || '');
      if (!code) return res.status(400).json({ error: { code: 'VALIDATION', message: 'code is required' } });
      const entry = pendingLogins.get(code);
      pendingLogins.delete(code);
      if (!entry || entry.expires < Date.now()) {
        return res.status(401).json({ error: { code: 'INVALID_CODE', message: 'login code expired or already used' } });
      }
      res.json({ access: entry.access, refresh: entry.refresh });
    } catch {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'invalid exchange request' } });
    }
  });

  router.get('/callback', async (req, res, next) => {
    const { code, state: rawState } = req.query;
    if (!code) {
      return res.status(400).send('Missing code');
    }
    if (!rawState) {
      return res.status(400).send('Missing state parameter');
    }

    // GH-001: state is REQUIRED and must be server-signed (purpose-bound JWT
    // with nonce). The old `state=login` constant bypass defeated CSRF
    // protection entirely — removed. /login always issues signed state.
    let statePayload;
    try {
      statePayload = jwt.verify(rawState, secret, { issuer: 'mcode', audience: 'mcode-github' });
    } catch {
      return res.status(401).send('Invalid or expired state token for authentication');
    }

    if (statePayload.purpose === 'github_login') {
      return githubLoginCallback(req, res, next, { secret, CLIENT_ID, CLIENT_SECRET, code });
    }

    try {
      // 1. Verify the state payload to get userId
      const userId = statePayload.sub;
      if (!userId) {
        return res.status(401).send('Invalid state payload');
      }

      // 2. Exchange code for access token
      const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code
      }, {
        headers: { Accept: 'application/json' }
      });
      
      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
         return res.status(400).send('Failed to obtain access token');
      }

      // 3. Fetch user info
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      const { login: username, avatar_url: avatarUrl } = userResponse.data;

      // 4. Save to DB (BSEC-001: dedicated at-rest encryption secret when configured)
      const encryptedToken = keyManagerFromEnv({ secret, env }).encrypt(accessToken, userId);

      // Upsert
      const existing = await db().githubAccount.findOne({ userId });
      if (existing) {
         await db().githubAccount.updateOne({ _id: existing._id }, { accessToken: encryptedToken, username, avatarUrl });
      } else {
         await db().githubAccount.create({ userId, accessToken: encryptedToken, username, avatarUrl });
      }

      // 5. Redirect back to frontend IDE
      res.redirect(process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/ai/chat?github_connected=1` : 'http://localhost:3000/ai/chat?github_connected=1');

    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** Passwordless GitHub login: exchange code → verified primary email →
 *  find-or-create user → link github account → tracked tokens in fragment. */
async function githubLoginCallback(req, res, next, { secret, CLIENT_ID, CLIENT_SECRET, code }) {
  try {
    const front = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const fail = (msg) => res.redirect(`${front}/login?oauth_error=${encodeURIComponent(msg)}`);
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code
    }, { headers: { Accept: 'application/json' } });
    const ghToken = tokenResponse.data.access_token;
    if (!ghToken) return fail('github did not return an access token');
    const me = (await axios.get('https://api.github.com/user', { headers: { Authorization: `Bearer ${ghToken}` } })).data;
    let email = me.email || null;
    if (!email) {
      const emails = (await axios.get('https://api.github.com/user/emails', { headers: { Authorization: `Bearer ${ghToken}` } })).data;
      email = (Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) : null)?.email || null;
    }
    if (!email) return fail('no verified email on this github account — add one and retry');
    const { hashPassword, signTrackedTokens } = await import('../auth.js');
    const { randomBytes } = await import('node:crypto');
    let user = await db().user.findOne({ email });
    if (!user) {
      user = await db().user.create({
        email,
        passwordHash: await hashPassword(randomBytes(16).toString('hex')),
        name: me.name || me.login || email.split('@')[0],
        plan: process.env.DEFAULT_USER_PLAN || 'free',
        settings: { defaultConcurrency: 5, notifyOnBuildComplete: true, routingOverrides: {} }
      });
    } else {
      // SEC-025: if user exists but has no linked GitHub account, verify identity
      // by requiring the user to confirm via OTP before linking a new GitHub identity.
      const existingGh = await db().githubAccount.findOne({ userId: user._id });
      if (!existingGh) {
        return fail('an account with this email already exists — link GitHub from settings or login with your password first');
      }
    }
    const encryptedToken = keyManagerFromEnv({ secret }).encrypt(ghToken, user._id);
    const existing = await db().githubAccount.findOne({ userId: user._id });
    if (existing) {
      await db().githubAccount.updateOne({ _id: existing._id }, { accessToken: encryptedToken, username: me.login, avatarUrl: me.avatar_url });
    } else {
      await db().githubAccount.create({ userId: user._id, accessToken: encryptedToken, username: me.login, avatarUrl: me.avatar_url });
    }
    const tokens = await signTrackedTokens(db(), user._id, { secret });
    // GH-004: tokens never travel in URL fragments (history/extensions can
    // read them). Issue a single-use login code; the SPA exchanges it for
    // tokens over POST. Codes live 60s and burn on first read.
    const loginCode = randomBytes(32).toString('hex');
    pendingLogins.set(loginCode, { ...tokens, expires: Date.now() + 60_000 });
    if (pendingLogins.size > 1000) {
      for (const [k, v] of pendingLogins) {
        if (v.expires < Date.now()) pendingLogins.delete(k);
      }
    }
    res.redirect(`${front}/login?code=${loginCode}`);
    } catch (err) {
      // FINDING-1040: custom error handler for decrypt failures
      if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
        return res.status(401).json({ error: { code: 'REAUTH_REQUIRED', message: 'GitHub session expired — please reconnect from settings' } });
      }
      next(err);
    }
}

// Single-use OAuth login codes (GH-004). In-memory: a restart invalidates
// unredeemed codes, which is the safe direction.
const pendingLogins = new Map();

export function githubApiRoutes({ secret, env = process.env } = {}) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  // GET /api/v1/github/status - Check if connected
  router.get('/status', async (req, res, next) => {
    try {
      const account = await db().githubAccount.findOne({ userId: req.userId });
      if (!account) return res.json({ connected: false });
      res.json({ connected: true, username: account.username, avatarUrl: account.avatarUrl });
    } catch(err) {
      next(err);
    }
  });

  // POST /api/v1/github/disconnect - Disconnect GitHub account
  router.post('/disconnect', async (req, res, next) => {
    try {
      const result = await db().githubAccount.deleteOne({ userId: req.userId });
      if (!result.deletedCount) return res.json({ ok: true, message: 'no connected account' });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/github/repos - List user's repos
  router.get('/repos', async (req, res, next) => {
    try {
      const account = await db().githubAccount.findOne({ userId: req.userId });
      if (!account) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'GitHub not connected' }});
      
      const accessToken = keyManagerFromEnv({ secret, env }).decrypt(account.accessToken, req.userId);
      
      const page = Math.max(1, Number(req.query.page) || 1);
      const perPage = Math.min(100, Math.max(1, Number(req.query.per_page) || 100));
      const response = await axios.get(`https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}`, {
         headers: { Authorization: `Bearer ${accessToken}` }
      });

      // Filter properties so we only send what's needed
      const repos = response.data.map(r => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        private: r.private,
        html_url: r.html_url,
        clone_url: r.clone_url,
        default_branch: r.default_branch
      }));

      res.json({ repos });
    } catch(err) {
      next(err);
    }
  });

  return router;
}
