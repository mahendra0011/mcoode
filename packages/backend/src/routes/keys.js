import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { cache } from '../cache.js';
import { deriveMasterKey, encryptKey, decryptKey, maskSecret } from '../secret-enc.js';

// TTL for cached model listings (seconds). Models don't change frequently,
// and refetching from every provider API on each call is the bottleneck.
const MODELS_CACHE_TTL = 60;

function modelsCacheKey(userId) {
  return `models:${userId}`;
}

function invalidateModelsCache(userId) {
  cache().del(modelsCacheKey(userId));
}

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
          model: k.model,
          baseUrl: k.baseUrl,
          apiFormat: k.apiFormat,
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
      const { providerId, envVar, displayName, apiKey, model, baseUrl, apiFormat } = req.body;
      if (!providerId || !apiKey) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'providerId and apiKey are required' } });
      }
      const masterKey = deriveMasterKey(secret, req.userId);
      const encrypted = encryptKey(apiKey, masterKey);

      // If a key already exists for this provider, update it instead of creating a duplicate
      const existing = await db().apiKey.findOne({
        userId: req.userId,
        providerId: providerId.toLowerCase()
      });

      if (existing) {
        await db().apiKey.updateOne(
          { _id: existing._id },
          {
            $set: {
              envVar: envVar || existing.envVar,
              displayName: displayName || existing.displayName,
              encryptedKey: encrypted,
              model: model || existing.model,
              baseUrl: baseUrl || existing.baseUrl,
              apiFormat: apiFormat || existing.apiFormat
            }
          }
        );
      } else {
        await db().apiKey.create({
          userId: req.userId,
          providerId: providerId.toLowerCase(),
          envVar: envVar || `${providerId.toUpperCase()}_API_KEY`,
          displayName: displayName || providerId,
          encryptedKey: encrypted,
          model,
          baseUrl,
          apiFormat
        });
      }
      // Invalidate model cache so the new key's models are fetched on next request
      invalidateModelsCache(req.userId);
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
      // Invalidate model cache so the deleted provider's models are removed on next request
      invalidateModelsCache(req.userId);
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

      // Check cache first — avoids re-fetching from every provider API on each call
      const cacheKey = modelsCacheKey(req.userId);
      const cached = await cache().get(cacheKey);
      if (cached) {
        return res.json(cached);
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

      // Use CLI's provider factory — adapters already have the static model catalog
      // in memory (defined in getAllAdapters). We return that directly for an INSTANT
      // response. Live API calls (listModels→httpFetch) are skipped because:
      //   1. They timeout at 60s per provider with 2 retries → UI hangs for minutes
      //   2. listModels() falls back to the static catalog on ANY failure anyway
      //   3. The static catalog is sufficient for model selection in Settings
      // Cache (60s TTL) ensures sub-millisecond response on repeat calls.
      const { getAllAdapters } = await import('mcode-cli/providers');
      const adapters = getAllAdapters(secrets);

      const result = [];
      const providerList = [];
      for (const adapter of adapters) {
        try {
          if (adapter.kind === 'local') continue;
          const hasKey = adapter.apiKey && adapter.apiKey.length > 0;
          if (!hasKey) continue;
          /* Return static catalog immediately — no network calls */
          const models = adapter.models || [];
          if (models.length === 0) continue;
          providerList.push({ id: adapter.id, displayName: adapter.displayName, kind: adapter.kind, keyConfigured: true, available: true });
          for (const m of models) {
            result.push({ ref: `${adapter.id}:${m.id}`, provider: adapter.id, name: m.name, model: m.id, free: m.free, scores: m.scores });
          }
        } catch { /* skip broken provider */ }
      }
      const responseData = { models: result, providers: providerList, hasKeys: true };
      // Cache the result so subsequent calls are sub-millisecond (60s TTL)
      await cache().set(cacheKey, responseData, MODELS_CACHE_TTL);
      res.json(responseData);
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
