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
  router.get('/stats', async (req, res, next) => {
    try {
      const { from, to } = req.query;
      const sessions = await db().session.find({ userId: req.userId }, { createdAt: -1 });
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

      // Tokens per day (estimate: sum of quotas used across sessions)
      // Since we don't store per-session tokens, approximate from quota usage
      const dailyTokens = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        dailyTokens[dateStr] = 0;
      }
      const totalTokensUsed = quota.tokens.used || 0;
      const activeDayCount = activeDays.length || 1;
      Object.keys(dailyTokens).forEach((dateStr) => {
        if (activeDays.includes(dateStr)) {
          dailyTokens[dateStr] = Math.round(totalTokensUsed / activeDayCount);
        }
      });

      res.json({
        ok: true,
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
      const sessions = await db().session.find({ userId: req.userId }, { createdAt: -1 });
      const doc = new PDFDocument({ margin: 48 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="mcode-usage-report.pdf"');
      doc.pipe(res);

      doc.fontSize(22).fillColor('#0d1117').text('mcode usage report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11).fillColor('#555').text(`Generated ${new Date().toISOString()}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(13).fillColor('#0d1117').text('Sessions');
      doc.moveDown(0.5);
      sessions.slice(0, 30).forEach((s, i) => {
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
      doc.end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
