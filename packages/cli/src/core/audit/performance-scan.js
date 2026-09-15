import { readdir, stat, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { existsSync } from 'node:fs';

const CODE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'coverage', '.mcode', '.next', 'dist', 'build', '.cache', 'out', 'vendor', 'tmp', 'temp']);

/**
 * Walk directory recursively collecting files.
 */
async function walkFiles(dir, maxDepth = 5, currentDepth = 0, ignoreSet = IGNORED_DIRS) {
  if (currentDepth > maxDepth || !existsSync(dir)) return [];
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignoreSet && ignoreSet.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await walkFiles(full, maxDepth, currentDepth + 1, ignoreSet);
        files.push(...sub);
      } else {
        files.push(full);
      }
    }
  } catch {
    // Ignore read errors
  }
  return files;
}

/**
 * 1. Bundle size analysis (no AI — build output inspection).
 */
export async function analyzeBundleSize(projectPath) {
  const candidateDirs = [
    join(projectPath, 'dist'),
    join(projectPath, 'build'),
    join(projectPath, '.next', 'static', 'chunks'),
    join(projectPath, 'out')
  ];

  let largestChunkKB = 0;
  let largestChunkName = '';
  let totalBuildKB = 0;
  let foundBuildOutput = false;

  for (const dir of candidateDirs) {
    if (existsSync(dir)) {
      foundBuildOutput = true;
      const files = await walkFiles(dir, 4, 0, new Set(['node_modules', '.git']));
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.mjs')) {
          try {
            const s = await stat(file);
            const sizeKB = Math.round(s.size / 1024);
            totalBuildKB += sizeKB;
            if (sizeKB > largestChunkKB) {
              largestChunkKB = sizeKB;
              largestChunkName = relative(projectPath, file).replace(/\\/g, '/');
            }
          } catch {}
        }
      }
    }
  }

  return {
    foundBuildOutput,
    mainChunkKB: largestChunkKB,
    mainChunkName: largestChunkName,
    totalBuildKB
  };
}

/**
 * 2. N+1 query patterns (pattern scan, no AI — heuristic query in loop).
 */
export async function scanForN1Queries(projectPath) {
  const findings = [];
  const codeFiles = await walkFiles(projectPath, 5);

  const loopRegex = /(?:for\s*\([^)]+\)|\.(?:map|forEach)\s*\(\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*(?:=>)?)\s*\{([\s\S]*?)\}/gi;
  const dbCallRegex = /\b(?:await\s+)?(?:db|prisma|knex|sequelize|mongoose|model|[A-Z][a-zA-Z0-9_]*)\.(?:find|query|select|findById|findOne|exec)\s*\(/i;

  for (const file of codeFiles) {
    const ext = extname(file).toLowerCase();
    if (!CODE_EXTS.has(ext)) continue;
    if (file.includes('.test.') || file.includes('.spec.')) continue;

    try {
      const content = await readFile(file, 'utf8');
      const rel = relative(projectPath, file).replace(/\\/g, '/');

      let match;
      while ((match = loopRegex.exec(content)) !== null) {
        const loopBody = match[1];
        if (dbCallRegex.test(loopBody)) {
          const pre = content.slice(0, match.index);
          const line = pre.split('\n').length;
          findings.push({
            severity: 'high',
            category: 'n1-query',
            rule: 'n-plus-one-query',
            file: rel,
            line,
            msg: `N+1 query pattern detected in ${rel}:${line} — database query inside a loop`
          });
          if (findings.length >= 5) break;
        }
      }
    } catch {}
  }

  return findings;
}

/**
 * 3. Missing DB indexes on foreign keys / search fields.
 */
export async function scanForMissingIndexes(projectPath) {
  const findings = [];
  const allFiles = await walkFiles(projectPath, 5);

  for (const file of allFiles) {
    const rel = relative(projectPath, file).replace(/\\/g, '/');
    const isPrisma = file.endsWith('schema.prisma');
    const isMongoose = /models?\/.*\.js$/i.test(file) || /schema.*\.js$/i.test(file) || /schemas?\/.*\.js$/i.test(file);
    const isSql = file.endsWith('.sql') || /migrations?\/.*\.sql$/i.test(file);

    if (!isPrisma && !isMongoose && !isSql) continue;

    try {
      const content = await readFile(file, 'utf8');

      if (isPrisma) {
        // Look for fields ending in Id without @@index([field])
        const fieldMatches = content.matchAll(/^\s+([a-zA-Z0-9_]+Id)\s+[a-zA-Z0-9_]+/gm);
        for (const m of fieldMatches) {
          const field = m[1];
          if (!content.includes(`@@index([${field}])`) && !content.includes(`@relation`) && !content.includes(`@id`)) {
            findings.push({
              severity: 'medium',
              category: 'missing-index',
              rule: 'missing-index',
              file: rel,
              msg: `Potential missing DB index on relational key "${field}" in ${rel}`
            });
          }
        }
      } else if (isMongoose) {
        // Look for Schema.Types.ObjectId or *Id: { type: ... } without index: true
        const refMatches = content.matchAll(/([a-zA-Z0-9_]+)\s*:\s*\{[^}]*type\s*:\s*(?:Schema\.Types\.ObjectId|String|Number)[^}]*\}/gm);
        for (const m of refMatches) {
          const block = m[0];
          const field = m[1];
          if ((field.endsWith('Id') || block.includes('ObjectId')) && !block.includes('index: true') && !block.includes('unique: true') && !content.includes(`index({ ${field}`)) {
            findings.push({
              severity: 'medium',
              category: 'missing-index',
              rule: 'missing-index',
              file: rel,
              msg: `Field "${field}" in ${rel} appears to be a foreign key and should be indexed for query performance`
            });
            if (findings.length >= 5) break;
          }
        }
      }
    } catch {}
  }

  return findings;
}

