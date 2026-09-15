import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  CHECKLIST,
  runSecurityCheck,
  fixFinding,
  reCheckSelected,
  generateMarkdownReport,
  saveReport,
  hasDependency,
  hasCallSite,
  hasPattern,
  isGitignored
} from '../src/core/security-checkup/index.js';

describe('Production Security Checkup Mode (doc 47)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcode-security-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Checklist controls definition', () => {
    it('has all 17 industry-standard controls across 7 categories', () => {
      expect(CHECKLIST.length).toBe(17);
      const categories = new Set(CHECKLIST.map((c) => c.category));
      expect(categories).toContain('http-hardening');
      expect(categories).toContain('injection');
      expect(categories).toContain('input-validation');
      expect(categories).toContain('auth');
      expect(categories).toContain('data-protection');
      expect(categories).toContain('dependencies');
      expect(categories).toContain('data-leak');

      for (const item of CHECKLIST) {
        expect(item.id).toBeDefined();
        expect(item.label).toBeDefined();
        expect(['critical', 'high', 'medium']).toContain(item.riskIfMissing);
        expect(item.impact).toBeDefined();
        expect(typeof item.check).toBe('function');
      }
    });

    it('has the exact control IDs specified in doc 47', () => {
      const ids = CHECKLIST.map((c) => c.id);
      expect(ids).toContain('helmet');
      expect(ids).toContain('cors-scoped');
      expect(ids).toContain('rate-limit');
      expect(ids).toContain('sql-injection');
      expect(ids).toContain('nosql-injection');
      expect(ids).toContain('xss');
      expect(ids).toContain('ssrf');
      expect(ids).toContain('input-validation');
      expect(ids).toContain('bcrypt');
      expect(ids).toContain('jwt-secret-env');
      expect(ids).toContain('no-hardcoded-secrets');
      expect(ids).toContain('encryption-at-rest');
      expect(ids).toContain('env-gitignored');
      expect(ids).toContain('no-sensitive-logs');
      expect(ids).toContain('npm-audit');
      expect(ids).toContain('debug-stack-traces');
      expect(ids).toContain('unprotected-admin-routes');
    });
  });

  describe('Detection primitives & checks', () => {
    it('detects missing helmet and passes present helmet', () => {
      const helmetCtrl = CHECKLIST.find((c) => c.id === 'helmet');
      const failCtx = {
        dependencies: {},
        codeFiles: [{ relPath: 'server.js', content: 'const app = express();' }]
      };
      expect(helmetCtrl.check(failCtx)).toBe(false);

      const passCtx = {
        dependencies: { helmet: '^7.0.0' },
        codeFiles: [{ relPath: 'server.js', content: 'import helmet from "helmet"; app.use(helmet());' }]
      };
      expect(helmetCtrl.check(passCtx)).toBe(true);
    });

    it('detects wildcard CORS and passes scoped CORS', () => {
      const corsCtrl = CHECKLIST.find((c) => c.id === 'cors-scoped');
      const wildcardCtx = {
        codeFiles: [{ relPath: 'server.js', content: 'app.use(cors({ origin: "*" }));' }]
      };
      expect(corsCtrl.check(wildcardCtx)).toBe(false);

      const scopedCtx = {
        codeFiles: [{ relPath: 'server.js', content: 'app.use(cors({ origin: process.env.CORS_ORIGIN }));' }]
      };
      expect(corsCtrl.check(scopedCtx)).toBe(true);
    });

    it('detects string-concatenated SQL injection risk', () => {
      const sqlCtrl = CHECKLIST.find((c) => c.id === 'sql-injection');
      const vulnerableCtx = {
        codeFiles: [{ relPath: 'src/api/search.js', content: 'const res = db.query(`SELECT * FROM users WHERE name = ${req.query.q}`);' }]
      };
      expect(sqlCtrl.check(vulnerableCtx)).toBe(false);

      const safeCtx = {
        codeFiles: [{ relPath: 'src/api/search.js', content: 'const res = db.query("SELECT * FROM users WHERE name = ?", [req.query.q]);' }]
      };
      expect(sqlCtrl.check(safeCtx)).toBe(true);
    });

    it('detects hardcoded JWT secrets', () => {
      const jwtCtrl = CHECKLIST.find((c) => c.id === 'jwt-secret-env');
      const vulnerableCtx = {
        codeFiles: [{ relPath: 'src/auth/jwt.js', content: 'jwt.sign(payload, "my-super-secret-key-12345");' }]
      };
      expect(jwtCtrl.check(vulnerableCtx)).toBe(false);

      const safeCtx = {
        codeFiles: [{ relPath: 'src/auth/jwt.js', content: 'jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });' }]
      };
      expect(jwtCtrl.check(safeCtx)).toBe(true);
    });

    it('detects .env excluded or missing in .gitignore', () => {
      const envCtrl = CHECKLIST.find((c) => c.id === 'env-gitignored');
      const noGitignoreCtx = { gitignoreContent: 'node_modules\ndist\n' };
      expect(envCtrl.check(noGitignoreCtx)).toBe(false);

      const gitignoredCtx = { gitignoreContent: 'node_modules\n.env\n.env.*\n' };
      expect(envCtrl.check(gitignoredCtx)).toBe(true);
    });

    it('detects sensitive credentials in logs', () => {
      const logCtrl = CHECKLIST.find((c) => c.id === 'no-sensitive-logs');
      const badCtx = {
        codeFiles: [{ relPath: 'src/routes/auth.js', content: 'console.log("Password is", req.body.password);' }]
      };
      expect(logCtrl.check(badCtx)).toBe(false);

      const cleanCtx = {
        codeFiles: [{ relPath: 'src/routes/auth.js', content: 'console.log("Auth attempt for", req.body.email);' }]
      };
      expect(logCtrl.check(cleanCtx)).toBe(true);
    });
  });

  describe('Scanner integration', () => {
    it('scans a project directory and scopes by category', async () => {
      // Create test project fixture in tmpDir
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        name: 'test-project',
        dependencies: {
          bcryptjs: '^2.4.3',
          jsonwebtoken: '^9.0.0'
        }
      }));
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules\n.env\n');
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'src', 'server.js'),
        'const token = jwt.sign({ id: 1 }, "hardcoded-secret-key-value");'
      );

      // Scoped scan for auth
      const authScan = await runSecurityCheck({ projectPath: tmpDir, category: 'auth' });
      expect(authScan.findings.length).toBeGreaterThan(0);
      const jwtFinding = authScan.findings.find((f) => f.id === 'jwt-secret-env');
      expect(jwtFinding).toBeDefined();
      expect(jwtFinding.risk).toBe('critical');

      // Full scan
      const fullScan = await runSecurityCheck({ projectPath: tmpDir });
      expect(fullScan.totalChecks).toBe(17);
      expect(fullScan.findings.some((f) => f.id === 'jwt-secret-env')).toBe(true);
      expect(fullScan.passed.some((p) => p.id === 'env-gitignored')).toBe(true);
    });
  });

  describe('Remediation & Re-check', () => {
    it('fixes hardcoded JWT secret and reCheckSelected verifies it', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'fix-test' }));
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules\n.env\n');
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'src', 'jwt.js'),
        'const token = jwt.sign(payload, "secret-key-that-is-hardcoded");'
      );

      // Run initial check
      const scan1 = await runSecurityCheck({ projectPath: tmpDir, category: 'auth' });
      expect(scan1.findings.some((f) => f.id === 'jwt-secret-env')).toBe(true);

      // Apply fix for jwt-secret-env
      const fixResult = await fixFinding('jwt-secret-env', tmpDir);
      expect(fixResult.success).toBe(true);

      // Verify file was updated to use process.env.JWT_SECRET
      const updatedCode = fs.readFileSync(path.join(tmpDir, 'src', 'jwt.js'), 'utf8');
      expect(updatedCode).toContain('process.env.JWT_SECRET');

      // reCheckSelected verifies only the fixed item
      const reVerified = await reCheckSelected(['jwt-secret-env'], tmpDir);
      expect(reVerified).toHaveLength(1);
      expect(reVerified[0].id).toBe('jwt-secret-env');
      expect(reVerified[0].passed).toBe(true);
    });

    it('fixes gitignored .env and verifies', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'git-test' }));
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules\n');

      const reCheckBefore = await reCheckSelected(['env-gitignored'], tmpDir);
      expect(reCheckBefore[0].passed).toBe(false);

      await fixFinding('env-gitignored', tmpDir);

      const reCheckAfter = await reCheckSelected(['env-gitignored'], tmpDir);
      expect(reCheckAfter[0].passed).toBe(true);
    });
  });

  describe('Report generation', () => {
    it('generates markdown matching Doc 47 format and saves to .mcode/reports/', () => {
      const scanResults = {
        findings: [
          { id: 'sql-injection', label: 'SQL injection risk', file: 'src/api/search.js', line: 34, risk: 'critical', impact: 'can crash or compromise the database' },
          { id: 'jwt-secret-env', label: 'JWT secret hardcoded', file: 'src/auth/jwt.js', line: 12, risk: 'critical', impact: 'attacker can forge valid tokens' },
          { id: 'rate-limit', label: 'No rate limiting on API routes', file: 'server.js', line: 1, risk: 'high', impact: 'vulnerable to brute-force' }
        ],
        passed: [
          { id: 'helmet', label: 'Helmet security headers' },
          { id: 'cors-scoped', label: 'CORS not wildcard' }
        ],
        totalChecks: 17,
        timestamp: '2026-09-14T12:00:00.000Z'
      };

      const md = generateMarkdownReport(scanResults, 'my-test-app');
      expect(md).toContain('# Security Checkup Report — my-test-app');
      expect(md).toContain('## Critical (fix immediately — can crash system or leak data)');
      expect(md).toContain('- **SQL injection risk** — src/api/search.js:34 — can crash or compromise the database');
      expect(md).toContain('- **JWT secret hardcoded** — src/auth/jwt.js:12 — attacker can forge valid tokens');
      expect(md).toContain('## Passed Checks (2)');
      expect(md).toContain('- ✓ Helmet security headers');
      expect(md).toContain('## What Was Checked');

      // Test saving to file
      const { reportPath, reportFileName } = saveReport(scanResults, tmpDir);
      expect(fs.existsSync(reportPath)).toBe(true);
      expect(reportFileName).toMatch(/^security-\d{4}-\d{2}-\d{2}\.md$/);
    });
  });
});
