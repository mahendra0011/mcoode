import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { deriveMasterKey, encryptKey, decryptKey, maskSecret } from '../secret-enc.js';

export function keyRoutes({ secret }) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  // GET /keys — list user's saved API keys (masked)
  router.get('/', async (req, res, next) => {
    try {
      const keys = await db().apiKey.find({ userId: req.userId });
      const masterKey = deriveMasterKey(secret, req.userId);
      const masked = keys.map((k) => {
        let m = '';
        try { m = maskSecret(decryptKey(k.encryptedKey, masterKey)); } catch { /* skip */ }
        return {
          id: k._id,
          providerId: k.providerId,
          envVar: k.envVar || k.providerId,
          displayName: k.displayName || k.providerId,
          masked: m,
          createdAt: k.createdAt
        };
      });
      res.json({ keys: masked });
    } catch (err) {
      next(err);
    }
  });

  // POST /keys — save a provider API key
  router.post('/', async (req, res, next) => {
    try {
      const { providerId, envVar, displayName, apiKey } = req.body;
      if (!providerId || !apiKey) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'providerId and apiKey are required' } });
      }
      const masterKey = deriveMasterKey(secret, req.userId);
      const encrypted = encryptKey(apiKey, masterKey);
      await db().apiKey.create({
        userId: req.userId,
        providerId: providerId.toLowerCase(),
        envVar: envVar || `${providerId.toUpperCase()}_API_KEY`,
        displayName: displayName || providerId,
        encryptedKey: encrypted,
      });
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /keys/:id — remove a provider API key
  router.delete('/:id', async (req, res, next) => {
    try {
      const result = await db().apiKey.deleteOne({ _id: req.params.id, userId: req.userId });
      if (!result.deletedCount) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'key not found' } });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // GET /keys/models — list all available models from configured providers
  router.get('/models', async (req, res, next) => {
    try {
      const keys = await db().apiKey.find({ userId: req.userId });
      if (keys.length === 0) {
        return res.json({ models: [], providers: [], hasKeys: false });
      }

      const masterKey = deriveMasterKey(secret, req.userId);
      const secrets = {};
      for (const k of keys) {
        try {
          secrets[k.envVar] = decryptKey(k.encryptedKey, masterKey);
        } catch {
          /* skip undecryptable key */
        }
      }

      // Use CLI's provider factory to list models
      const { getAllAdapters } = await import('mcode-cli/providers');
      const adapters = getAllAdapters(secrets);
      const result = [];
      const providers = [];
      for (const adapter of adapters) {
        try {
          if (adapter.kind === 'local') continue;
          
          const ok = await adapter.isAvailable();
          if (!ok) continue;
          const models = await adapter.listModels();
          providers.push({ id: adapter.id, displayName: adapter.displayName, kind: adapter.kind });
          for (const m of models) {
            result.push({ ref: `${adapter.id}:${m.id}`, provider: adapter.id, name: m.name, model: m.id, free: m.free, scores: m.scores });
          }
        } catch {
          /* skip unreachable provider */
        }
      }
      res.json({ models: result, providers, hasKeys: true });
    } catch (err) {
      next(err);
    }
  });

  // POST /keys/test — verify a key against a provider
  router.post('/test', async (req, res, next) => {
    try {
      const { providerId, apiKey } = req.body;
      if (!providerId || !apiKey) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'providerId and apiKey are required' } });
      }
      const { getAllAdapters } = await import('mcode-cli/providers');
      const adapters = getAllAdapters({ [`${providerId.toUpperCase()}_API_KEY`]: apiKey });
      const adapter = adapters.find((a) => a.id === providerId);
      if (!adapter) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'unknown provider' } });
      }
      const valid = await adapter.testKey(apiKey);
      res.json({ valid });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
