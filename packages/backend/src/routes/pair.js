import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { keyManagerFromEnv } from '../secret-enc.js';
import { CostLedger } from '@mcode/shared';

// LRU/Map cache for user ModelRouter instances to avoid re-decrypting keys on every single keystroke.
const routerCache = new Map();
const ROUTER_CACHE_TTL_MS = 5 * 60 * 1000;
const ROUTER_CACHE_MAX = 200;

/**
 * Extracts surrounding lines around the current cursor to keep the prompt small and latency sub-second.
 */
export function extractSurroundingLines(fileContent = '', cursorLine = 1, windowSize = 40) {
  if (!fileContent) return '';
  // 1042: cap the window — a minified one-liner must not inject hundreds
  // of KB into the prompt.
  const lines = fileContent.split('\n');
  const lineIdx = Math.max(0, (cursorLine || 1) - 1);
  const half = Math.floor(windowSize / 2);
  const start = Math.max(0, lineIdx - half);
  const end = Math.min(lines.length, lineIdx + half + 1);
  return lines.slice(start, end).join('\n').slice(0, 8000);
}

/**
 * Infers model routing domain based on file extension.
 */
/**
 * Infers model routing domain based on file extension + path heuristics.
 * PAIR-003: server-side JS/TS (server paths, node runtimes, config) routes to
 * backend/devops instead of defaulting everything to frontend.
 */
const SERVER_PATH_HINTS = ['/server/', '/routes/', '/api/', '/controllers/', '/services/', '/backend/', '/cli/', '/core/', '/lib/', '/models/', '/middleware/', '/db/'];
const SERVER_NAME_HINTS = ['server.', 'controller', 'route.', 'routes.', 'service.', 'model.', 'schema.', 'handler.', 'middleware.', 'worker.', 'cron.', 'server-'];
const DEVOPS_NAME_HINTS = ['dockerfile', '.config.', 'config.', 'webpack.', 'vite.', 'eslint', 'tsconfig', 'package.json', 'ci.', '.yml', '.yaml', 'makefile', 'terraform', 'ansible'];

export function inferDomain(filePath = '') {
  const p = filePath.toLowerCase();
  if (p.endsWith('.html') || p.endsWith('.css') || p.endsWith('.scss') || p.endsWith('.jsx') || p.endsWith('.tsx') || p.endsWith('.vue') || p.endsWith('.svelte')) {
    return 'frontend';
  }
  if (p.endsWith('.sql') || p.includes('schema') || p.includes('migration')) {
    return 'db';
  }
  if (p.includes('.test.') || p.includes('.spec.') || p.includes('tests/')) {
    return 'test';
  }
  if (p.endsWith('.py') || p.endsWith('.go') || p.endsWith('.rs') || p.endsWith('.java') || p.endsWith('.rb') || p.endsWith('.php') || p.endsWith('.c') || p.endsWith('.cpp')) {
    return 'backend';
  }
  if (SERVER_PATH_HINTS.some((h) => p.includes(h)) || SERVER_NAME_HINTS.some((h) => p.includes(h))) {
    return 'backend';
  }
  if (p.endsWith('.mjs') || p.endsWith('.cjs')) {
    return 'backend';
  }
  if (DEVOPS_NAME_HINTS.some((h) => p.includes(h))) {
    return 'devops';
  }
  return 'frontend';
}

/**
 * Clean model output so it's strictly inline completion text.
 * PAIR-005: beyond fences, strip whole-output markdown wrappers (bold,
 * italics, strikethrough) and per-line list prefixes — conservatively, so
 * code operators (`*`, `<T>`) are never mangled.
 */
export function cleanCompletionText(rawText = '') {
  let text = String(rawText || '').replace(/\r\n/g, '\n');
  // Strip enclosing markdown code block fences if returned
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, '');
  }
  const trimmed = text.trim();
  // Whole-output wrappers: **x**, __x__, *x*, _x_, ~~x~~ → x
  const wrap = /^(?:\*\*(.+)\*\*|__(.+)__|~~(.+)~~|\*([^*\n]+)\*)$/s.exec(trimmed);
  if (wrap) {
    text = wrap.slice(1).find((g) => g !== undefined);
  }
  // Leading ordered/unordered list markers per line ("- ", "* ", "1. ")
  text = text
    .split('\n')
    .map((line) => line.replace(/^(\s*)(?:[-*+]|\d+[.)])\s+(?=\S)/, '$1'))
    .join('\n');
  // Trim trailing whitespace but preserve essential indentation
  return text.trimEnd();
}

/**
 * Resolves or builds a cached ModelRouter for a user.
 */
