import { join, resolve, relative } from 'node:path';
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { execa } from 'execa';
import { EVENTS } from '@mcode/shared';

/**
 * Scoped toolset handed to subagents. Writes go through a snapshot +
 * diff-preview layer so `/undo` can revert any todo's changes.
 */
export class ToolExecutor {
  constructor({ projectPath, bus = null, undoStack = null, allowShellAll = false, domain = 'backend', todoId = null }) {
    this.projectPath = resolve(projectPath);
    this.bus = bus;
    this.undoStack = undoStack;
    this.allowShellAll = allowShellAll;
    this.domain = domain;
    this.todoId = todoId;
  }

  tools() {
    const t = {
      read_file: { description: 'Read a file from the project', parameters: { path: 'string' } },
      list_files: { description: 'List files matching a glob', parameters: { glob: 'string' } },
      search_code: { description: 'Search the codebase for text', parameters: { query: 'string' } },
      write_file: { description: 'Write a file (creates parent dirs)', parameters: { path: 'string', content: 'string' } },
      git_status: { description: 'Show current git status / diff summary', parameters: {} },
      run_tests: { description: 'Run the project test suite (or one file)', parameters: { file: 'string' } }
    };
    if (this.domain !== 'docs') {
      t.run_shell = { description: 'Run a shell command inside the project (npm install, build, etc.)', parameters: { command: 'string' } };
    }
    return t;
  }

  _abs(path) {
    const full = resolve(this.projectPath, path);
    if (full !== this.projectPath && !full.startsWith(this.projectPath + '\\') && !full.startsWith(this.projectPath + '/')) {
      throw new Error(`path escapes project root: ${path}`);
    }
    return full;
  }

  async run(name, args) {
    const start = Date.now();
    this.bus?.emit('SUBAGENT_TOOL_CALL', { tool: name, args: JSON.stringify(args).slice(0, 200) });
    let result;
    try {
      result = await this[name](args || {});
    } catch (err) {
      result = { ok: false, error: err.message };
    }
    this.bus?.emit('SUBAGENT_TOOL_RESULT', { tool: name, ms: Date.now() - start, truncated: String(result).slice(0, 300) });
    return result;
  }

  async read_file({ path }) {
    const full = this._abs(path);
    const content = await readFile(full, 'utf8');
    return { ok: true, content };
  }

