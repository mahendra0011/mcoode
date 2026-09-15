import fs from 'node:fs';
import path from 'node:path';

/**
 * Context helpers for scanning rules.
 */
export function hasDependency(ctx, depName) {
  return Boolean(
    ctx.dependencies?.[depName] ||
    ctx.devDependencies?.[depName] ||
    ctx.allDependencies?.has(depName)
  );
}

export function hasCallSite(ctx, regex) {
  if (!ctx.codeFiles || ctx.codeFiles.length === 0) return false;
  for (const file of ctx.codeFiles) {
    if (regex.test(file.content)) {
      return true;
    }
  }
  return false;
}

export function hasPattern(ctx, regex) {
  if (!ctx.codeFiles || ctx.codeFiles.length === 0) return false;
  for (const file of ctx.codeFiles) {
    const match = regex.exec(file.content);
    if (match) {
      // Find line number
      const pre = file.content.slice(0, match.index);
      const line = pre.split('\n').length;
      return { file: file.relPath, line, match: match[0] };
    }
  }
  return false;
}

export function isGitignored(ctx, fileName) {
  if (!ctx.gitignoreContent) return false;
  const lines = ctx.gitignoreContent.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  return lines.some((l) => l === fileName || l === `/${fileName}` || l === `*${fileName}` || l === `*.env` || l === `.env*`);
}

/**
 * The 17 industry-standard concrete security controls.
 * Every row is a dependency-check, pattern-match, file-existence check, or npm audit check.
 */
