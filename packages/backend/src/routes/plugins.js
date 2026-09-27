import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { validate } from '../validate.js';

/** PLG-001: true only for public http(s) URLs (blocks SSRF to metadata/
 *  localhost/RFC1918/link-local targets and file://-style schemes). */
export function isPublicHttpUrl(value) {
  let u;
  try {
    u = new URL(String(value || ''));
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return false;
  if (!host.includes('.') && host !== 'localhost') return false; // bare names (intranet)
  // IPv4 literal checks (incl. decimal/octal/hex forms via numeric parse)
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (v4) {
    const parts = v4.slice(1).map(Number);
    if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    const [a, b] = parts;
    if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 0) return false;
    return true;
  }
  if (host.startsWith('[') || host.includes(':')) return false; // IPv6 literals (fe80::/fc00:: risk)
  return true;
}

export function pluginRoutes({ secret }) {
  const router = Router();

  // PLG-002 note: the registry listing/detail endpoints are intentionally
  // public (a readable plugin directory); only publishing requires auth.
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
      // 1053: enforce semver — non-conforming versions break updaters.
      if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(String(version || ''))) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'version must be valid semver (e.g. 1.2.3)' } });
      }
      // PLG-001: SSRF guard — http(s) only AND no private/internal targets
      // (localhost, RFC1918, link-local/cloud-metadata, .local, bare names).
      if (!isPublicHttpUrl(manifestUrl)) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'manifestUrl must be a public http(s) URL' } });
      }
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
