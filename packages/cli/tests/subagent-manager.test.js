import { describe, it, expect } from 'vitest';
import { FileLockManager } from '../src/core/subagent-manager.js';

describe('FileLockManager', () => {
  it('constructs with empty state', () => {
    const mgr = new FileLockManager();
    expect(mgr.lockedFiles()).toEqual([]);
    expect(mgr.isLocked('/test.js')).toBeFalsy();
  });

  it('acquires a lock on first request', async () => {
    const mgr = new FileLockManager();
    const release = await mgr.acquireLock('agent-1', '/src/index.ts');
    expect(mgr.isLocked('/src/index.ts')).toBeTruthy();
    expect(mgr.lockedFiles()).toHaveLength(1);
    expect(mgr.lockedFiles()[0]).toEqual({ path: '/src/index.ts', owner: 'agent-1' });
    release();
  });

  it('releases a lock correctly', async () => {
    const mgr = new FileLockManager();
    const release = await mgr.acquireLock('agent-1', '/src/index.ts');
    release();
    expect(mgr.isLocked('/src/index.ts')).toBeFalsy();
    expect(mgr.lockedFiles()).toEqual([]);
  });

  it('queues second agent (FIFO) and resolves when first releases', async () => {
    const mgr = new FileLockManager();
    const release1 = await mgr.acquireLock('agent-1', '/shared.ts');

    // Second agent tries to acquire — should be queued
    let release2Resolved = false;
    const p2 = mgr.acquireLock('agent-2', '/shared.ts').then((release) => {
      release2Resolved = true;
      return release;
    });

    // Not yet resolved
    await new Promise((r) => setTimeout(r, 10));
    expect(release2Resolved).toBe(false);

    // Release first lock — second should resolve
    release1();
    const release2 = await p2;
    expect(release2Resolved).toBe(true);
    expect(mgr.isLocked('/shared.ts')).toBeTruthy();

    release2();
    expect(mgr.isLocked('/shared.ts')).toBeFalsy();
  });

  it('times out when lock is not released', async () => {
    const mgr = new FileLockManager();
    await mgr.acquireLock('agent-1', '/blocked.ts');

    // Second agent with short timeout
    await expect(
      mgr.acquireLock('agent-2', '/blocked.ts', 50)
    ).rejects.toThrow('lock timeout');
  });

  it('releases all locks for an agent', async () => {
    const mgr = new FileLockManager();
    await mgr.acquireLock('agent-1', '/a.ts');
    await mgr.acquireLock('agent-1', '/b.ts');
    await mgr.acquireLock('agent-1', '/c.ts');
    expect(mgr.lockedFiles()).toHaveLength(3);

    mgr.releaseAllFor('agent-1');
    expect(mgr.lockedFiles()).toEqual([]);
  });

  it('releaseLock returns false for non-owner', async () => {
    const mgr = new FileLockManager();
    await mgr.acquireLock('agent-1', '/test.ts');
    expect(mgr.releaseLock('agent-2', '/test.ts')).toBe(false);
    expect(mgr.isLocked('/test.ts')).toBeTruthy(); // still locked by agent-1
  });

  it('releaseLock returns false for unlocked files', () => {
    const mgr = new FileLockManager();
    expect(mgr.releaseLock('agent-1', '/nonexistent.ts')).toBe(false);
  });

  it('handles multiple files per agent independently', async () => {
    const mgr = new FileLockManager();
    const r1 = await mgr.acquireLock('agent-1', '/a.ts');
    const r2 = await mgr.acquireLock('agent-1', '/b.ts');

    r1(); // release /a.ts only
    expect(mgr.isLocked('/a.ts')).toBeFalsy();
    expect(mgr.isLocked('/b.ts')).toBeTruthy();

    r2();
    expect(mgr.isLocked('/b.ts')).toBeFalsy();
  });

  it('FIFO order: third agent gets lock after second', async () => {
    const mgr = new FileLockManager();
    const release1 = await mgr.acquireLock('agent-1', '/fifo.ts');

    const order = [];
    const p2 = mgr.acquireLock('agent-2', '/fifo.ts').then((r) => { order.push(2); return r; });
    const p3 = mgr.acquireLock('agent-3', '/fifo.ts').then((r) => { order.push(3); return r; });

    release1();
    const release2 = await p2;
    release2();
    const release3 = await p3;
    release3();

    expect(order).toEqual([2, 3]); // FIFO
  });
});
