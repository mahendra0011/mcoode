import { Router } from 'express';
import axios from 'axios';

const OPEN_VSX_API = 'https://open-vsx.org/api';

export function extensionRoutes() {
  const router = Router();

  // GET /api/v1/extensions/search?q=eslint
  router.get('/search', async (req, res, next) => {
    try {
      const { q = '', category, size = 30 } = req.query;
      const { data } = await axios.get(`${OPEN_VSX_API}/-/search`, {
        params: { query: q, category, size },
      });
      res.json({
        extensions: data.extensions.map((ext) => ({
          id: `${ext.namespace}.${ext.name}`,
          name: ext.displayName || ext.name,
          publisher: ext.namespace,
          description: ext.description,
          version: ext.version,
          downloads: ext.downloadCount,
          rating: ext.averageRating,
          icon: ext.files?.icon,
          downloadUrl: ext.files?.download, // .vsix file URL
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
