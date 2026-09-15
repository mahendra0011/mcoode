import { Router } from 'express';
import { findDeadCode } from '../../../cli/src/core/clean/tier1-dead-code.js';
import { findBloat } from '../../../cli/src/core/clean/tier2-bloat.js';
import { runClean } from '../../../cli/src/core/clean/run-clean.js';

export function cleanRoutes({ secret } = {}) {
  const router = Router();

  /**
   * POST /api/v1/clean/scan
   * Run Tier 1 (dead code) and Tier 2 (AI bloat) scan on the target project
   */
  router.post('/scan', async (req, res) => {
    try {
      const projectPath = req.body?.projectPath || process.cwd();
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
          console.warn('[clean:scan] Tier 2 AI scan warning:', err.message);
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
      const projectPath = req.body?.projectPath || process.cwd();
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
