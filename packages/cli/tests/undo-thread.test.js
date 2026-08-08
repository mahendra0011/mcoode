/**
 * Integration test: undoId threading (Bug #18) and undo-by-id (Bug #25).
 *
 * Verifies the full chain:
 *   write_file → returns undoId
 *   edit_file  → returns undoId
 *   read_file  → does NOT include undoId (Bug #26)
 *   ChatAgent._blockMeta → includes undoId for write/edit blocks
 *   UndoStack.undo(id) → reverts the specific snapshot
 *   UndoStack.undo()  → LIFO fallback
 *   Orchestrator.undo(id) → passes id through to UndoStack
 */
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToolExecutor, UndoStack, lineDiff } from '../src/core/tools.js';
import { ChatAgent } from '../src/core/chat-agent.js';
import { EventEmitter } from 'node:events';

describe('undoId threading (Bug #18, #25, #26)', () => {
  let tmp;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'mcode-undo-test-'));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('write_file returns an undoId and edit_file returns a different undoId', async () => {
    const undoStack = new UndoStack({ projectPath: tmp });
    const executor = new ToolExecutor({ projectPath: tmp, domain: 'backend', undoStack });
    await writeFile(join(tmp, 'test.txt'), 'hello\n', 'utf8');

    const w1 = await executor.write_file({ path: 'test.txt', content: 'hello world\n' });
    expect(w1.ok).toBe(true);
    expect(w1.undoId).toBeTruthy();

    const w2 = await executor.write_file({ path: 'test.txt', content: 'hello world!!\n' });
    expect(w2.ok).toBe(true);
    expect(w2.undoId).toBeTruthy();
    expect(w2.undoId).not.toBe(w1.undoId);
  });

  it('edit_file returns an undoId', async () => {
    const undoStack = new UndoStack({ projectPath: tmp });
    const executor = new ToolExecutor({ projectPath: tmp, domain: 'backend', undoStack });
    await writeFile(join(tmp, 'test.txt'), 'hello\nworld\n', 'utf8');

    const result = await executor.edit_file({ path: 'test.txt', old: 'hello', new: 'goodbye' });
    expect(result.ok).toBe(true);
    expect(result.undoId).toBeTruthy();
  });

  it('read_file does NOT return an undoId (Bug #26 verification)', async () => {
    const executor = new ToolExecutor({ projectPath: tmp, domain: 'backend' });
    await writeFile(join(tmp, 'test.txt'), 'content\n', 'utf8');

    const result = await executor.read_file({ path: 'test.txt' });
    expect(result.ok).toBe(true);
    expect(result.undoId).toBeUndefined();
  });

  it('UndoStack.undo(id) reverts the specific snapshot and returns the file', async () => {
    const undoStack = new UndoStack({ projectPath: tmp });
    await writeFile(join(tmp, 'test.txt'), 'original\n', 'utf8');

    const id1 = await undoStack.snapshot('test.txt', 'original\n');
    await writeFile(join(tmp, 'test.txt'), 'modified1\n', 'utf8');

    const id2 = await undoStack.snapshot('test.txt', 'modified1\n');
    await writeFile(join(tmp, 'test.txt'), 'modified2\n', 'utf8');

    // Undo the first snapshot specifically
    const reverted = await undoStack.undo(id1);
    expect(reverted).toBe('test.txt');
    const content = await readFile(join(tmp, 'test.txt'), 'utf8');
    expect(content).toBe('original\n');

    // Undo the second snapshot (LIFO since we removed id1 first)
    const reverted2 = await undoStack.undo(id2);
    expect(reverted2).toBe('test.txt');
  });

  it('UndoStack.undo() with no id falls back to LIFO (most recent)', async () => {
    const undoStack = new UndoStack({ projectPath: tmp });
    await writeFile(join(tmp, 'a.txt'), 'v1\n', 'utf8');
    await undoStack.snapshot('a.txt', 'v1\n');
    await writeFile(join(tmp, 'a.txt'), 'v2\n', 'utf8');
    await undoStack.snapshot('a.txt', 'v2\n');
    await writeFile(join(tmp, 'a.txt'), 'v3\n', 'utf8');

    const reverted = await undoStack.undo();
    expect(reverted).toBe('a.txt');
    const content = await readFile(join(tmp, 'a.txt'), 'utf8');
    expect(content).toBe('v2\n');
  });

  it('UndoStack.undo(unknownId) falls back to LIFO', async () => {
    const undoStack = new UndoStack({ projectPath: tmp });
    await writeFile(join(tmp, 'a.txt'), 'v1\n', 'utf8');
    await undoStack.snapshot('a.txt', 'v1\n');
    await writeFile(join(tmp, 'a.txt'), 'v2\n', 'utf8');

    const reverted = await undoStack.undo('nonexistent-id');
    expect(reverted).toBe('a.txt');
  });

  it('Orchestrator.undo(id) accepts and passes id parameter', async () => {
    // Dynamically import Orchestrator
    const { Orchestrator } = await import('../src/core/orchestrator.js');
    const orch = new Orchestrator({ projectPath: tmp, config: { modelOverride: null } });
    orch.undoStack = new UndoStack({ projectPath: tmp });
    await writeFile(join(tmp, 'test.txt'), 'original\n', 'utf8');
    const id = await orch.undoStack.snapshot('test.txt', 'original\n');
    await writeFile(join(tmp, 'test.txt'), 'changed\n', 'utf8');

    const reverted = await orch.undo(id);
    expect(reverted).toBe('test.txt');
    const content = await readFile(join(tmp, 'test.txt'), 'utf8');
    expect(content).toBe('original\n');
  });

  it('ChatAgent._blockMeta includes undoId for write_file blocks', async () => {
    const bus = new EventEmitter();
    const undoStack = new UndoStack({ projectPath: tmp });
    const agent = new ChatAgent({
      assignment: { provider: { complete: () => ({ text: 'ok' }) }, model: { id: 'test' } },
      projectPath: tmp,
      bus,
      undoStack,
      config: { domain: 'backend' }
    });

    const fakeResult = { ok: true, file: 'test.txt', created: false, content: 'new content', undoId: 'abc123', diffLines: [] };
    const meta = agent._blockMeta('write_file', { path: 'test.txt' }, fakeResult);
    expect(meta.undoId).toBe('abc123');
  });

  it('ChatAgent._blockMeta does NOT include undoId for read_file blocks (Bug #26)', async () => {
    const bus = new EventEmitter();
    const undoStack = new UndoStack({ projectPath: tmp });
    const agent = new ChatAgent({
      assignment: { provider: { complete: () => ({ text: 'ok' }) }, model: { id: 'test' } },
      projectPath: tmp,
      bus,
      undoStack,
      config: { domain: 'backend' }
    });

    const fakeResult = { ok: true, content: 'file content here' };
    const meta = agent._blockMeta('read_file', { path: 'test.txt' }, fakeResult);
    expect(meta.undoId).toBeUndefined();
  });

  it('ChatAgent._blockMeta includes undoId for edit_file blocks', async () => {
    const bus = new EventEmitter();
    const undoStack = new UndoStack({ projectPath: tmp });
    const agent = new ChatAgent({
      assignment: { provider: { complete: () => ({ text: 'ok' }) }, model: { id: 'test' } },
      projectPath: tmp,
      bus,
      undoStack,
      config: { domain: 'backend' }
    });

    const fakeResult = { ok: true, file: 'test.txt', content: 'new content', undoId: 'xyz789', diffLines: [] };
    const meta = agent._blockMeta('edit_file', { path: 'test.txt', old: 'a', new: 'b' }, fakeResult);
    expect(meta.undoId).toBe('xyz789');
  });
});