  async list_files({ glob = '**/*' }) {
    const files = [];
    const walk = async (dir) => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else {
          const rel = relative(this.projectPath, full);
          if (rel.match(glob.replaceAll('**', '.*'))) files.push(rel);
        }
      }
    };
    await walk(this.projectPath);
    return { ok: true, files: files.slice(0, 500) };
  }

  async search_code({ query }) {
    try {
      const { stdout } = await execa('rg', ['-l', '--no-messages', query, this.projectPath]);
      const files = stdout.split('\n').filter(Boolean).slice(0, 50);
      return { ok: true, files };
    } catch {
      return { ok: true, files: [] };
    }
  }

  async write_file({ path, content }) {
    const full = this._abs(path);
    await mkdir(join(full, '..'), { recursive: true });
    const prev = await readFile(full, 'utf8').catch(() => null);
    await this.undoStack?.snapshot(path, prev);
    await writeFile(full, content, 'utf8');
    const created = prev === null;
    const diff = created ? null : lineDiff(prev || '', content);
    this.bus?.emit(EVENTS.SUBAGENT_FILE, {
      todoId: this.todoId || null,
      file: path,
      content,
      diff: diff || diffText(prev || '', content),
      language: path.split('.').pop() || 'txt',
      timestamp: Date.now()
    });
    return { ok: true, file: path, created, diff, diffLines: diff?.lines || [], content };
  }

  async git_status() {
    const git = (await import('simple-git')).default(this.projectPath);
    const status = await git.status();
    return { ok: true, files: status.files.map((f) => `${f.index} ${f.path}`), branch: status.current };
  }

  async run_shell({ command }) {
    if (!this.allowShellAll && /(rm\s+-rf|del\s+\/|format\s+\w:|:\(\)\s*\{|mkfs)/i.test(command)) {
      return { ok: false, error: 'destructive command blocked by sandbox (use --allow-shell-all to bypass)' };
    }
    const { stdout, stderr } = await execa(command, {
      cwd: this.projectPath,
      shell: true,
      timeout: 120_000,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    return { ok: true, stdout: stdout.slice(0, 4000), stderr: stderr.slice(0, 2000) };
  }

  async run_tests({ file = '' }) {
    try {
      const args = ['test', '--', ...(file ? [file] : [])];
      const { stdout, stderr } = await execa('npm', args, {
        cwd: this.projectPath,
        timeout: 180_000,
        env: { ...process.env, FORCE_COLOR: '0' },
        reject: false
      });
      const passed = !/FAIL|failed/i.test(stdout + stderr);
      return { ok: true, passed, output: (stdout + stderr).slice(-1500) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

export function diffText(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let j = 0;
  while (a.length - 1 - j >= i && b.length - 1 - j >= i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  const changed = Math.max(0, a.length - i - j) + Math.max(0, b.length - i - j);
  return { changedLines: changed, sample: `...\n${b.slice(i, i + 6).join('\n')}\n...` };
}

/**
 * Line-level diff with old/new line numbers for the Edit block's dual gutter.
 * Returns { changedLines, lines: [{kind: 'context'|'remove'|'add', oldNo, newNo, text}] }.
 */
export function lineDiff(before, after) {
  const a = String(before || '').split('\n');
  const b = String(after || '').split('\n');
  const m = a.length;
  const n = b.length;
  const emit = (kind, oldNo, newNo, text) => {
    lines.push({ kind, oldNo, newNo, text });
    return kind === 'context' ? 0 : 1;
  };
  const lines = [];
  let changed = 0;
  if (m * n > 4_000_000) {
    for (let i = 0; i < m; i++) changed += emit('remove', i + 1, null, a[i]);
    for (let j = 0; j < n; j++) changed += emit('add', null, j + 1, b[j]);
    return { changedLines: changed, lines };
  }
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  let oldNo = 1;
  let newNo = 1;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      changed += emit('context', oldNo, newNo, a[i]);
      i++; j++; oldNo++; newNo++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      changed += emit('remove', oldNo, null, a[i]);
      i++; oldNo++;
    } else {
      changed += emit('add', null, newNo, b[j]);
      j++; newNo++;
    }
  }
  while (i < m) { changed += emit('remove', oldNo, null, a[i]); i++; oldNo++; }
  while (j < n) { changed += emit('add', null, newNo, b[j]); j++; newNo++; }
  return { changedLines: changed, lines };
}

/** Per-project undo stack: snapshots of every file before a subagent writes. */
export class UndoStack {
  constructor({ filePath, maxEntries = 200 } = {}) {
    this.filePath = filePath;
    this.maxEntries = maxEntries;
    this.entries = [];
  }

  async snapshot(relPath, prevContent) {
    this.entries.push({ at: new Date().toISOString(), file: relPath, prev: prevContent });
    if (this.entries.length > this.maxEntries) this.entries.shift();
    if (this.filePath) {
      try {
        await writeFile(this.filePath, JSON.stringify(this.entries), 'utf8');
      } catch {
        /* best-effort persistence */
      }
    }
  }

  async load() {
    if (this.entries.length) return;
    try {
      const raw = await readFile(this.filePath, 'utf8').catch(() => null);
      if (raw) this.entries = JSON.parse(raw);
    } catch {
      this.entries = [];
    }
  }

  /** Revert the most recent write. Returns the reverted file or null. */
  async undo() {
    await this.load();
    const last = this.entries.pop();
    if (!last) return null;
    const full = resolve(process.cwd(), last.file);
    if (last.prev === null) {
      await rm(full, { force: true });
    } else {
      await writeFile(full, last.prev, 'utf8');
    }
    if (this.filePath) {
      await writeFile(this.filePath, JSON.stringify(this.entries), 'utf8').catch(() => {});
    }
    return last.file;
  }

  pending() {
    return this.entries.length;
  }
}