export async function getOrCreateUserRouter(userId, secret, env = process.env) {
  const cacheKey = userId || 'default';
  const cached = routerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ROUTER_CACHE_TTL_MS) {
    return cached.router;
  }
  // 1041: sweep expired entries so idle users never accumulate.
  const now = Date.now();
  for (const [k, v] of routerCache) {
    if (now - v.timestamp >= ROUTER_CACHE_TTL_MS) routerCache.delete(k);
  }

  const secrets = {};

  if (userId) {
    // PAIR-002: fail closed without a real secret — the old dev-secret
    // fallback decrypted with the wrong key and silently yielded no models.
    if (!secret) return null;
    try {
      const keys = await db().apiKey.find({ userId });
      const km = keyManagerFromEnv({ secret, env });
      for (const k of keys) {
        try {
          const dec = km.decrypt(k.encryptedKey, userId);
          if (dec && !/[\u2022\u25cf\u2219]/.test(dec) && dec !== 'existing-key') {
            secrets[k.envVar] = dec;
          }
        } catch {}
      }
    } catch {}
  }

  // Fallback to process.env
  for (const [envK, envV] of Object.entries(env || {})) {
    if (envV && !secrets[envK] && (envK.endsWith('_API_KEY') || envK.endsWith('_KEY') || envK.endsWith('_HOST') || envK.endsWith('_TOKEN'))) {
      secrets[envK] = envV;
    }
  }

  try {
    const { getProviders } = await import('mcode-cli/providers');
    const { ModelRouter } = await import('mcode-cli/router');
    const providers = await getProviders({ secrets });
    const router = new ModelRouter({ secrets, config: {}, ledger: new CostLedger(), providers });
    routerCache.set(cacheKey, { router, timestamp: Date.now() });
    // PAIR-001: bound the cache — evict oldest first.
    if (routerCache.size > ROUTER_CACHE_MAX) {
      routerCache.delete(routerCache.keys().next().value);
    }
    return router;
  } catch {
    return null;
  }
}

/** Extract the first balanced {...} object (string/escape aware). */
export function extractBalancedObject(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  if (start < 0) return '';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return '';
}

/**
 * Checks for larger structural suggestions during 2s+ typing pauses.
 */
