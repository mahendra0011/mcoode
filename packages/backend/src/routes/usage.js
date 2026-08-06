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
