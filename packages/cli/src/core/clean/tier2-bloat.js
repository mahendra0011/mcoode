import { readFile, readdir } from 'node:fs/promises';
import { relative, extname, join } from 'node:path';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
  '.cache', '.turbo', 'out', '.mcode', '.zcode'
]);
const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

/**
 * List files for bloat scan
 */
async function scanFiles(dir, baseDir = dir) {
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env') continue;
      if (IGNORE_DIRS.has(entry.name)) continue;

      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await scanFiles(fullPath, baseDir);
        files.push(...nested);
      } else if (entry.isFile() && CODE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  } catch {}
  return files;
}

/**
 * Heuristic bloat detector used as fallback or baseline
 */
function detectHeuristicBloat(source, relPath) {
  const findings = [];
  const lines = source.split('\n');
  const lineCount = lines.length;

  if (lineCount < 30) return findings;

  // 1. Check for massive functions (> 120 lines)
  let currentFunc = null;
  let braceDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const funcMatch = line.match(/(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>)/);
    if (funcMatch && braceDepth === 0) {
      currentFunc = {
        name: funcMatch[1] || funcMatch[2] || 'anonymous',
        startLine: i + 1,
      };
    }
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;

    if (currentFunc && braceDepth <= 0 && (openBraces > 0 || closeBraces > 0)) {
      const funcLines = (i + 1) - currentFunc.startLine + 1;
      if (funcLines > 120) {
        findings.push({
          id: `bloat-${relPath}-${currentFunc.startLine}`,
          category: 'bloat',
          file: relPath,
          startLine: currentFunc.startLine,
          endLine: i + 1,
          issue: `Function "${currentFunc.name}" is ${funcLines} lines long and likely overengineered`,
          currentLines: funcLines,
          estimatedCleanLines: Math.round(funcLines * 0.4),
          costsAI: false,
        });
      }
      currentFunc = null;
      braceDepth = 0;
    }
  }

  // 2. Check for identical multi-line blocks inside the same file (duplicate logic)
  const chunkSize = 6;
  const chunkMap = new Map();
  for (let i = 0; i <= lines.length - chunkSize; i += 2) {
    const chunk = lines.slice(i, i + chunkSize).map(l => l.trim()).filter(l => l && !l.startsWith('//')).join('\n');
    if (chunk.length > 80 && !chunk.includes('import ') && !chunk.includes('export ')) {
      if (chunkMap.has(chunk)) {
        const firstLine = chunkMap.get(chunk);
        findings.push({
          id: `dup-logic-${relPath}-${i + 1}`,
          category: 'duplicate-logic',
          file: relPath,
          startLine: i + 1,
          endLine: i + chunkSize,
          issue: `Repetitive logic block identical to line ${firstLine} (extract to shared helper)`,
          currentLines: chunkSize,
          estimatedCleanLines: 1,
          costsAI: false,
        });
      } else {
        chunkMap.set(chunk, i + 1);
      }
    }
  }

  return findings;
}

/**
 * Tier 2 (AI) — "This is overengineered" bloat detection
 * Scans files > 30 lines for AI-generated bloat, repetitive logic, and obsolete code.
 *
 * @param {string[]|string} filesOrProject - Array of file paths or project directory
 * @param {{ router?: object, thresholdLines?: number, projectPath?: string }} options
 */
export async function findBloat(filesOrProject, { router, thresholdLines = 30, projectPath = process.cwd() } = {}) {
  let fileList = [];
  if (Array.isArray(filesOrProject)) {
    fileList = filesOrProject;
  } else if (typeof filesOrProject === 'string') {
    fileList = await scanFiles(filesOrProject);
  } else {
    fileList = await scanFiles(projectPath);
  }

  const findings = [];
  let assignment = null;
  if (router && typeof router.pick === 'function') {
    try {
      assignment = await router.pick('general');
    } catch {
      // no AI router available
    }
  }

  for (const file of fileList) {
    let source = '';
    try {
      source = await readFile(file, 'utf8');
    } catch {
      continue;
    }

    const lines = source.split('\n');
    if (lines.length < thresholdLines) continue;

    const relPath = relative(projectPath, file).replace(/\\/g, '/');

    if (assignment && assignment.provider) {
      try {
        const raw = await assignment.provider.complete(assignment.model.id, {
          messages: [
            {
              role: 'system',
              content: `Look for code that is unnecessarily large or complex for what it actually accomplishes. Specifically flag:
(1) a simple operation implemented with far more code/abstraction than needed (category: "bloat")
(2) the same logic block duplicated 2+ times in this file that should be one shared function (category: "duplicate-logic")
(3) leftover code from a previous approach that a newer approach superseded but never removed (category: "dead-alternate").
For each finding, estimate how many lines a clean version would actually need vs how many it currently uses.
Return ONLY a valid JSON array of objects with keys:
"startLine" (number), "endLine" (number), "issue" (string), "currentLines" (number), "estimatedCleanLines" (number), "category" ("bloat"|"duplicate-logic"|"dead-alternate").
If no bloat is found, return [].`
            },
            {
              role: 'user',
              content: `File: ${relPath}\n\n${source.slice(0, 15000)}`
            }
          ],
          temperature: 0.1,
        });

        let jsonText = (raw?.text || '').trim();
        // Strip markdown code fences if present
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
        }

        if (jsonText.startsWith('[')) {
          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed)) {
            for (let idx = 0; idx < parsed.length; idx++) {
              const item = parsed[idx];
              findings.push({
                id: `ai-bloat-${relPath}-${item.startLine || idx}`,
                category: item.category || 'bloat',
                file: relPath,
                startLine: item.startLine,
                endLine: item.endLine,
                issue: item.issue,
                currentLines: item.currentLines || (item.endLine ? item.endLine - item.startLine + 1 : undefined),
                estimatedCleanLines: item.estimatedCleanLines ?? Math.round((item.currentLines || 10) * 0.3),
                costsAI: true,
              });
            }
            continue;
          }
        }
      } catch {
        // Fallback to heuristic
      }
    }

    // Heuristic fallback if AI was unavailable or had no findings
    const heuristicItems = detectHeuristicBloat(source, relPath);
    findings.push(...heuristicItems);
  }

  return findings;
}
