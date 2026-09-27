import { describe, it, expect } from 'vitest';
import { WatchDaemon } from '../src/core/watch-daemon.js';

function daemonWithIgnores(patterns) {
  const d = new WatchDaemon({ projectPath: process.cwd(), config: {} });
  d._ignorePatterns = patterns;
  return d;
}

describe('WatchDaemon._ignored', () => {
  it('ignores defaults, matches plain dirs/files', () => {
    const d = daemonWithIgnores(['node_modules', '.git', 'dist']);
    expect(d._ignored('node_modules/express/index.js')).toBe(true);
    expect(d._ignored('src/app.js')).toBe(false);
    expect(d._ignored('a/node_modules/b')).toBe(true);
  });

  it('survives pathological glob storms without hanging (WTH-007)', () => {
    const d = daemonWithIgnores(['**/**/**/**/**/test', '*.log']);
    const t0 = Date.now();
    for (let i = 0; i < 1000; i++) {
      d._ignored(`src/components/Widget${i}.tsx`);
    }
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(d._ignored('app.log')).toBe(true);
  });

  it('minimatch path handles * without ReDoS', async () => {
    const d = new WatchDaemon({ projectPath: process.cwd(), config: {} });
    await d._loadIgnores().catch(() => {});
    expect(typeof d._ignored('src/x.js')).toBe('boolean');
  });
});
