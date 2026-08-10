import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../auth.js';

export function settingsRoutes({ secret }) {
  const r = Router();

  // GET /api/v1/settings/providers -> List all remote provider IDs (public: no secrets exposed)
  r.get('/providers', async (req, res) => {
    try {
      const { getAllAdapters } = await import('mcode-cli/providers');
      const adapters = getAllAdapters({});
      const remoteProviders = adapters
        .filter((a) => a.kind !== 'local')
        .map((a) => ({
          id: a.id,
          displayName: a.displayName,
          envVar: a.envVar,
          // Include the static model catalog so the frontend can show available
          // models before the user saves an API key. No secrets are exposed.
          models: (a.models || []).map(m => ({
            id: m.id,
            name: m.name,
            free: Boolean(m.free),
            scores: m.scores
          }))
        }));
      res.json({ ok: true, providers: remoteProviders });
    } catch (e) {
      res.status(500).json({ error: { message: 'Failed to fetch providers' } });
    }
  });

  r.use(authMiddleware({ secret }));

  const DEFAULTS = {
    allowShellAll: false,
    requireEditApproval: false,
    modelOverrides: {},
    accentColor: 'emerald',
    networkWhitelist: [],
    watchDefaults: { intervalMs: 30000, autoFix: false },
    godModeDefaults: { concurrency: 3, deployTarget: '', skipTests: false },
  };

  // GET /api/v1/settings -> Fetch user settings
  r.get('/', async (req, res) => {
    try {
      let settings = await db().userSettings.findOne({ userId: req.userId });
      if (!settings) {
        settings = { userId: req.userId, ...DEFAULTS };
      }
      res.json({ ok: true, settings: { ...DEFAULTS, ...settings } });
    } catch (e) {
      res.status(500).json({ error: { message: 'Failed to fetch settings' } });
    }
  });

  // PUT /api/v1/settings -> Generic update (merges any allowed keys)
  r.put('/', async (req, res) => {
    try {
      const allowed = ['accentColor', 'networkWhitelist', 'watchDefaults', 'godModeDefaults'];
      const patch = {};
      for (const k of allowed) {
        if (req.body[k] !== undefined) patch[k] = req.body[k];
      }
      let settings = await db().userSettings.findOne({ userId: req.userId });
      if (!settings) {
        settings = await db().userSettings.create({ userId: req.userId, ...DEFAULTS, ...patch });
      } else {
        await db().userSettings.updateOne({ userId: req.userId }, patch);
        settings = await db().userSettings.findOne({ userId: req.userId });
      }
      res.json({ ok: true, settings: { ...DEFAULTS, ...settings } });
    } catch (e) {
      res.status(500).json({ error: { message: 'Failed to update settings' } });
    }
  });

  // GET /api/v1/settings/permissions -> Fetch permission-related settings
  r.get('/permissions', async (req, res) => {
    try {
      let settings = await db().userSettings.findOne({ userId: req.userId });
      res.json({ ok: true, settings: { ...DEFAULTS, ...(settings || {}) } });
    } catch (e) {
      res.status(500).json({ error: { message: 'Failed to fetch permissions' } });
    }
  });

  // PUT /api/v1/settings/permissions -> Update allowShellAll and requireEditApproval
  r.put('/permissions', async (req, res) => {
    try {
      const { allowShellAll, requireEditApproval } = req.body;
      let settings = await db().userSettings.findOne({ userId: req.userId });
      if (!settings) {
        settings = await db().userSettings.create({
          userId: req.userId,
          ...DEFAULTS,
          allowShellAll: Boolean(allowShellAll),
          requireEditApproval: Boolean(requireEditApproval),
        });
      } else {
        await db().userSettings.updateOne(
          { userId: req.userId },
          { 
            allowShellAll: allowShellAll !== undefined ? Boolean(allowShellAll) : settings.allowShellAll,
            requireEditApproval: requireEditApproval !== undefined ? Boolean(requireEditApproval) : settings.requireEditApproval
          }
        );
        settings = await db().userSettings.findOne({ userId: req.userId });
      }
      res.json({ ok: true, settings: { ...DEFAULTS, ...settings } });
    } catch (e) {
      res.status(500).json({ error: { message: 'Failed to update permissions' } });
    }
  });

  // GET /api/v1/settings/models -> Fetch model overrides
  r.get('/models', async (req, res) => {
    try {
      let settings = await db().userSettings.findOne({ userId: req.userId });
      res.json({ ok: true, settings: { ...DEFAULTS, ...(settings || {}) } });
    } catch (e) {
      res.status(500).json({ error: { message: 'Failed to fetch model preferences' } });
    }
  });

  // PUT /api/v1/settings/models -> Update modelOverrides
  r.put('/models', async (req, res) => {
    try {
      const { general, build, planning } = req.body;
      let settings = await db().userSettings.findOne({ userId: req.userId });
      const currentOverrides = settings?.modelOverrides || {};
      const newOverrides = {
        ...currentOverrides,
        ...(general !== undefined && { general }),
        ...(build !== undefined && { build }),
        ...(planning !== undefined && { planning })
      };

      if (!settings) {
        settings = await db().userSettings.create({
          userId: req.userId,
          ...DEFAULTS,
          modelOverrides: newOverrides
        });
      } else {
        await db().userSettings.updateOne(
          { userId: req.userId },
          { modelOverrides: newOverrides }
        );
        settings = await db().userSettings.findOne({ userId: req.userId });
      }
      res.json({ ok: true, settings: { ...DEFAULTS, ...settings } });
    } catch (e) {
      res.status(500).json({ error: { message: 'Failed to update model preferences' } });
    }
  });

  return r;
}
