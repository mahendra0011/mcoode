import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { runExplain, generateProjectTour } from '../src/core/explain/run-explain.js';
import { ToolExecutor, WRITE_TOOLS } from '../src/core/tools.js';

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

  it('generates a full onboarding walkthrough and saves project-tour.md', async () => {
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

    const tour = await generateProjectTour(process.cwd(), {
      router: mockRouter
    });

    expect(tour).toBe(mockTour);
    expect(existsSync(testReportPath)).toBe(true);
    const content = await readFile(testReportPath, 'utf8');
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
