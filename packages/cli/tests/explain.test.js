import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { runExplain, generateProjectTour } from '../src/core/explain/run-explain.js';
import { ToolExecutor, WRITE_TOOLS } from '../src/core/tools.js';

// Isolated temp dir — never touch the real repo cwd (racy under parallel load).
const testTmpDir = await mkdtemp(join(tmpdir(), 'mcode-explain-test-'));
afterEach(async () => {
  try {
    await rm(testTmpDir, { recursive: true, force: true });
    await import('node:fs/promises').then((fs) => fs.mkdir(testTmpDir, { recursive: true }));
  } catch {}
});

describe('Explain Mode (doc 50)', () => {
  const testReportPath = '.mcode/reports/project-tour.md';

  afterEach(async () => {
    try {
      if (existsSync(testReportPath)) {
        await rm(testReportPath, { force: true });
      }
    } catch {}
  });

  it('explains a specific file with conversational output', async () => {
    const mockAnswer = 'This file defines the package dependencies and project metadata.';
    const mockRouter = {
      pick: vi.fn().mockResolvedValue({
        model: { id: 'mock' },
        provider: {
          complete: vi.fn().mockResolvedValue({
            text: mockAnswer
          })
        }
      })
    };

    const explanation = await runExplain('what is this file', {
      projectPath: process.cwd(),
      targetFile: 'package.json',
      router: mockRouter
    });

    expect(mockRouter.pick).toHaveBeenCalledWith('general');
    expect(explanation).toBe(mockAnswer);
  });

  it('generates a full onboarding walkthrough and saves project-tour.md', { timeout: 30000 }, async () => {
    const mockTour = '# Project Onboarding Tour\n\nWelcome to the codebase...';
    const mockRouter = {
      pick: vi.fn().mockResolvedValue({
        model: { id: 'mock' },
        provider: {
          complete: vi.fn().mockResolvedValue({
            text: mockTour
          })
        }
      })
    };

    const tour = await generateProjectTour(testTmpDir, {
      router: mockRouter
    });

    expect(tour).toBe(mockTour);
    const tourPath = join(testTmpDir, '.mcode', 'reports', 'project-tour.md');
    expect(existsSync(tourPath)).toBe(true);
    const content = await readFile(tourPath, 'utf8');
    expect(content).toBe(mockTour);
  });

  it('enforces read-only mode by blocking WRITE_TOOLS in explain mode', async () => {
    const executor = new ToolExecutor({
      projectPath: process.cwd(),
      mode: 'explain'
    });

    expect(executor.readOnly).toBe(true);

    for (const toolName of WRITE_TOOLS) {
      const res = await executor.run(toolName, { path: 'test.js', content: 'hello' });
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/write tools are blocked/i);
    }
  });
});