/**
 * 4. Unoptimized images (file size + format check).
 */
export async function scanImageAssets(projectPath) {
  const findings = [];
  const allFiles = await walkFiles(projectPath, 5);

  for (const file of allFiles) {
    const ext = extname(file).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;

    try {
      const s = await stat(file);
      const sizeKB = Math.round(s.size / 1024);
      if (sizeKB > 500) {
        const rel = relative(projectPath, file).replace(/\\/g, '/');
        findings.push({
          severity: 'low',
          category: 'unoptimized-image',
          rule: 'unoptimized-image',
          file: rel,
          msg: `Unoptimized image "${rel}" (${sizeKB}KB) — consider compressing or converting to WebP/AVIF`
        });
      }
    } catch {}
  }

  return findings;
}

/**
 * Counts findings by severity: critical, high, medium, low.
 */
export function countBySeverity(findings = []) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    const sev = String(f.severity || 'low').toLowerCase();
    if (sev === 'critical') counts.critical++;
    else if (sev === 'high') counts.high++;
    else if (sev === 'medium') counts.medium++;
    else counts.low++;
  }
  return counts;
}

/**
 * Runs complete performance scan with ZERO AI calls.
 */
export async function runPerformanceScan(projectPath = process.cwd()) {
  const findings = [];

  // 1. Bundle size
  const bundleStats = await analyzeBundleSize(projectPath);
  if (bundleStats.mainChunkKB > 500) {
    findings.push({
      severity: 'medium',
      category: 'performance',
      rule: 'bundle-size',
      file: bundleStats.mainChunkName || 'dist',
      msg: `Main bundle chunk is ${bundleStats.mainChunkKB}KB — exceeds recommended 500KB, consider code-splitting`
    });
  }

  // 2. N+1 query patterns
  const n1Findings = await scanForN1Queries(projectPath);
  findings.push(...n1Findings);

  // 3. Missing DB indexes
  const indexFindings = await scanForMissingIndexes(projectPath);
  findings.push(...indexFindings);

  // 4. Unoptimized images
  const imageFindings = await scanImageAssets(projectPath);
  findings.push(...imageFindings);

  return {
    findings,
    counts: countBySeverity(findings),
    stats: {
      bundleStats,
      n1Count: n1Findings.length,
      missingIndexCount: indexFindings.length,
      largeImagesCount: imageFindings.length
    }
  };
}
