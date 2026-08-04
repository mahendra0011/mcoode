import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { validate } from '../validate.js';

export function sessionRoutes({ secret }) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  router.get('/', async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const sessions = await db().session.find({ userId: req.userId }, { createdAt: -1 });
      const start = (Number(page) - 1) * Number(limit);
      const total = sessions.length;
      res.json({ items: sessions.slice(start, start + Number(limit)), total, page: Number(page) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const session = await db().session.findById(req.params.id);
      if (!session || String(session.userId) !== String(req.userId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'session not found' } });
      }
      const transcripts = await db().agentTranscript.find({ sessionId: session._id });
      res.json({ ...session, transcripts });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', validate('createSession'), async (req, res, next) => {
    try {
      const session = await db().session.create({
        userId: req.userId,
        projectName: req.body.projectName,
        mode: req.body.mode,
        status: 'planning',
        plan: req.body.plan,
        createdAt: new Date()
      });
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', validate('updateSession'), async (req, res, next) => {
    try {
      const session = await db().session.findById(req.params.id);
      if (!session || String(session.userId) !== String(req.userId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'session not found' } });
      }
      const patch = { ...req.body };
      if (patch.status === 'completed') patch.completedAt = new Date();
      const updated = await db().session.findByIdAndUpdate(session._id, patch);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const result = await db().session.deleteOne({ _id: req.params.id, userId: req.userId });
      if (!result.deletedCount) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'session not found' } });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
