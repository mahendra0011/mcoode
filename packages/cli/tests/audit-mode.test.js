import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  runAudit,
  scoreToGrade,
  averageGrade,
  runPerformanceScan,
  runA11yScan,
  runDependencyHealthScan,
  runQualityScan,
  generateAuditPDF,
  generateMarkdownReport
} from '../src/core/audit/index.js';

describe('Audit Mode (Doc 52)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcode-audit-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('scoreToGrade & averageGrade', () => {
    it('computes grades based on critical, high, medium, low counts', () => {
      expect(scoreToGrade({ counts: { critical: 0, high: 0, medium: 0, low: 0 } })).toBe('A');
      // 1 medium = penalty 3 => score 97 => A
      expect(scoreToGrade({ counts: { medium: 1 } })).toBe('A');
      // 1 high (10) + 1 medium (3) = penalty 13 => score 87 => B+
      expect(scoreToGrade({ counts: { high: 1, medium: 1 } })).toBe('B+');
      // 1 critical (25) + 1 low (1) = penalty 26 => score 74 => C
      expect(scoreToGrade({ counts: { critical: 1, low: 1 } })).toBe('C');
      // 1 critical (25) + 1 high (10) + 1 medium (3) = penalty 38 => score 62 => D
      expect(scoreToGrade({ counts: { critical: 1, high: 1, medium: 1 } })).toBe('D');
      // 2 critical (50) = penalty 50 => score 50 => F
      expect(scoreToGrade({ counts: { critical: 2 } })).toBe('F');
    });

    it('averages letter grades correctly', () => {
      expect(averageGrade({ security: 'A', performance: 'A' })).toBe('A');
      expect(averageGrade({ security: 'A', performance: 'C' })).toBe('B');
      expect(averageGrade({ a: 'F', b: 'F' })).toBe('F');
      expect(averageGrade({})).toBe('A');
    });
  });

  describe('Performance Scan (Doc 52 — zero AI calls)', () => {
    it('detects N+1 query patterns and unoptimized images without AI', async () => {
      // Create a mock repo with an N+1 query and a large image
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // N+1 pattern: loop/map with a query inside
      const fileWithN1 = `
        async function loadUsers(ids) {
          return users.map(async (u) => {
            const profile = await db.userProfiles.findOne({ userId: u.id });
            return { ...u, profile };
          });
        }
      `;
      fs.writeFileSync(path.join(srcDir, 'users.js'), fileWithN1);

      // Create an unoptimized bitmap/oversized image
      const assetsDir = path.join(tmpDir, 'public');
      fs.mkdirSync(assetsDir, { recursive: true });
      // Create a dummy image file of ~1.2MB
      const largeBuf = Buffer.alloc(1.2 * 1024 * 1024);
      fs.writeFileSync(path.join(assetsDir, 'hero.png'), largeBuf);

      const result = await runPerformanceScan(tmpDir);

      expect(result).toBeDefined();
      expect(Array.isArray(result.findings)).toBe(true);
      expect(result.counts).toBeDefined();

      const n1Finding = result.findings.find(f => f.category === 'n1-query');
      expect(n1Finding).toBeDefined();
      expect(n1Finding.msg).toContain('N+1 query pattern');

      const imgFinding = result.findings.find(f => f.category === 'unoptimized-image');
      expect(imgFinding).toBeDefined();
      expect(imgFinding.file).toContain('hero.png');
    });

    it('detects missing indexes in schema files', async () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const schemaFile = `
        const OrderSchema = new Schema({
          userId: { type: String, required: true },
          tenantId: { type: String, required: true },
          status: { type: String }
        });
      `;
      fs.writeFileSync(path.join(srcDir, 'schema.js'), schemaFile);

      const result = await runPerformanceScan(tmpDir);
      const indexFinding = result.findings.find(f => f.category === 'missing-index');
      expect(indexFinding).toBeDefined();
      expect(indexFinding.msg).toContain('indexed');
    });
  });

  describe('Accessibility Scan (a11y)', () => {
    it('detects missing alt attributes and unlabelled buttons', async () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const jsxFile = `
        export function Header() {
          return (
            <header>
              <img src="/logo.png" />
              <button></button>
              <a href="#"></a>
            </header>
          );
        }
      `;
      fs.writeFileSync(path.join(srcDir, 'Header.jsx'), jsxFile);

      const result = await runA11yScan(tmpDir);
      expect(result.findings.length).toBeGreaterThan(0);
      const altFinding = result.findings.find(f => f.msg.includes('alt attribute'));
      expect(altFinding).toBeDefined();
      const btnFinding = result.findings.find(f => f.msg.includes('empty or unlabelled'));
      expect(btnFinding).toBeDefined();
    });
  });

  describe('Dependencies Scan', () => {
    it('flags deprecated packages in package.json', async () => {
      const pkgJson = {
        name: 'test-app',
        dependencies: {
          request: '^2.88.2',
          moment: '^2.29.4'
        }
      };
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

      const result = await runDependencyHealthScan(tmpDir);
      expect(result.findings.length).toBeGreaterThan(0);
      const depFinding = result.findings.find(f => f.package === 'request');
      expect(depFinding).toBeDefined();
      expect(depFinding.msg).toContain('deprecated');
    });
  });

  describe('Code Quality Scan', () => {
    it('detects static code smells like empty catch blocks and debugger statements', async () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const dirtyCode = `
        function doWork() {
          debugger;
          try {
            eval('2 + 2');
          } catch (e) {
          }
        }
      `;
      fs.writeFileSync(path.join(srcDir, 'dirty.js'), dirtyCode);

      const result = await runQualityScan(tmpDir);
      expect(result.findings.length).toBeGreaterThan(0);
      const dbgFinding = result.findings.find(f => f.msg.includes('debugger statement'));
      expect(dbgFinding).toBeDefined();
      const catchFinding = result.findings.find(f => f.msg.includes('Empty catch block'));
      expect(catchFinding).toBeDefined();
    });
  });

  describe('Full runAudit()', () => {
    it('runs across all 5 categories and aggregates grades', async () => {
      // Basic package.json
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'audit-test' }));

      const audit = await runAudit(tmpDir);

      expect(audit.results).toBeDefined();
      expect(audit.grades).toBeDefined();
      expect(audit.overallGrade).toBeDefined();

      // Check all 5 categories present by default
      expect(audit.results.security).toBeDefined();
      expect(audit.results.performance).toBeDefined();
      expect(audit.results.accessibility).toBeDefined();
      expect(audit.results.dependencies).toBeDefined();
      expect(audit.results.quality).toBeDefined();

      expect(audit.grades.security).toBeDefined();
      expect(audit.grades.performance).toBeDefined();
      expect(audit.grades.accessibility).toBeDefined();
      expect(audit.grades.dependencies).toBeDefined();
      expect(audit.grades.quality).toBeDefined();
    });

    it('supports scoped single-category audit', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'audit-test' }));

      const audit = await runAudit(tmpDir, { categories: ['performance'] });
      expect(audit.results.performance).toBeDefined();
      expect(audit.results.security).toBeUndefined();
      expect(audit.grades.performance).toBeDefined();
      expect(audit.overallGrade).toBe(audit.grades.performance);
    });
  });

  describe('PDF Report & Markdown Report generation', () => {
    it('generates a valid markdown report with read-only disclaimer', () => {
      const mockResult = {
        results: {
          security: { counts: { high: 2, medium: 4 }, findings: [{ severity: 'high', msg: 'Missing Helmet' }] },
          performance: { counts: { medium: 1 }, findings: [{ severity: 'medium', msg: 'Large bundle' }] },
          accessibility: { counts: { low: 1 }, findings: [] },
          dependencies: { counts: { low: 0 }, findings: [] },
          quality: { counts: { low: 2 }, findings: [] }
        },
        grades: {
          security: 'B',
          performance: 'A',
          accessibility: 'A',
          dependencies: 'A',
          quality: 'A'
        },
        overallGrade: 'B'
      };

      const md = generateMarkdownReport(mockResult);
      expect(md).toContain('# MCODE AUDIT REPORT');
      expect(md).toContain('Overall Grade: B');
      expect(md).toContain('zero code changes');
      expect(md).toContain('mcode security-check');
      expect(md).toContain('SECURITY Findings (Grade: B)');
    });

    it('generates a PDF file via generateAuditPDF', async () => {
      const mockResult = {
        results: {
          security: { counts: { high: 1 }, findings: [{ severity: 'high', msg: 'Missing Helmet' }] },
          performance: { counts: { medium: 1 }, findings: [{ severity: 'medium', msg: 'Large bundle' }] },
          accessibility: { counts: {}, findings: [] },
          dependencies: { counts: {}, findings: [] },
          quality: { counts: {}, findings: [] }
        },
        grades: {
          security: 'B',
          performance: 'A',
          accessibility: 'A',
          dependencies: 'A',
          quality: 'A'
        },
        overallGrade: 'A'
      };

      const pdfPath = path.join(tmpDir, 'audit-report.pdf');
      await generateAuditPDF(mockResult, pdfPath);

      expect(fs.existsSync(pdfPath)).toBe(true);
      const stat = fs.statSync(pdfPath);
      expect(stat.size).toBeGreaterThan(500); // Valid non-empty PDF
    });
  });
});