export async function checkForStructuralSuggestion({ fileContent = '', cursorLine = 1, filePath = '', recentEdits = [] }, { router = null } = {}) {
  if (!fileContent || fileContent.trim().length < 20) return null;

  const lines = fileContent.split('\n');
  const lineIdx = Math.max(0, cursorLine - 1);
  const currentLine = lines[lineIdx] || '';
  const nearbyContext = extractSurroundingLines(fileContent, cursorLine, 25);

  // Heuristic 1: Async function or await statement without try/catch.
  // PAIR-004: also treat promise-chain guards (.catch/.then/.finally),
  // `try` variants, and optional-chained awaits as handled to cut noise.
  if (/\bawait\s+[a-zA-Z0-9_$.]+\s*\(/.test(currentLine) || (lines[lineIdx - 1] && /\bawait\s+/.test(lines[lineIdx - 1]))) {
    const checkBlock = lines.slice(Math.max(0, lineIdx - 6), Math.min(lines.length, lineIdx + 7)).join('\n');
    const guarded = checkBlock.includes('try {') || checkBlock.includes('try{') ||
      checkBlock.includes('.catch(') || checkBlock.includes('.then(') ||
      checkBlock.includes('.finally(') || /\bawait\s+\S*\?\./.test(checkBlock);
    if (!guarded) {
      return {
        id: `sug_err_${Date.now()}`,
        message: 'Wrap await call with try/catch to handle errors?',
        preview: `try {\n  ${currentLine.trim()}\n} catch (err) {\n  console.error(err);\n}`,
        file: filePath,
        replacement: `try {\n    ${currentLine.trim()}\n  } catch (err) {\n    console.error(err);\n  }`,
        line: cursorLine
      };
    }
  }

  // Heuristic 2: Repeated string literal / duplicated pattern
  const stringMatches = nearbyContext.match(/(['"`])([a-zA-Z0-9_\-./]{8,})\1/g);
  if (stringMatches && stringMatches.length >= 2) {
    const counts = {};
    for (const m of stringMatches) {
      counts[m] = (counts[m] || 0) + 1;
    }
    for (const [val, count] of Object.entries(counts)) {
      if (count >= 2) {
        const constName = val.replace(/['"`]/g, '').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        return {
          id: `sug_const_${Date.now()}`,
          message: `Extract repeated literal ${val} into a shared constant?`,
          preview: `const ${constName} = ${val};`,
          file: filePath,
          replacement: `const ${constName} = ${val};`,
          line: Math.max(1, cursorLine - 3)
        };
      }
    }
  }

  // Heuristic 3: JSON.parse without error guard
  if (currentLine.includes('JSON.parse(')) {
    return {
      id: `sug_json_${Date.now()}`,
      message: 'JSON.parse can throw on malformed input — add safe parsing?',
      preview: `let parsed;\ntry { parsed = JSON.parse(...); } catch {}`,
      file: filePath,
      line: cursorLine
    };
  }

  // If a router is available and nearby context is interesting, query for small structural advice
  if (router && nearbyContext.length > 50) {
    try {
      const assignment = await router.pick('planning');
      if (assignment?.provider) {
        const raw = await assignment.provider.complete(assignment.model.id, {
          messages: [
            {
              role: 'system',
              content: `You are an expert pair-programming assistant. Analyze this small code snippet around cursor line ${cursorLine}. If there is a single high-value, small, scoped structural suggestion (e.g. extract helper, add error guard, fix missing check), return valid JSON with keys: {"message": "brief 1-sentence prompt", "preview": "brief 1-3 line code preview"}. If nothing noteworthy is needed, return {"message": null}. Return ONLY JSON.`
            },
            {
              role: 'user',
              content: nearbyContext
            }
          ],
          maxTokens: 80,
          temperature: 0.1
        });
        // 1043: strip fences (any language tag/whitespace) and trailing
        // prose, then extract the first balanced {...} — bare anchored
        // replaces miss "```json\n" variants and post-JSON explanations.
        const cleaned = String(raw?.text || '').replace(/```[a-zA-Z]*\s*/g, '').replace(/```/g, '');
        const parsed = JSON.parse(extractBalancedObject(cleaned) || '{}');
        if (parsed?.message && parsed?.preview) {
          return {
            id: `sug_ai_${Date.now()}`,
            message: parsed.message,
            preview: parsed.preview,
            file: filePath,
            line: cursorLine
          };
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Generates an inline pair completion suggestion.
 */
/** @param {any} req @param {any} res @param {{ secret?: string }} [opts] */
export async function handlePairSuggest(req, res, { secret, env = process.env } = {}) {
  const { fileContent = '', cursorLine = 1, cursorColumn = 1, filePath = '' } = req.body || {};

  if (!fileContent && fileContent !== '') {
    return res.json({ text: '' });
  }

  try {
    const router = await getOrCreateUserRouter(req.userId, secret, env);
    if (!router) {
      return res.json({ text: '' });
    }

    const domain = inferDomain(filePath);
    const assignment = await router.pick(domain);
    if (!assignment?.provider) {
      return res.json({ text: '' });
    }

    const contextWindow = extractSurroundingLines(fileContent, cursorLine, 40);

    const raw = await assignment.provider.complete(assignment.model.id, {
      messages: [
        {
          role: 'system',
          content: `Complete this code naturally from the cursor position. Return ONLY the
completion text (what comes after the cursor), nothing else — no explanation,
no markdown fences. If nothing sensible completes here, return an empty string.`
        },
        {
          role: 'user',
          content: `${contextWindow}\n<CURSOR>`
        }
      ],
      maxTokens: 60,
      temperature: 0.2
    });

    const completion = cleanCompletionText(raw?.text || '');
    return res.json({ text: completion });
  } catch (err) {
    return res.json({ text: '' });
  }
}

/**
 * Express router for Pair Mode endpoints.
 */
/** @param {{ secret?: string }} [opts] */
/**
 * BSEC-002: single guarded chain shared by BOTH aliases of this endpoint —
 * `POST /api/v1/pair/suggest` (inside pairRoutes) and the legacy
 * `POST /api/v1/pair-suggest` (mounted by route-policy.js). One definition,
 * so the auth guard can never drift between the two registrations.
 */
export function pairSuggestMiddleware({ secret, env = process.env } = {}) {
  return [authMiddleware({ secret }), (req, res) => handlePairSuggest(req, res, { secret, env })];
}


export function pairRoutes({ secret, env = process.env } = {}) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  // POST /api/v1/pair/suggest (legacy alias /api/v1/pair-suggest → route-policy.js)
  router.post('/suggest', ...pairSuggestMiddleware({ secret, env }));

  // POST /api/v1/pair/structural
  router.post('/structural', async (req, res) => {
    try {
      const { fileContent = '', cursorLine = 1, filePath = '', recentEdits = [] } = req.body || {};
      const modelRouter = await getOrCreateUserRouter(req.userId, secret, env);
      const suggestion = await checkForStructuralSuggestion(
        { fileContent, cursorLine, filePath, recentEdits },
        { router: modelRouter }
      );
      res.json({ suggestion });
    } catch {
      res.json({ suggestion: null });
    }
  });

  return router;
}
