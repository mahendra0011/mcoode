import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { getOrCreateUserRouter } from './pair.js';

/**
 * Common technical typo dictionary for instant offline correction.
 */
const COMMON_TECH_TYPOS = [
  [/\bcreat\b/gi, 'create'],
  [/\bcretae\b/gi, 'create'],
  [/\bcrerate\b/gi, 'create'],
  [/\bbuid\b/gi, 'build'],
  [/\bbuil\b/gi, 'build'],
  [/\bmack\b/gi, 'make'],
  [/\bmak\b/gi, 'make'],
  [/\blongin\b/gi, 'login'],
  [/\blogn\b/gi, 'login'],
  [/\blog in\b/gi, 'login'],
  [/\bauthen?tication\b/gi, 'authentication'],
  [/\bauthntication\b/gi, 'authentication'],
  [/\bauthetication\b/gi, 'authentication'],
  [/\bauthoriztion\b/gi, 'authorization'],
  [/\brfrsh\b/gi, 'refresh'],
  [/\btokn\b/gi, 'token'],
  [/\btokns\b/gi, 'tokens'],
  [/\bpasword\b/gi, 'password'],
  [/\bpaword\b/gi, 'password'],
  [/\bpassowrd\b/gi, 'password'],
  [/\bdatabse\b/gi, 'database'],
  [/\bdatbase\b/gi, 'database'],
  [/\bmangodb\b/gi, 'MongoDB'],
  [/\bmongodb\b/gi, 'MongoDB'],
  [/\bposgres\b/gi, 'PostgreSQL'],
  [/\bpostgre\b/gi, 'PostgreSQL'],
  [/\btailwnd(\s*css)?\b/gi, 'Tailwind CSS'],
  [/\btailwind(\s*css)?\b/gi, 'Tailwind CSS'],
  [/\brecat\b/gi, 'React'],
  [/\breact(js)?\b/gi, 'React'],
  [/\bnodjs\b/gi, 'Node.js'],
  [/\bnode(js)?\b/gi, 'Node.js'],
  [/\bexpress(js)?\b/gi, 'Express'],
  [/\btypescrpt\b/gi, 'TypeScript'],
  [/\btypcsript\b/gi, 'TypeScript'],
  [/\bjavascrpt\b/gi, 'JavaScript'],
  [/\bcomponet\b/gi, 'component'],
  [/\bcompnent\b/gi, 'component'],
  [/\brespnsive\b/gi, 'responsive'],
  [/\bdasboard\b/gi, 'dashboard'],
  [/\bdashbord\b/gi, 'dashboard'],
  [/\bmidleware\b/gi, 'middleware'],
  [/\bmiddlewear\b/gi, 'middleware'],
  [/\bendpont\b/gi, 'endpoint'],
  [/\bendponts\b/gi, 'endpoints'],
  [/\bfunctionality\b/gi, 'functionality'],
  [/\bimplment\b/gi, 'implement'],
  [/\bimplmentation\b/gi, 'implementation'],
  [/\brefactor\b/gi, 'refactor'],
  [/\boptimze\b/gi, 'optimize'],
  [/\boptmize\b/gi, 'optimize'],
];

/**
 * Perform local spelling/typo correction.
 */
export function correctTypos(text = '') {
  let result = text;
  const detectedCorrections = [];

  for (const [regex, replacement] of COMMON_TECH_TYPOS) {
    if (regex.test(result)) {
      result = result.replace(regex, replacement);
      detectedCorrections.push(replacement);
    }
  }

  // Capitalize first letter of sentences
  result = result.replace(/(^\s*|\.\s+)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());

  return { corrected: result, corrections: detectedCorrections };
}

/**
 * Intelligent rule-based prompt enhancement when AI is unreachable or offline.
 */
export function offlineEnhancePrompt(prompt = '') {
  const { corrected } = correctTypos(prompt.trim());
  if (!corrected) return '';

  // If already long and detailed (> 150 chars), just return typo-corrected version
  if (corrected.length > 150 && corrected.includes('\n')) {
    return corrected;
  }

  const pLower = corrected.toLowerCase();
  const additions = [];

  if (pLower.includes('api') || pLower.includes('backend') || pLower.includes('endpoint')) {
    additions.push('Include robust input validation, proper HTTP status codes, structured error handling, and clean modular code architecture.');
  }
  if (pLower.includes('auth') || pLower.includes('login') || pLower.includes('jwt') || pLower.includes('token')) {
    additions.push('Ensure security best practices: hash passwords securely with bcrypt, use HttpOnly cookies for refresh tokens, and guard against unauthorized access.');
  }
  if (pLower.includes('component') || pLower.includes('page') || pLower.includes('ui') || pLower.includes('frontend') || pLower.includes('dashboard')) {
    additions.push('Make the design clean, modern, and fully responsive across mobile, tablet, and desktop with accessible interactive elements and smooth transitions.');
  }
  if (pLower.includes('test') || pLower.includes('unit test')) {
    additions.push('Cover happy paths, edge cases, error conditions, and mock external dependencies cleanly.');
  }

  if (additions.length > 0) {
    return `${corrected}\n\nKey Requirements:\n- ${additions.join('\n- ')}`;
  }

  return `${corrected}\n\nPlease ensure clear code structure, clean formatting, complete error handling, and production-ready best practices.`;
}

/**
 * Prompt enhancement router.
 */
export function promptRoutes({ secret } = {}) {
  const router = Router();

  router.post('/enhance', authMiddleware({ secret }), async (req, res) => {
    const { prompt = '', mode = 'agent' } = req.body || {};
    const trimmed = String(prompt).trim();

    if (!trimmed) {
      return res.status(400).json({ error: { message: 'Prompt is required for enhancement' } });
    }

    const { corrected, corrections } = correctTypos(trimmed);

    try {
      const userModelRouter = await getOrCreateUserRouter(req.userId, secret);
      if (userModelRouter) {
        const assignment = await userModelRouter.pick('chat').catch(() => null);
        if (assignment?.provider) {
          const systemInstruction = `You are an expert prompt engineer and code assistant prompt optimizer.
The user will give you a rough, informal, or typo-filled prompt for an AI assistant.
Your job:
1. Fix all typos, spelling errors, and grammar mistakes.
2. Clarify and expand vague requests into clear, well-structured, production-grade instructions.
3. Preserve the user's core intent, domain, and technology choices.
4. Output ONLY the polished, enhanced prompt. Do NOT include markdown fences, meta commentary, or prefixes like "Here is your enhanced prompt:".`;

          const raw = await assignment.provider.complete(assignment.model.id, {
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: trimmed }
            ],
            maxTokens: 500,
            temperature: 0.3
          });

          const aiEnhanced = (raw?.text || '').trim();
          if (aiEnhanced && aiEnhanced.length >= trimmed.length) {
            return res.json({
              original: trimmed,
              enhanced: aiEnhanced,
              corrections,
              source: 'ai'
            });
          }
        }
      }
    } catch {
      // Fall through to offline enhancer
    }

    // High quality offline fallback
    const offlineResult = offlineEnhancePrompt(trimmed);
    return res.json({
      original: trimmed,
      enhanced: offlineResult,
      corrections,
      source: 'rules'
    });
  });

  return router;
}
