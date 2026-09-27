import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';

export function usageRoutes({ secret }) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  router.get('/quotas', async (req, res, next) => {
    try {
      const user = await db().user.findById(req.userId);
      if (!user) return res.status(404).json({ error: { code: 'USER_NOT_FOUND' } });
      const q = user.quotas || {};
      res.json({
        tokens: { limit: q.tokens?.limit, used: q.tokens?.used, remaining: (q.tokens?.limit || 0) - (q.tokens?.used || 0) },
        builds: { limit: q.builds?.limit, used: q.builds?.used, remaining: (q.builds?.limit || 0) - (q.builds?.used || 0) },
        resetAt: q.resetAt,
        plan: user.plan,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/compliance', async (req, res, next) => {
    try {
      const sessions = await db().session.find({ userId: req.userId }, { createdAt: -1 });
      const totalSessions = sessions.length;
      const completedSessions = sessions.filter((s) => s.status === 'completed').length;
      const failedSessions = sessions.filter((s) => s.status === 'failed').length;
      const successRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

      // Check for security violations (sessions with errors)
      const securityViolations = sessions.filter((s) => {
        const results = s.plan?.todos || [];
        return results.some((t) => t.status === 'failed' && t.error?.includes('permission'));
      }).length;

      res.json({
        totalSessions,
        completedSessions,
        failedSessions,
        successRate,
        securityViolations,
        lastSession: sessions[0]?.projectName || null,
        lastActivity: sessions[0]?.completedAt || sessions[0]?.createdAt || null,
        complianceStatus: securityViolations > 0 ? 'needs_review' : 'compliant',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', async (req, res, next) => {
    try {
      const { from, to } = req.query;
      const sessions = await db().session.find({ userId: req.userId }, { createdAt: -1 });
      const range = sessions.filter((s) => {
        const d = new Date(s.createdAt || 0);
        if (from && d < new Date(from)) return false;
        if (to && d > new Date(to)) return false;
        return true;
      });
      res.json({ totalSessions: range.length });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/usage/stats — Aggregated usage statistics for the Settings usage tab
  // USG-001: bound the result set instead of loading every session ever.
  router.get('/stats', async (req, res, next) => {
    try {
      const { from, to } = req.query;
      const USAGE_SESSION_CAP = 5000;
      const sessions = await db().session.find({ userId: req.userId }, { createdAt: -1 }, { limit: USAGE_SESSION_CAP + 1 });
      const truncated = sessions.length > USAGE_SESSION_CAP;
      if (truncated) sessions.length = USAGE_SESSION_CAP;
      const range = sessions.filter((s) => {
        const d = new Date(s.createdAt || 0);
        if (from && d < new Date(from)) return false;
        if (to && d > new Date(to)) return false;
        return true;
      });

      // Token quotas
      const user = await db().user.findById(req.userId);
      const q = user?.quotas || {};
      const quota = {
        tokens: {
          limit: q.tokens?.limit || 0,
          used: q.tokens?.used || 0,
          remaining: (q.tokens?.limit || 0) - (q.tokens?.used || 0)
        },
        builds: {
          limit: q.builds?.limit || 0,
          used: q.builds?.used || 0,
          remaining: (q.builds?.limit || 0) - (q.builds?.used || 0)
        }
      };

      // Sessions by mode
      const sessionsByMode = {};
      range.forEach((s) => {
        const mode = s.mode || 'unknown';
        sessionsByMode[mode] = (sessionsByMode[mode] || 0) + 1;
      });

      // Completed / failed sessions
      const completedSessions = range.filter((s) => s.status === 'completed').length;
      const failedSessions = range.filter((s) => s.status === 'failed').length;
      const successRate = range.length > 0 ? Math.round((completedSessions / range.length) * 100) : 0;

      // Active days (unique dates with sessions)
      const activeDays = Array.from(new Set(
        range.map((s) => new Date(s.createdAt || 0).toISOString().slice(0, 10))
      ));

      // Current streak — count consecutive days ending today with sessions
      const today = new Date();
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        if (activeDays.includes(dateStr)) {
          streak++;
        } else {
          break;
        }
      }

      // Model usage breakdown — from session.plan.todos[].assignedModel
      const modelUsage = {};
      for (const s of range) {
        const todos = s.plan?.todos || [];
        for (const t of todos) {
          const model = t.assignedModel || 'unknown';
          modelUsage[model] = (modelUsage[model] || 0) + 1;
        }
      }

      // Daily activity (last 30 days) for heatmap
      const dailyActivity = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        dailyActivity[dateStr] = 0;
      }
      range.forEach((s) => {
        const dateStr = new Date(s.createdAt || 0).toISOString().slice(0, 10);
        if (dailyActivity[dateStr] !== undefined) {
          dailyActivity[dateStr]++;
        }
      });

      // Total messages from chatMessage collection
      const totalMessages = await db().chatMessage.countDocuments
        ? await db().chatMessage.countDocuments({ sessionId: { $in: range.map((s) => s._id) } }).catch(() => 0)
        : 0;

      // Tokens per day — chat messages carry no token counts yet, so this is
      // an estimate: quota-used spread proportionally to per-day session
      // volume (NOT flat across days). Flagged so the UI can label it.
      const dailyTokens = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        dailyTokens[dateStr] = 0;
      }
      const totalTokensUsed = quota.tokens.used || 0;
      const sessionsInWindow = Object.values(dailyActivity).reduce((a, b) => a + b, 0);
      if (totalTokensUsed > 0 && sessionsInWindow > 0) {
        for (const [dateStr, count] of Object.entries(dailyActivity)) {
          dailyTokens[dateStr] = Math.round((totalTokensUsed * count) / sessionsInWindow);
        }
      }

      res.json({
        ok: true,
        truncated,
        stats: {
          totalSessions: range.length,
          completedSessions,
          failedSessions,
          successRate,
          sessionsByMode,
          activeDays: activeDays.length,
          currentStreak: streak,
          favoriteModel: Object.entries(modelUsage).sort(([, a], [, b]) => b - a)[0]?.[0] || 'none',
          modelUsage,
          dailyActivity,
          dailyTokens,
          tokensEstimated: true,
          totalMessages,
          tokenQuota: quota.tokens,
          buildQuota: quota.builds,
          plan: user?.plan || 'free',
        }
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/report.pdf', async (req, res, next) => {
    try {
      // USG-001/USG-002/SEC-035: bounded fetch + configurable page size
      // (?limit=, 1-200). Abort generation if the client goes away so a
      // slow/dead socket doesn't keep rendering into a closed stream.
      const pdfLimit = Math.min(200, Math.max(1, Number(req.query.limit) || 30));
      const sessions = await db().session.find({ userId: req.userId }, { createdAt: -1 }, { limit: pdfLimit });
      const totalAll = await db().session.countDocuments
        ? await db().session.countDocuments({ userId: req.userId }).catch(() => sessions.length)
        : sessions.length;
      const doc = new PDFDocument({ margin: 48 });
      req.on('close', () => {
        if (!res.writableEnded) {
          try { doc.destroy(); } catch { /* already finished */ }
        }
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="mcode-usage-report.pdf"');
      doc.pipe(res);

      doc.fontSize(22).fillColor('#0d1117').text('mcode usage report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11).fillColor('#555').text(`Generated ${new Date().toISOString()}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(13).fillColor('#0d1117').text(`Sessions (showing ${sessions.length} of ${totalAll})`);
      doc.moveDown(0.5);
      sessions.forEach((s, i) => {
        doc.fontSize(9).fillColor('#333').text(
          `${i + 1}. ${s.projectName || 'unnamed'}  ·  ${s.mode}  ·  ${s.status}  ·  ${new Date(s.createdAt || Date.now()).toISOString().slice(0, 16)}`
        );
      });

      // Compliance section
      const completedSessions = sessions.filter((s) => s.status === 'completed').length;
      const failedSessions = sessions.filter((s) => s.status === 'failed').length;
      const successRate = sessions.length > 0 ? Math.round((completedSessions / sessions.length) * 100) : 0;

      doc.moveDown(2);
      doc.fontSize(13).fillColor('#0d1117').text('Compliance Report');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#333').text(`Total sessions: ${sessions.length}`);
      doc.fontSize(10).fillColor('#333').text(`Completed: ${completedSessions}  ·  Failed: ${failedSessions}`);
      doc.fontSize(10).fillColor(successRate >= 80 ? '#1a7f37' : successRate >= 50 ? '#b58900' : '#cb2431').text(`Success rate: ${successRate}%`);
      doc.fontSize(10).fillColor('#333').text(`Compliance status: ${successRate >= 50 ? 'compliant' : 'needs_review'}`);
      // Model usage breakdown (from session plans).
      const modelCounts = {};
      for (const s of sessions) {
        for (const t of s.plan?.todos || []) {
          const m = t.assignedModel || 'unknown';
          modelCounts[m] = (modelCounts[m] || 0) + 1;
        }
      }
      const topModels = Object.entries(modelCounts).sort(([, a], [, b]) => b - a).slice(0, 10);
      if (topModels.length > 0) {
        doc.moveDown();
        doc.fontSize(13).fillColor('#0d1117').text('Model usage');
        doc.moveDown(0.5);
        for (const [m, c] of topModels) {
          doc.fontSize(10).fillColor('#333').text(`${m}: ${c} todo(s)`);
        }
      }
      doc.end();
    } catch (err) {
      next(err);
    }
  });

  router.get('/export.csv', async (req, res, next) => {
    try {
      const sessions = await db().session.find({ userId: req.userId }, { createdAt: -1 }, { limit: 5001 });
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      // USG-003: quote the header exactly like data rows so parsers align.
      const lines = [['date', 'project', 'mode', 'status', 'cost_usd'].map(esc).join(',')];
      for (const s of sessions) {
        lines.push([
          new Date(s.createdAt || 0).toISOString().slice(0, 10),
          esc(s.projectName || 'unnamed'),
          esc(s.mode || ''),
          esc(s.status || ''),
          esc(s.results?.cost ?? s.cost ?? ''),
        ].join(','));
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="mcode-usage.csv"');
      res.send(lines.join('\n'));
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/usage/coverage — last `npm run coverage` summary, if present.
  router.get('/coverage', async (req, res, next) => {
    try {
      const { readFile, stat } = await import('node:fs/promises');
      const { fileURLToPath } = await import('node:url');
      const { dirname, join } = await import('node:path');
      const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
      const summaryPath = join(root, 'coverage', 'coverage-summary.json');
      const st = await stat(summaryPath).catch(() => null);
      if (!st) {
        return res.status(404).json({
          error: { code: 'NO_COVERAGE', message: 'no coverage artifact yet — run `npm run coverage` at the repo root' },
        });
      }
      const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
      res.json({ ok: true, generatedAt: st.mtime, total: summary.total || null });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
