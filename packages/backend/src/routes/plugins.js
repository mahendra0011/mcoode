import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { validate } from '../validate.js';

export function pluginRoutes({ secret }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const { q = '', category = '' } = req.query;
      let plugins = await db().plugin.find({});
      if (category) plugins = plugins.filter((p) => p.category === category);
      if (q) {
        const needle = String(q).toLowerCase();
        plugins = plugins.filter((p) =>
          p.name.toLowerCase().includes(needle) || (p.description || '').toLowerCase().includes(needle)
        );
      }
      res.json({ items: plugins, total: plugins.length });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:name', async (req, res, next) => {
    try {
      const plugin = await db().plugin.findOne({ name: req.params.name });
      if (!plugin) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'plugin not found' } });
      res.json(plugin);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authMiddleware({ secret }), validate('publishPlugin'), async (req, res, next) => {
    try {
      const { name, description, category, version, manifestUrl } = req.body;
      const plugins = db().plugin;
      const existing = await plugins.findOne({ name });
      if (existing) {
        const updated = await plugins.findByIdAndUpdate(existing._id, {
          latestVersion: version,
          versions: [
            ...(existing.versions || []),
            { version, publishedAt: new Date(), manifestUrl }
          ]
        });
        return res.json(updated);
      }
      const plugin = await plugins.create({
        name,
        description,
        category,
        latestVersion: version,
        authorId: req.userId,
        versions: [{ version, publishedAt: new Date(), manifestUrl }],
        installs: 0
      });
      res.status(201).json(plugin);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
