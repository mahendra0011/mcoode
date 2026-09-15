import { Router } from 'express';
import { db } from '../db.js';
import { deriveMasterKey, decryptKey } from '../secret-enc.js';
import { CostLedger } from '@mcode/shared';

// LRU/Map cache for user ModelRouter instances to avoid re-decrypting keys on every single keystroke.
const routerCache = new Map();
const ROUTER_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Extracts surrounding lines around the current cursor to keep the prompt small and latency sub-second.
 */
export function extractSurroundingLines(fileContent = '', cursorLine = 1, windowSize = 40) {
  if (!fileContent) return '';
  const lines = fileContent.split('\n');
  const lineIdx = Math.max(0, (cursorLine || 1) - 1);
  const half = Math.floor(windowSize / 2);
  const start = Math.max(0, lineIdx - half);
  const end = Math.min(lines.length, lineIdx + half + 1);
  return lines.slice(start, end).join('\n');
}

/**
 * Infers model routing domain based on file extension.
 */
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
  return 'frontend';
}

/**
 * Clean model output so it's strictly inline completion text.
 */
export function cleanCompletionText(rawText = '') {
  let text = String(rawText || '').replace(/\r\n/g, '\n');
  // Strip enclosing markdown code block fences if returned
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, '');
  }
  // Trim trailing whitespace but preserve essential indentation
  return text.trimEnd();
}

/**
 * Resolves or builds a cached ModelRouter for a user.
 */
export async function getOrCreateUserRouter(userId, secret) {
  const cacheKey = userId || 'default';
  const cached = routerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ROUTER_CACHE_TTL_MS) {
    return cached.router;
  }

  const secrets = {};

  if (userId) {
    try {
      const keys = await db().apiKey.find({ userId });
      const masterKey = deriveMasterKey(secret || 'mcode-dev-secret-change-me', userId);
      for (const k of keys) {
        try {
          const dec = decryptKey(k.encryptedKey, masterKey);
          if (dec && !/[\u2022\u25cf\u2219]/.test(dec) && dec !== 'existing-key') {
            secrets[k.envVar] = dec;
          }
        } catch {}
      }
    } catch {}
  }

  // Fallback to process.env
  for (const [envK, envV] of Object.entries(process.env)) {
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
    return router;
  } catch {
    return null;
  }
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

  // Heuristic 1: Async function or await statement without try/catch
  if (/\bawait\s+[a-zA-Z0-9_$.]+\s*\(/.test(currentLine) || (lines[lineIdx - 1] && /\bawait\s+/.test(lines[lineIdx - 1]))) {
    const checkBlock = lines.slice(Math.max(0, lineIdx - 6), Math.min(lines.length, lineIdx + 7)).join('\n');
    if (!checkBlock.includes('try {') && !checkBlock.includes('.catch(')) {
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
        const parsed = JSON.parse(raw?.text?.trim()?.replace(/^```json/, '')?.replace(/```$/, '') || '{}');
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
export async function handlePairSuggest(req, res, { secret } = {}) {
  const { fileContent = '', cursorLine = 1, cursorColumn = 1, filePath = '' } = req.body || {};

  if (!fileContent && fileContent !== '') {
    return res.json({ text: '' });
  }

  try {
    const router = await getOrCreateUserRouter(req.userId, secret);
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
export function pairRoutes({ secret } = {}) {
  const router = Router();

  // POST /api/v1/pair/suggest & /api/v1/pair-suggest
  router.post('/suggest', (req, res) => handlePairSuggest(req, res, { secret }));

  // POST /api/v1/pair/structural
  router.post('/structural', async (req, res) => {
    try {
      const { fileContent = '', cursorLine = 1, filePath = '', recentEdits = [] } = req.body || {};
      const modelRouter = await getOrCreateUserRouter(req.userId, secret);
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
