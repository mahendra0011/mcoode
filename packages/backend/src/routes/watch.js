import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { validate } from '../validate.js';

export function watchRoutes({ secret }) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  router.get('/:projectId/status', async (req, res, next) => {
    try {
      const project = await db().watchProject.findOne({ _id: req.params.projectId, userId: req.userId });
      if (!project) {
        return res.json({ status: 'stopped', projectId: req.params.projectId, scansRun: 0, fixesApplied: 0 });
      }
      res.json(project);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:projectId/stop', async (req, res, next) => {
    try {
      const projects = db().watchProject;
      const project = await projects.findOne({ _id: req.params.projectId, userId: req.userId });
      if (!project) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'project not found' } });
      const updated = await projects.findByIdAndUpdate(project._id, { status: 'stopped' });
      // notify any connected CLI via socket room
      req.app.get('io')?.to(`project:${req.params.projectId}`).emit('watch:stop-signal', { projectId: req.params.projectId });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:projectId/activity', validate('watchActivityQuery'), async (req, res, next) => {
    try {
      const { page = 1, limit = 20, outcome } = req.query;
      const query = { projectId: req.params.projectId };
      if (outcome) query.outcome = outcome;
      const items = await db().watchActivity.find(query, { timestamp: -1 });
      const start = (Number(page) - 1) * Number(limit);
      res.json({ items: items.slice(start, start + Number(limit)), total: items.length });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
