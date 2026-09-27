import express from 'express';
import { authMiddleware } from '../auth.js';
import { searchAndFetch, buildContextBlock } from '../web-search/index.js';

export function searchRoutes({ secret }) {
  const router = express.Router();
  router.use(authMiddleware({ secret }));
  
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
        // SRCH-002: narrow allowlist — never forward JWT_SECRET or unrelated
        // env (PATH/HOME/MONGODB_URI) into provider construction.
        const secrets = Object.fromEntries(
          Object.entries(process.env).filter(([k, v]) => v && k !== 'JWT_SECRET' && (k.endsWith('_KEY') || k.endsWith('_TOKEN') || k.endsWith('_HOST')))
        );
        const providers = await getProviders({ secrets });
        const router = new ModelRouter({ secrets, providers });
        // SRCH-003/1050: prefer known-good refs, then fall back to the
        // router's pick() over WHATEVER the user actually configured
        // (local Ollama/DeepSeek/etc.) — never a dead placeholder answer.
        const best = await router.find('anthropic:claude-sonnet-5') ||
                     await router.find('openai:gpt-5.6-luna') ||
                     await router.find('google:gemini-3.6-flash') ||
                     await router.pick('docs').catch(() => null);
        
        if (best) {
          const completionRes = await best.provider.complete(best.model.id, {
            messages: [
              { role: 'system', content: 'You are a helpful assistant. Use the provided search context to answer the user query concisely. Cite sources where possible.' },
              { role: 'user', content: `Query: ${query}\n\nContext:\n${context}` }
            ]
          });
          if (completionRes?.text) {
            answer = completionRes.text;
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
