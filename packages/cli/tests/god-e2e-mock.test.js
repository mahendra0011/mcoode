import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';

const home = await mkdtemp(join(tmpdir(), 'mcode-gode2e-home-'));
vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal();
  return { ...os, homedir: () => home };
});

const { MockProvider } = await import('../src/providers/mock.js');
const { SubagentManager } = await import('../src/core/subagent-manager.js');
const { CostLedger } = await import('@mcode/shared');

// DEBT-006: god-mode pipeline end-to-end with the mock provider —
// plan DAG → waves → files on disk → merged summary. No API keys needed.
describe('god pipeline E2E (mock provider)', () => {
  let projectPath;
  let mock;

  beforeAll(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'mcode-gode2e-proj-'));
    mock = new MockProvider();
  });

  afterAll(async () => {
    await rm(home, { recursive: true, force: true }).catch(() => {});
    await rm(projectPath, { recursive: true, force: true }).catch(() => {});
  });

  it('runs a 2-todo plan to completion and writes files', async () => {
    const fakeRouter = {
      reasoning: null,
      pick: async () => ({
        provider: mock,
        model: (await mock.listModels())[0],
        ref: 'mock:mock',
      }),
    };
    const plan = {
      summary: 'e2e test build',
      todos: [
        { id: 't1', title: 'Write readme', description: '', domain: 'docs', dependsOn: [], files: ['MOCK_readme.md'] },
        { id: 't2', title: 'Write notes', description: '', domain: 'docs', dependsOn: ['t1'], files: ['MOCK_notes.md'] },
      ],
    };
    const manager = new SubagentManager({
      plan,
      router: fakeRouter,
      projectPath,
      config: { concurrency: 2, maxTurnsPerSubagent: 6 },
      bus: new EventEmitter(),
      options: { ledger: new CostLedger(), skipIntegrationTests: true },
    });
    const merged = await manager.runAll();
    expect(merged.total).toBe(2);
    expect(merged.done).toBe(2);
    expect(merged.failed).toBe(0);
    const files = await readdir(projectPath);
    expect(files.some((f) => f.startsWith('MOCK_'))).toBe(true);
  }, 120000);
});
