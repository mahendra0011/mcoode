import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { evaluateInDebugger } from '../src/debug-eval.js';

describe('debug:evaluate via CDP (live debuggee)', () => {
  it('evaluates an expression in a real --inspect target', async () => {
    const port = 19329 + Math.floor(Math.random() * 500);
    const child = spawn(process.execPath, [`--inspect=${port}`, '-e', 'const answer = 41 + 1; setInterval(() => {}, 1000);'], {
      stdio: 'ignore',
    });
    try {
      let result = null;
      for (let i = 0; i < 50 && !result; i++) {
        await new Promise((r) => setTimeout(r, 200));
        try {
          result = await evaluateInDebugger(port, 'answer + 1', { timeoutMs: 3000 });
        } catch {}
      }
      expect(result?.result?.value).toBe(43);
    } finally {
      child.kill('SIGTERM');
    }
  }, 30000);
});
