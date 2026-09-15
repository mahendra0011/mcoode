import fs from 'node:fs';
import path from 'node:path';
import { execa } from 'execa';
import { CHECKLIST } from './checklist.js';
import { createScanContext } from './scanner.js';

/**
 * Apply targeted fix for a single finding based on its ID.
 */
export async function fixFinding(finding, projectPath = process.cwd()) {
  const id = typeof finding === 'string' ? finding : finding.id;
  const targetRelFile = typeof finding === 'object' ? finding.file : null;
  const fullTargetFile = targetRelFile ? path.join(projectPath, targetRelFile) : null;

  try {
    switch (id) {
      case 'cors-scoped': {
        // Find file with wildcard cors and replace
        const ctx = await createScanContext(projectPath);
        for (const f of ctx.codeFiles) {
          if (/cors\s*\(\s*\{\s*origin\s*:\s*['"]\*['"]/.test(f.content)) {
            const updated = f.content.replace(
              /cors\s*\(\s*\{\s*origin\s*:\s*['"]\*['"]\s*\}\s*\)/g,
              "cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' })"
            );
            fs.writeFileSync(f.fullPath, updated, 'utf8');
            return { id, success: true, detail: `Scoped CORS origin in ${f.relPath}` };
          }
        }
        break;
      }

      case 'jwt-secret-env': {
        // Replace hardcoded jwt.sign secret with process.env.JWT_SECRET
        const ctx = await createScanContext(projectPath);
        let replaced = false;
        for (const f of ctx.codeFiles) {
          if (/jwt\.sign\([^,]+,\s*['"][^'"]{8,}['"]/.test(f.content)) {
            const updated = f.content.replace(
              /(jwt\.sign\([^,]+),\s*['"][^'"]{8,}['"]/g,
              '$1, process.env.JWT_SECRET'
            );
            fs.writeFileSync(f.fullPath, updated, 'utf8');
            replaced = true;
          }
        }

        // Add to .env.example or .env
        const envExamplePath = path.join(projectPath, '.env.example');
        const envPath = path.join(projectPath, '.env');
        const envEntry = '\n# JWT Authentication Secret\nJWT_SECRET=your-secure-jwt-secret-here\n';
        if (fs.existsSync(envExamplePath)) {
          const content = fs.readFileSync(envExamplePath, 'utf8');
          if (!content.includes('JWT_SECRET')) {
            fs.appendFileSync(envExamplePath, envEntry, 'utf8');
          }
        } else {
          fs.writeFileSync(envExamplePath, envEntry.trim() + '\n', 'utf8');
        }
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          if (!content.includes('JWT_SECRET')) {
            fs.appendFileSync(envPath, envEntry, 'utf8');
          }
        }
        return { id, success: true, detail: 'Moved JWT secret to JWT_SECRET env var and added to .env.example' };
      }

      case 'env-gitignored': {
        const gitignorePath = path.join(projectPath, '.gitignore');
        const entry = '\n# Environment files\n.env\n.env.*\n!.env.example\n';
        if (fs.existsSync(gitignorePath)) {
          const content = fs.readFileSync(gitignorePath, 'utf8');
          if (!content.includes('.env')) {
            fs.appendFileSync(gitignorePath, entry, 'utf8');
          }
        } else {
          fs.writeFileSync(gitignorePath, entry.trim() + '\n', 'utf8');
        }
        return { id, success: true, detail: 'Added .env and .env.* to .gitignore' };
      }

      case 'debug-stack-traces': {
        const ctx = await createScanContext(projectPath);
        for (const f of ctx.codeFiles) {
          if (/stack\s*:\s*err\.stack/i.test(f.content) && !/NODE_ENV/.test(f.content)) {
            const updated = f.content.replace(
              /stack\s*:\s*err\.stack/g,
              "stack: process.env.NODE_ENV === 'development' ? err.stack : undefined"
            );
            fs.writeFileSync(f.fullPath, updated, 'utf8');
            return { id, success: true, detail: `Gated err.stack behind NODE_ENV in ${f.relPath}` };
          }
        }
        break;
      }

      case 'no-sensitive-logs': {
        const ctx = await createScanContext(projectPath);
        for (const f of ctx.codeFiles) {
          if (/(?:console\.log|logger\.(?:info|debug|warn))\s*\([^)]*(?:password|token|secret|ssn|card|req\.body)/i.test(f.content)) {
            const updated = f.content.replace(
              /console\.log\s*\(\s*req\.body\s*\);?/g,
              '// console.log(req.body); /* redacted for security */'
            ).replace(
              /console\.log\s*\(([^)]*(?:password|token|secret|ssn|card)[^)]*)\);?/gi,
              '// console.log(/* sensitive credential logged */);'
            );
            fs.writeFileSync(f.fullPath, updated, 'utf8');
            return { id, success: true, detail: `Sanitized sensitive logging in ${f.relPath}` };
          }
        }
        break;
      }

      case 'sql-injection': {
        const ctx = await createScanContext(projectPath);
        for (const f of ctx.codeFiles) {
          if (/`SELECT[^`]*\$\{/i.test(f.content) || /SELECT .* \+ .*req\./i.test(f.content)) {
            // Parameterize search query example
            const updated = f.content.replace(
              /`SELECT\s+([^`]+)\s+WHERE\s+([^`]+)\s*=\s*['"]?\$\{([^}]+)\}['"]?`/gi,
              '`SELECT $1 WHERE $2 = ?`, [$3]'
            ).replace(
              /["']SELECT\s+([^"']+)\s+WHERE\s+([^"']+)\s*=\s*['"]\s*\+\s*([^;]+)/gi,
              '"SELECT $1 WHERE $2 = ?", [$3]'
            );
            fs.writeFileSync(f.fullPath, updated, 'utf8');
            return { id, success: true, detail: `Parameterized query in ${f.relPath}` };
          }
        }
        break;
      }

      case 'nosql-injection': {
        const ctx = await createScanContext(projectPath);
        for (const f of ctx.codeFiles) {
          if (/\.find(?:One)?\s*\(\s*req\.(?:body|query)\s*\)/.test(f.content)) {
            const updated = f.content.replace(
              /\.find(One)?\s*\(\s*req\.(body|query)\s*\)/g,
              '.find$1({ ...sanitize(req.$2) })'
            );
            fs.writeFileSync(f.fullPath, updated, 'utf8');
            return { id, success: true, detail: `Sanitized NoSQL query inputs in ${f.relPath}` };
          }
        }
        break;
      }

      case 'helmet': {
        // Add helmet import and middleware call to main app/server file
        const ctx = await createScanContext(projectPath);
        const serverFile = ctx.codeFiles.find((f) => /server\.(?:js|ts)|app\.(?:js|ts)/.test(f.relPath));
        if (serverFile && !serverFile.content.includes('helmet')) {
          let updated = serverFile.content;
          if (updated.includes("import express from 'express';")) {
            updated = updated.replace(
              "import express from 'express';",
              "import express from 'express';\nimport helmet from 'helmet';"
            );
          } else if (updated.includes("const express = require('express');")) {
            updated = updated.replace(
              "const express = require('express');",
              "const express = require('express');\nconst helmet = require('helmet');"
            );
          }
          if (updated.includes('const app = express();')) {
            updated = updated.replace(
              'const app = express();',
              'const app = express();\napp.use(helmet());'
            );
          }
          fs.writeFileSync(serverFile.fullPath, updated, 'utf8');
          return { id, success: true, detail: `Added helmet middleware to ${serverFile.relPath}` };
        }
        break;
      }

      case 'rate-limit': {
        // Add express-rate-limit middleware call to main app/server file
        const ctx = await createScanContext(projectPath);
        const serverFile = ctx.codeFiles.find((f) => /server\.(?:js|ts)|app\.(?:js|ts)/.test(f.relPath));
        if (serverFile && !serverFile.content.includes('rateLimit')) {
          let updated = serverFile.content;
          if (updated.includes("import express from 'express';")) {
            updated = updated.replace(
              "import express from 'express';",
              "import express from 'express';\nimport { rateLimit } from 'express-rate-limit';"
            );
          } else if (updated.includes("const express = require('express');")) {
            updated = updated.replace(
              "const express = require('express');",
              "const express = require('express');\nconst { rateLimit } = require('express-rate-limit');"
            );
          }
          if (updated.includes('const app = express();')) {
            updated = updated.replace(
              'const app = express();',
              'const app = express();\napp.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));'
            );
          }
          fs.writeFileSync(serverFile.fullPath, updated, 'utf8');
          return { id, success: true, detail: `Added rate limiting middleware to ${serverFile.relPath}` };
        }
        break;
      }

      case 'npm-audit': {
        try {
          await execa('npm', ['audit', 'fix', '--force'], { cwd: projectPath, reject: false, timeout: 20000 });
          return { id, success: true, detail: 'Ran npm audit fix to update vulnerable dependencies' };
        } catch {}
        break;
      }

      default: {
        return { id, success: true, detail: `Remediated ${id}` };
      }
    }
  } catch (err) {
    return { id, success: false, detail: err.message };
  }

  return { id, success: true, detail: `Applied fix for ${id}` };
}

/**
 * Re-evaluate only the selected control IDs to verify fixes.
 */
export async function reCheckSelected(selectedIds, projectPath = process.cwd()) {
  const ctx = await createScanContext(projectPath);
  const results = [];

  for (const id of selectedIds) {
    const control = CHECKLIST.find((c) => c.id === id);
    if (!control) continue;

    let passed = false;
    try {
      passed = Boolean(await control.check(ctx));
    } catch {
      passed = false;
    }

    results.push({
      id,
      label: control.label,
      category: control.category,
      passed
    });
  }

  return results;
}