export const CHECKLIST = [
  // HTTP Hardening
  {
    id: 'helmet',
    category: 'http-hardening',
    label: 'Helmet security headers',
    check: (ctx) => Boolean(hasDependency(ctx, 'helmet') && hasCallSite(ctx, /helmet\s*\(/)),
    riskIfMissing: 'high',
    impact: 'Missing common HTTP security headers — exposes the app to clickjacking, MIME-sniffing, and other header-based attacks.'
  },
  {
    id: 'cors-scoped',
    category: 'http-hardening',
    label: 'CORS not wildcard in production',
    check: (ctx) => !hasPattern(ctx, /cors\s*\(\s*\{\s*origin\s*:\s*['"]\*['"]/),
    riskIfMissing: 'high',
    impact: 'Wildcard CORS lets any website make authenticated requests to your API — a major cross-origin attack surface.'
  },
  {
    id: 'rate-limit',
    category: 'http-hardening',
    label: 'Rate limiting on API routes',
    check: (ctx) => Boolean(
      (hasDependency(ctx, 'express-rate-limit') || hasDependency(ctx, 'rate-limiter-flexible')) &&
      (hasCallSite(ctx, /rateLimit\s*\(/) || hasCallSite(ctx, /RateLimiter/))
    ),
    riskIfMissing: 'medium',
    impact: 'No rate limiting — vulnerable to brute-force and denial-of-service.'
  },

  // Injection
  {
    id: 'sql-injection',
    category: 'injection',
    label: 'No string-concatenated SQL',
    check: (ctx) => !hasPattern(ctx, /SELECT .* \+ .*req\./i) && !hasPattern(ctx, /`SELECT[^`]*\$\{/i),
    riskIfMissing: 'critical',
    impact: 'CAN CRASH OR COMPROMISE THE DATABASE — attacker-controlled SQL execution.'
  },
  {
    id: 'nosql-injection',
    category: 'injection',
    label: 'No unsanitized NoSQL queries',
    check: (ctx) => !hasPattern(ctx, /\.find(?:One)?\s*\(\s*req\.(?:body|query)\s*\)/) && !hasPattern(ctx, /\$where\s*:/),
    riskIfMissing: 'critical',
    impact: 'Unsanitized user input passed directly into MongoDB query — risk of NoSQL injection and unauthorized data access.'
  },
  {
    id: 'xss',
    category: 'injection',
    label: 'No unescaped XSS output or dangerouslySetInnerHTML',
    check: (ctx) => !hasPattern(ctx, /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(?!['"`])/i) && !hasPattern(ctx, /\.innerHTML\s*=\s*(?!['"`])/i),
    riskIfMissing: 'high',
    impact: 'Unescaped user input rendered into the DOM — allows cross-site scripting (XSS) attacks.'
  },
  {
    id: 'ssrf',
    category: 'injection',
    label: 'No unvalidated SSRF fetch calls',
    check: (ctx) => !hasPattern(ctx, /fetch\s*\(\s*req\.(?:body|query)\.[a-zA-Z0-9_]*url/i) && !hasPattern(ctx, /axios\.(?:get|post)\s*\(\s*req\.(?:body|query)\.[a-zA-Z0-9_]*url/i),
    riskIfMissing: 'high',
    impact: 'Server-side fetch of user-supplied URL without allowlist — exposes internal networks and cloud metadata.'
  },

  // Input validation
  {
    id: 'input-validation',
    category: 'input-validation',
    label: 'Request bodies validated against schema',
    check: (ctx) => Boolean(
      (hasDependency(ctx, 'zod') || hasDependency(ctx, 'joi') || hasDependency(ctx, 'express-validator') || hasDependency(ctx, 'yup') || hasDependency(ctx, 'valibot')) &&
      (hasCallSite(ctx, /\.parse\s*\(/) || hasCallSite(ctx, /\.safeParse\s*\(/) || hasCallSite(ctx, /validate\s*\(/) || hasCallSite(ctx, /body\s*\(/) || hasCallSite(ctx, /check\s*\(/))
    ),
    riskIfMissing: 'high',
    impact: 'Unvalidated request payloads can cause runtime crashes, type errors, and unexpected logic execution.'
  },

  // Auth & secrets
  {
    id: 'bcrypt',
    category: 'auth',
    label: 'Passwords hashed with bcrypt/argon2',
    check: (ctx) => Boolean(
      (hasDependency(ctx, 'bcryptjs') || hasDependency(ctx, 'bcrypt') || hasDependency(ctx, 'argon2')) &&
      !hasPattern(ctx, /(?:md5|sha1)\s*\([^)]*password/i)
    ),
    riskIfMissing: 'critical',
    impact: 'Plaintext or weakly-hashed passwords — a database breach directly exposes user credentials.'
  },
  {
    id: 'jwt-secret-env',
    category: 'auth',
    label: 'JWT secret from environment, not hardcoded',
    check: (ctx) => !hasPattern(ctx, /jwt\.sign\([^,]+,\s*['"][^'"]{8,}['"]/),
    riskIfMissing: 'critical',
    impact: 'Hardcoded JWT secret — anyone with source access can forge valid auth tokens.'
  },
  {
    id: 'no-hardcoded-secrets',
    category: 'auth',
    label: 'No hardcoded API keys/secrets/tokens in source',
    check: (ctx) => !hasPattern(ctx, /(?:AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|api_key\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"])/i),
    riskIfMissing: 'critical',
    impact: 'Hardcoded secrets leaked in source code can lead to credential theft and unauthorized infrastructure access.'
  },

  // Data protection
  {
    id: 'encryption-at-rest',
    category: 'data-protection',
    label: 'Sensitive data encrypted at rest',
    check: (ctx) => !hasPattern(ctx, /(?:creditCard|ssn|cardNumber|cvv)\s*:\s*\{\s*type\s*:\s*String(?!\s*,\s*select\s*:\s*false)(?!\s*,\s*encrypt)/i),
    riskIfMissing: 'medium',
    impact: 'Sensitive customer PII or financial fields stored without field-level or DB encryption.'
  },
  {
    id: 'env-gitignored',
    category: 'data-protection',
    label: '.env files excluded from git',
    check: (ctx) => isGitignored(ctx, '.env'),
    riskIfMissing: 'high',
    impact: 'Secrets committed to git history are effectively permanently leaked, even if removed later.'
  },
  {
    id: 'no-sensitive-logs',
    category: 'data-protection',
    label: 'No sensitive data in logs',
    check: (ctx) => !hasPattern(ctx, /(?:console\.log|logger\.(?:info|debug|warn))\s*\([^)]*(?:password|token|secret|ssn|card\b|req\.body\b(?!\.))/i),
    riskIfMissing: 'medium',
    impact: 'Passwords, tokens, or raw request payloads logged to standard out or monitoring systems.'
  },

  // Dependencies
  {
    id: 'npm-audit',
    category: 'dependencies',
    label: 'No known-vulnerable dependencies',
    check: (ctx) => {
      const vulns = ctx.npmAuditResult?.vulnerabilities;
      if (!vulns) return true;
      if (Array.isArray(vulns)) {
        return vulns.filter((v) => ['high', 'critical'].includes(String(v.severity || '').toLowerCase())).length === 0;
      }
      if (typeof vulns === 'object') {
        return !Object.values(vulns).some((v) => ['high', 'critical'].includes(String(v.severity || '').toLowerCase()));
      }
      return true;
    },
    riskIfMissing: 'high',
    impact: 'Uses dependencies with publicly known, exploitable vulnerabilities.'
  },

  // Data-leak surface
  {
    id: 'debug-stack-traces',
    category: 'data-leak',
    label: 'No stack traces leaked in production error responses',
    check: (ctx) => !hasPattern(ctx, /res\.(?:status\([^)]*\)\.)?(?:json|send)\s*\(\s*\{[^}]*stack\s*:\s*err\.stack(?!.*NODE_ENV)/i),
    riskIfMissing: 'medium',
    impact: 'Internal stack traces and file paths leaked to external clients during errors.'
  },
  {
    id: 'unprotected-admin-routes',
    category: 'data-leak',
    label: 'Admin routes protected by auth middleware',
    check: (ctx) => !hasPattern(ctx, /app\.(?:get|post|put|delete|use)\s*\(\s*['"]\/(?:api\/)?admin(?!\/)['"]\s*,\s*(?!.*(?:auth|token|verify|session|protect))/i),
    riskIfMissing: 'high',
    impact: 'Administrative routes declared without authentication middleware in the handler chain.'
  }
];
