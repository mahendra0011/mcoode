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
    permissionMode: 'build',
    autoApproveHighRisk: false,
    networkTimeout: 180000,
    modelOverrides: {},
    accentColor: 'emerald',
    networkWhitelist: [],
    watchDefaults: { intervalMs: 30000, autoFix: false },
    godModeDefaults: { concurrency: 3, deployTarget: '', skipTests: false },
    rewindCheckpointing: false,
    conversationCompaction: false,
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

  // Local-desktop bridge: after a successful Mongo write, mirror the CLI-owned
  // subset into the server machine's ~/.mcode/config.json via the CLI's own
  // saveConfig (which validates against ConfigSchema before writing).
  // This only helps single-machine (local desktop) deploys where the backend
  // and the CLI share a filesystem / home directory. Hosted multi-machine
  // deploys still need `mcode config` on the machine that runs the agent —
  // the CLI never reads Mongo userSettings.
  // Best-effort: never fail the request on mirror errors.
  const CLI_WATCH_KEYS = new Set([
    'scanIntervalMs',
    'debounceMs',
    'maxFixesPerHour',
    'autoCommit',
    'maxAttemptsPerFix',
    'confirm',
  ]);
  // Web watchDefaults historically uses UI-era key names; map the known
  // aliases onto real CLI watch keys before filtering.
  const WATCH_ALIASES = { intervalMs: 'scanIntervalMs', autoFix: 'autoCommit' };
  const buildCliMirrorPatch = (patch) => {
    const cliPatch = {};
    const mirrored = [];
    if (patch.networkWhitelist !== undefined) {
      cliPatch.networkWhitelist = patch.networkWhitelist;
      mirrored.push('networkWhitelist');
    }
    if (patch.allowShellAll !== undefined) {
      cliPatch.allowShellAll = patch.allowShellAll;
      mirrored.push('allowShellAll');
    }
    if (patch.requireEditApproval !== undefined) {
      cliPatch.requireEditApproval = patch.requireEditApproval;
      mirrored.push('requireEditApproval');
    }
    const concurrency = patch.godModeDefaults?.concurrency;
    if (concurrency !== undefined && Number.isFinite(Number(concurrency))) {
      cliPatch.concurrency = Number(concurrency);
      mirrored.push('concurrency');
    }
    if (patch.watchDefaults && typeof patch.watchDefaults === 'object') {
      const watch = {};
      for (const [k, v] of Object.entries(patch.watchDefaults)) {
        const mapped = WATCH_ALIASES[k] || k;
        if (CLI_WATCH_KEYS.has(mapped)) watch[mapped] = v;
      }
      if (Object.keys(watch).length > 0) {
        cliPatch.watch = watch;
        mirrored.push('watch');
      }
    }
    return { cliPatch, mirrored };
  };
  const mirrorToCliConfig = async (patch) => {
    const { cliPatch, mirrored } = buildCliMirrorPatch(patch || {});
    if (mirrored.length === 0) return [];
    try {
      // Relative import into the CLI's own store (same pattern as clean.js
      // reaching into CLI core) so validation/write logic stays in one place.
      const { loadConfig, saveConfig } = await import('../../../cli/src/core/store.js');
      // saveConfig merges shallowly — deep-merge `watch` first so unrelated
      // watch keys already in config.json are not clobbered.
      if (cliPatch.watch) {
        try {
          const current = await loadConfig().catch(() => ({}));
          cliPatch.watch = { ...(current?.watch || {}), ...cliPatch.watch };
        } catch {
          /* keep the filtered watch as-is */
        }
      }
      await saveConfig(cliPatch);
      return mirrored;
    } catch (e) {
      console.warn('[settings] CLI config mirror skipped:', e?.message || e);
      return [];
    }
  };

  // SET-001: single shared patch builder — PUT / and PUT /permissions used
  // to duplicate coercion logic with subtle differences. One function now.
  const buildSettingsPatch = (body) => {
    const allowed = [
      'accentColor',
      'networkWhitelist',
      'watchDefaults',
      'godModeDefaults',
      'permissionMode',
      'autoApproveHighRisk',
      'networkTimeout',
      'allowShellAll',
      'requireEditApproval',
      'rewindCheckpointing',
      'conversationCompaction'
    ];
    const patch = {};
    for (const k of allowed) {
      if (body[k] !== undefined) {
        if (k === 'networkTimeout') {
          const val = Number(body[k]);
          patch[k] = Number.isFinite(val) ? Math.min(300000, Math.max(1000, val)) : 180000;
        } else if (k === 'allowShellAll' || k === 'requireEditApproval' || k === 'autoApproveHighRisk') {
          patch[k] = Boolean(body[k]);
        } else {
          patch[k] = body[k];
        }
      }
    }
    return patch;
  };

  // PUT /api/v1/settings -> Generic update (merges any allowed keys)
  r.put('/', async (req, res) => {
    try {
      const patch = buildSettingsPatch(req.body);
      let settings = await db().userSettings.findOne({ userId: req.userId });
      if (!settings) {
        settings = await db().userSettings.create({ userId: req.userId, ...DEFAULTS, ...patch });
      } else {
        await db().userSettings.updateOne({ userId: req.userId }, patch);
        settings = await db().userSettings.findOne({ userId: req.userId });
      }
      const cliMirrored = await mirrorToCliConfig(patch);
      res.json({ ok: true, settings: { ...DEFAULTS, ...settings }, cliMirrored });
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

  // PUT /api/v1/settings/permissions -> Update permission settings
  // (subset of the generic endpoint — same builder, unknown keys ignored)
  r.put('/permissions', async (req, res) => {
    try {
      let settings = await db().userSettings.findOne({ userId: req.userId });
      const full = buildSettingsPatch(req.body);
      const patch = Object.fromEntries(
        ['allowShellAll', 'requireEditApproval', 'permissionMode', 'autoApproveHighRisk', 'networkTimeout']
          .filter((k) => full[k] !== undefined)
          .map((k) => [k, full[k]])
      );

      if (!settings) {
        settings = await db().userSettings.create({
          userId: req.userId,
          ...DEFAULTS,
          ...patch
        });
      } else {
        await db().userSettings.updateOne({ userId: req.userId }, patch);
        settings = await db().userSettings.findOne({ userId: req.userId });
      }
      const cliMirrored = await mirrorToCliConfig(patch);
      res.json({ ok: true, settings: { ...DEFAULTS, ...settings }, cliMirrored });
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

  // DELETE /api/v1/settings/models -> Reset modelOverrides to defaults
  r.delete('/models', async (req, res) => {
    try {
      await db().userSettings.updateOne({ userId: req.userId }, { modelOverrides: {} });
      const settings = await db().userSettings.findOne({ userId: req.userId });
      res.json({ ok: true, settings: { ...DEFAULTS, ...(settings || {}), modelOverrides: {} } });
    } catch (e) {
      res.status(500).json({ error: { message: 'Failed to reset model preferences' } });
    }
  });

  return r;
}
