import express from 'express';
import { searchAndFetch, buildContextBlock } from '../web-search/index.js';

export function searchRoutes({ secret }) {
  const router = express.Router();

  // POST /api/v1/search
  // We can add auth middleware here if needed: router.use(authMiddleware({ secret }));
  // But for now, we'll keep it accessible or assume it's protected at a higher level if desired.
  
  router.post('/', async (req, res, next) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'query is required' } });
      }

      // 1. Run the search and fetch pipeline
      const results = await searchAndFetch(query, { maxResults: 5 });
      
      // 2. Build the context block for the LLM
      const context = buildContextBlock(results);

      // In a real implementation, you would pass `context` to your LLM here.
      // For this example/integration, we'll simulate the LLM response or just return the data.
      // The frontend expects { results, answer }
      
      // Simulating a dummy answer if not actually calling an LLM right here
      const answer = `Based on the web search for "${query}", I found ${results.length} sources. The context has been extracted successfully.`;

      res.json({ results, answer, context });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
