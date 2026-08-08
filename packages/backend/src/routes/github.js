import { Router } from 'express';
import axios from 'axios';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { deriveMasterKey, encryptKey, decryptKey } from '../secret-enc.js';

export function githubRoutes({ secret }) {
  const router = Router();
  // We attach authMiddleware selectively
  return router;
}

export function githubAuthRoutes({ secret }) {
  const router = Router();
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  // The frontend needs to know where to redirect, or we can just serve the redirect here.
  // /api/v1/auth/github
  router.get('/', (req, res) => {
    if (!CLIENT_ID) {
       return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'GITHUB_CLIENT_ID not set' }});
    }
    const redirectUri = `http://localhost:3100/api/v1/auth/github/callback`; // Should ideally be dynamic based on req.get('host')
    const scope = 'repo user'; // We need repo access for cloning private repos and pushing
    // Pass the token we received from the frontend as state so we know who they are on callback
    const state = req.query.token || ''; 
    const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
    res.redirect(url);
  });

  router.get('/callback', async (req, res, next) => {
    const { code, state: authToken } = req.query;
    if (!code) {
      return res.status(400).send('Missing code');
    }
    try {
      // 1. Verify the state/authToken to get userId
      let userId;
      try {
        const { verify } = await import('jsonwebtoken');
        const decoded = verify(authToken, secret);
        userId = decoded.sub;
      } catch (err) {
        return res.status(401).send('Invalid or missing state token for authentication');
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

      // 4. Save to DB
      const masterKey = deriveMasterKey(secret, userId);
      const encryptedToken = encryptKey(accessToken, masterKey);

      // Upsert
      const existing = await db().githubAccount.findOne({ userId });
      if (existing) {
         await db().githubAccount.updateOne({ _id: existing._id }, { accessToken: encryptedToken, username, avatarUrl });
      } else {
         await db().githubAccount.create({ userId, accessToken: encryptedToken, username, avatarUrl });
      }

      // 5. Redirect back to frontend IDE
      res.redirect('http://localhost:5174/ai/chat?github_connected=1');

    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function githubApiRoutes({ secret }) {
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
      
      const masterKey = deriveMasterKey(secret, req.userId);
      const accessToken = decryptKey(account.accessToken, masterKey);
      
      const response = await axios.get('https://api.github.com/user/repos?sort=updated&per_page=100', {
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
