import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findDeadCode } from '../src/core/clean/tier1-dead-code.js';
import { findBloat } from '../src/core/clean/tier2-bloat.js';
import { runClean } from '../src/core/clean/run-clean.js';
import {
  WEB_SLASH_COMMANDS,
  handleSlashCommand,
  isSlashCommand,
  getAvailableSlashCommands,
} from '../../web/src/lib/slashCommands.js';

import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Clean Mode — Dead Code + AI-Bloat Detection (Doc 55)', () => {
  it('tier 1: findDeadCode scans and returns structured findings', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'mcode-clean-test-'));
    try {
      await writeFile(join(tmp, 'package.json'), JSON.stringify({
        name: 'sample-project',
        dependencies: { 'unused-dep': '^1.0.0' }
      }));
      await writeFile(join(tmp, 'file1.js'), `
console.log('hello');
// const x = 10;
// const y = 20;
// return x + y;
`);
      await writeFile(join(tmp, 'file2.js'), `
console.log('hello');
// const x = 10;
// const y = 20;
// return x + y;
`);

      const findings = await findDeadCode(tmp);
      expect(Array.isArray(findings)).toBe(true);
      expect(findings.length).toBeGreaterThan(0);

      for (const f of findings) {
        expect(f).toHaveProperty('id');
        expect(f).toHaveProperty('category');
        expect(['unused-export', 'unused-dependency', 'duplicate-logic', 'dead-alternate']).toContain(f.category);
        expect(f).toHaveProperty('file');
        expect(f).toHaveProperty('issue');
        expect(f.costsAI).toBe(false);
      }
    } finally {
      await rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  }, 10000);

  it('tier 2: findBloat detects overengineered code and calculates line estimates', async () => {
    // Mock router with simulated AI response
    const mockRouter = {
      pick: vi.fn().mockResolvedValue({
        model: { id: 'test-model' },
        provider: {
          complete: vi.fn().mockResolvedValue({
            text: JSON.stringify([
              {
                startLine: 10,
                endLine: 80,
                issue: 'Overcomplicated factory pattern for simple string formatting',
                currentLines: 70,
                estimatedCleanLines: 8,
                category: 'bloat',
              }
            ])
          })
        }
      })
    };

    const dummyFiles = [import.meta.filename];
    const findings = await findBloat(dummyFiles, { router: mockRouter, thresholdLines: 10 });
    expect(findings.length).toBeGreaterThan(0);
    const item = findings[0];
    expect(item.category).toBe('bloat');
    expect(item.currentLines).toBe(70);
    expect(item.estimatedCleanLines).toBe(8);
  });

  it('runClean snapshots behavior, executes fixes, and checks equivalence', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'mcode-run-clean-test-'));
    try {
      await writeFile(join(tmp, 'package.json'), JSON.stringify({ name: 'clean-target' }));
      await writeFile(join(tmp, 'test.js'), 'function foo() { return 1; }');

      const mockBus = { emit: vi.fn() };
      const mockFindings = [
        {
          id: 'test-finding-1',
          category: 'bloat',
          file: 'test.js',
          issue: 'OrderProcessor 340 lines to 40 lines',
          currentLines: 340,
          estimatedCleanLines: 40,
        }
      ];

      const mockSubagentManager = {
        run: vi.fn().mockResolvedValue([]),
      };

      const mockTestRunner = vi.fn().mockResolvedValue({
        passed: true,
        total: 10,
        failed: 0,
        results: [],
      });

      const result = await runClean(tmp, {
        selectedFindings: mockFindings,
        subagentManager: mockSubagentManager,
        bus: mockBus,
        testRunner: mockTestRunner,
      });

      expect(result).toHaveProperty('equivalence');
      expect(result.equivalence.equivalent).toBe(true);
      expect(result.netLinesRemoved).toBe(300);
      expect(mockSubagentManager.run).toHaveBeenCalled();
    } finally {
      await rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('/clean command is registered in WEB_SLASH_COMMANDS with modes category', () => {
    const cleanCmd = WEB_SLASH_COMMANDS.find((c) => c.cmd === 'clean');
    expect(cleanCmd).toBeDefined();
    expect(cleanCmd.category).toBe('modes');
    expect(cleanCmd.icon).toBe('✂️');
  });

  it('handles /clean slash command in AI Code Assistant', () => {
    const dispatch = vi.fn();
    const runCleanMode = vi.fn();
    const socket = { send: vi.fn(), undo: vi.fn(), emit: vi.fn() };

    const handled = handleSlashCommand('/clean', dispatch, socket, {
      activeTab: 'AI Code Assistant',
      runCleanMode,
    });

    expect(handled).toBe(true);
    expect(runCleanMode).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalled();
  });
});
