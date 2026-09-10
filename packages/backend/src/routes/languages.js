import { Router } from 'express';
import axios from 'axios';

const PISTON_URL = process.env.PISTON_URL || 'http://localhost:2000';

export function languageRoutes() {
  const router = Router();

  // GET /api/languages — live list of what's actually runnable
  router.get('/', async (req, res, next) => {
    try {
      const { data } = await axios.get(`${PISTON_URL}/api/v2/runtimes`);
      res.json({ runtimes: data }); // [{language, version, aliases}, ...]
    } catch (err) {
      // Piston down ho to static fallback list bhej do
      res.json({ runtimes: [], error: 'Piston unreachable, showing static list only' });
    }
  });

  return router;
}
