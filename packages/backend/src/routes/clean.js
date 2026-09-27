import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { findDeadCode, findBloat, runClean } from 'mcode-cli/clean';

export function cleanRoutes({ secret } = {}) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  /**
   * POST /api/v1/clean/scan
   * Run Tier 1 (dead code) and Tier 2 (AI bloat) scan on the target project
   */
  router.post('/scan', async (req, res) => {
    try {
      // CLN-001: never default to process.cwd() (the backend's own source).
      const projectPath = await resolveTargetPath(req);
      const deadCodeOnly = Boolean(req.body?.deadCodeOnly);
      const thresholdLines = req.body?.thresholdLines || 30;

      // Tier 1 — Dead code scan
      const tier1Findings = await findDeadCode(projectPath);

      // Tier 2 — AI bloat detection
      let tier2Findings = [];
      if (!deadCodeOnly) {
        try {
          tier2Findings = await findBloat(projectPath, { projectPath, thresholdLines });
        } catch (err) {
          // 1051: sanitize control characters before logging.
          console.warn('[clean:scan] Tier 2 AI scan warning:', String(err.message || err).replace(/[\x00-\x1f\x7f]/g, '?').slice(0, 300));
        }
      }

      const findings = [...tier1Findings, ...tier2Findings];
      const totalLinesRemovable = findings.reduce((sum, f) => {
        const diff = Math.max(0, (f.currentLines || 1) - (f.estimatedCleanLines || 0));
        return sum + diff;
      }, 0);

      res.json({
        ok: true,
        findings,
        totalLinesRemovable,
      });
    } catch (err) {
      console.error('[clean:scan] error:', err);
      res.status(500).json({ ok: false, error: err.message, findings: [] });
    }
  });

  /**
   * POST /api/v1/clean/execute
   * Execute cleanup on selected findings with behavioral equivalence verification
   */
  router.post('/execute', async (req, res) => {
    try {
      const projectPath = await resolveTargetPath(req);
      const selectedFindings = req.body?.selectedFindings || [];

      const result = await runClean(projectPath, {
        selectedFindings,
      });

      res.json({
        ok: true,
        ...result,
      });
    } catch (err) {
      console.error('[clean:execute] error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

/** CLN-001 / SEC-029: resolve the scan target scoped to the caller's OWN
 *  workspaces. An explicit projectPath is accepted only when it exists AND
 *  sits inside one of the user's workspace diskPaths (or the default user
 *  workspace) — never the backend cwd or system dirs. */
async function resolveTargetPath(req) {
  const { join, resolve, sep } = await import('node:path');
  const { homedir } = await import('node:os');
  const { mkdir } = await import('node:fs/promises');
  const fallback = join(homedir(), '.mcode', 'workspaces', 'default');
  let allowedRoots = [fallback];
  try {
    const owned = await db().workspace.find({ userId: req.userId });
    if (Array.isArray(owned)) {
      for (const w of owned) {
        if (w?.diskPath) allowedRoots.push(w.diskPath);
      }
    }
  } catch {
    /* scope check degrades to default workspace only */
  }
  const insideAllowed = (p) => {
    const abs = resolve(p);
    return allowedRoots.some((r) => abs === resolve(r) || abs.startsWith(resolve(r) + sep));
  };
  if (req.body?.projectPath) {
    const { existsSync } = await import('node:fs');
    if (existsSync(req.body.projectPath) && insideAllowed(req.body.projectPath)) {
      return req.body.projectPath;
    }
    const err = new Error('projectPath is not inside one of your workspaces');
    err.status = 400;
    throw err;
  }
  if (req.body?.projectId) {
    try {
      const ws = await db().workspace.findOne({ _id: String(req.body.projectId) });
      if (ws?.diskPath && insideAllowed(ws.diskPath)) return ws.diskPath;
    } catch {
      /* fall through to default workspace */
    }
  }
  await mkdir(fallback, { recursive: true });
  return fallback;
}
