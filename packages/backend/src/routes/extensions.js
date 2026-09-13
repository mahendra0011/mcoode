import { Router } from 'express';
import axios from 'axios';

const OPEN_VSX_API = 'https://open-vsx.org/api';

const AI_BLACKLIST_TERMS = [
  'claude',
  'qwen',
  'copilot',
  'chatgpt',
  'gpt-',
  'openai',
  'tabnine',
  'codeium',
  'cursor',
  'continue.dev',
  'supermaven',
  'codegeex',
  'deepseek',
  'fitten',
  'marscode',
  'gemini',
  'ai assistant',
  'ai chat',
  'prompt assistant',
  'generative ai',
  'cody',
];

function isAiExtension(ext) {
  const text = `${ext.namespace} ${ext.name} ${ext.displayName || ''} ${ext.description || ''}`.toLowerCase();
  return AI_BLACKLIST_TERMS.some((term) => text.includes(term));
}

export function extensionRoutes() {
  const router = Router();

  // GET /api/v1/extensions/search?q=eslint
  router.get('/search', async (req, res, next) => {
    try {
      const { q = '', category, size = 50 } = req.query;
      const { data } = await axios.get(`${OPEN_VSX_API}/-/search`, {
        params: { query: q, category, size },
      });

      const extensions = (data.extensions || [])
        .filter((ext) => !isAiExtension(ext))
        .map((ext) => ({
          id: `${ext.namespace}.${ext.name}`,
          name: ext.displayName || ext.name,
          publisher: ext.namespace,
          description: ext.description,
          version: ext.version,
          downloads: ext.downloadCount,
          rating: ext.averageRating,
          icon: ext.files?.icon || '⚡',
          downloadUrl: ext.files?.download,
        }));

      res.json({ extensions });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
