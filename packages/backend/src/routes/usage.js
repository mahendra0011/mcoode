import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';

export function usageRoutes({ secret }) {
  const router = Router();
  router.use(authMiddleware({ secret }));

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

      doc.moveDown(2);
      doc.fontSize(13).fillColor('#0d1117').text('Totals');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#333').text(`Total sessions: ${sessions.length}`);
      doc.end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
