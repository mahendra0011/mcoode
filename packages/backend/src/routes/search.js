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

      // 3. Call the LLM to generate the answer
      let answer = `Based on the web search for "${query}", I found ${results.length} sources. The context has been extracted successfully.`;
      
      try {
        const { getProviders } = await import('mcode-cli/providers');
        const { ModelRouter } = await import('mcode-cli/router');
        const secrets = process.env;
        const providers = await getProviders({ secrets });
        const router = new ModelRouter({ secrets, providers });
        const best = await router.find('anthropic:claude-3-5-sonnet-latest') || 
                     await router.find('openai:gpt-4o') || 
                     await router.find('google:gemini-2.5-flash');
        
        if (best) {
          const res = await best.provider.complete(best.model.id, {
            messages: [
              { role: 'system', content: 'You are a helpful assistant. Use the provided search context to answer the user query concisely. Cite sources where possible.' },
              { role: 'user', content: `Query: ${query}\n\nContext:\n${context}` }
            ]
          });
          if (res.text) {
            answer = res.text;
          }
        }
      } catch (llmErr) {
        console.error('LLM search fallback failed', llmErr);
      }

      res.json({ results, answer, context });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
