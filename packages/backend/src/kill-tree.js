import { spawn } from 'node:child_process';

/** SOCK-042/1032: kill a child WITH its subtree. Plain SIGTERM leaves
 *  grandchildren alive on Windows (no POSIX signals) and orphans
 *  interpreter sub-threads elsewhere — taskkill /T /F handles Windows. */
export function killTree(child, signal = 'SIGTERM') {
  if (!child || child.killed || child.exitCode !== null) return;
  try {
    if (process.platform === 'win32' && child.pid) {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill(signal);
    }
  } catch {
    /* already gone */
  }
}
