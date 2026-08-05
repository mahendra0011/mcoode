import { EventEmitter } from 'node:events';
import chokidar from 'chokidar';
import { join, relative, extname, dirname, basename } from 'node:path';
import { readFile, writeFile, mkdir, stat as fsStat, rm } from 'node:fs/promises';
import { execa } from 'execa';
import { EVENTS, WATCH_OUTCOMES } from '@mcode/shared';
import { extractImports } from './git.js';
import { getProjectId } from './store.js';
import { homedir } from 'node:os';

const IGNORE_DEFAULTS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.mcodeignore', '*.lock', '.mcode-fix-*'];

export class WatchDaemon extends EventEmitter {
  constructor({ projectPath, config = {}, bus = null, router = null, undoStack = null, projectId = null }) {
    super();
    this.projectPath = projectPath;
    this.config = {
      scanIntervalMs: 30_000,
      debounceMs: 400,
      maxFixesPerHour: 60,
      autoCommit: false,
      maxAttemptsPerFix: 3,
      ...config
    };
    this.bus = bus;
    this.router = router;
    this.undoStack = undoStack;
    this.projectId = projectId || null;
    this.running = false;
    this.startedAt = null;
    this.scansRun = 0;
    this.fixesApplied = 0;
    this.filesScanned = 0;
    this.fixTimestamps = [];
    this.activity = [];
    this.watcher = null;
    this._ignorePatterns = [];
    this._queue = new Set();
    this._processing = false;
    this._stopRequested = false;
  }

  get status() {
    return this.running ? 'active' : 'stopped';
  }

  async _loadIgnores() {
    const patterns = [...IGNORE_DEFAULTS];
    try {
      const mcodeignore = await readFile(join(this.projectPath, '.mcodeignore'), 'utf8');
      patterns.push(...mcodeignore.split('\n').map((l) => l.trim()).filter(Boolean));
    } catch {
      /* optional */
    }
    try {
      const gitignore = await readFile(join(this.projectPath, '.gitignore'), 'utf8');
      patterns.push(...gitignore.split('\n').map((l) => l.trim()).filter(Boolean).filter((l) => !l.startsWith('#')));
    } catch {
      /* optional */
    }
    this._ignorePatterns = patterns;
  }

  _ignored(rel) {
    const normalized = rel.replace(/\\/g, '/');
    return this._ignorePatterns.some((p) => {
      if (!p) return false;
      const norm = p.replace(/\\/g, '/');
      if (norm.includes('*')) {
        const re = new RegExp(`^${norm.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}($|/)`);
        return re.test(normalized);
      }
      return normalized === norm || normalized.startsWith(`${norm}/`) || normalized.includes(`/${norm}/`);
    });
  }

  _pushActivity(entry) {
    this.activity.unshift({ timestamp: new Date().toISOString(), ...entry });
    this.activity = this.activity.slice(0, 200);
  }

  async start() {
    if (this.running) return;
    this.running = true;
    this._stopRequested = false;
    this.startedAt = new Date();
    await this._loadIgnores();
    if (!this.projectId) this.projectId = await getProjectId(this.projectPath);
    this.undoStack.filePath = join(homedir(), '.mcode', 'projects', this.projectId, 'undo-watch.json');
    await mkdir(dirname(this.undoStack.filePath), { recursive: true });

    this.emitStatus();

    // A. event-driven detection (debounced)
    this.watcher = chokidar.watch(this.projectPath, {
      ignored: (p) => {
        const rel = relative(this.projectPath, p);
        return this._ignored(rel) || basename(p) === '.mcodeignore';
      },
      ignoreInitial: true,
      persistent: true
    });
    const queueChange = (p) => {
      const rel = relative(this.projectPath, p);
      if (this._ignored(rel)) return;
      this._queue.add(rel);
      setTimeout(() => this._drainQueue(), this.config.debounceMs);
    };
    this.watcher.on('add', queueChange);
    this.watcher.on('change', queueChange);
    this.watcher.on('unlink', queueChange);

    // B. interval full-repo scan loop — "baar baar code padhega, ek ek file, ek ek line"
    this.scanTimer = setInterval(() => this.scanOnce(), this.config.scanIntervalMs);
    // run an initial scan shortly after start
    setTimeout(() => this.scanOnce(), 1500);

    this.bus?.emit(EVENTS.WATCH_STATUS, 'active');
    return this;
  }

  async scanOnce() {
    if (!this.running || this._stopRequested) return;
    const t0 = Date.now();
    let count = 0;
    try {
      const { walkTree } = await import('./git.js');
      const files = await walkTree(this.projectPath, {
        ignore: this._ignorePatterns.map((p) => p.replace(/\\/g, '/'))
      });
      count = files.length;
      this.filesScanned += count;
      this.scansRun++;
      this.bus?.emit(EVENTS.WATCH_SCAN, {
        projectId: this.projectId,
        filesScanned: count,
        timestamp: new Date().toISOString()
      });
      this._pushActivity({ file: '(scan)', outcome: 'no-issues', detail: `scanned ${count} files in ${Date.now() - t0}ms` });
    } catch (err) {
      this._pushActivity({ file: '(scan)', outcome: 'needs-review', detail: `scan error: ${err.message}` });
    }
    this.emitStatus();
  }

  async _drainQueue() {
    if (this._processing) return;
    this._processing = true;
    const pending = [...this._queue];
    this._queue.clear();
    for (const rel of pending) {
      if (!this.running || this._stopRequested) break;
      try {
        await this.analyzeFile(rel);
      } catch (err) {
        this._pushActivity({ file: rel, outcome: 'needs-review', detail: `analysis error: ${err.message}` });
      }
    }
    this._processing = false;
    if (this._queue.size > 0) await this._drainQueue();
  }

  async analyzeFile(rel) {
    const full = join(this.projectPath, rel);
    const stat = await fsStat(full).catch(() => null);
    if (!stat) {
      this.bus?.emit(EVENTS.WATCH_CHANGE, { projectId: this.projectId, file: rel, action: 'unlink' });
      this._pushActivity({ file: rel, outcome: 'no-issues', detail: 'removed' });
      return;
    }
    this.bus?.emit(EVENTS.WATCH_CHANGE, { projectId: this.projectId, file: rel, action: 'change' });

    // 1. local lint pass — zero model cost
    const lint = await this._lintFile(full);
    if (!lint.ok) {
      await this._applyFix(rel, lint);
      return;
    }

    // 2. static checks — unresolved imports
    const staticIssues = await this._staticCheck(full);
    if (staticIssues.length > 0) {
      await this._applyFix(rel, staticIssues.join('\n'));
      return;
    }

    // 3. test impact
    const testResult = await this._runRelatedTests(rel);
    if (!testResult.passed) {
      await this._applyFix(rel, `failing tests:\n${testResult.output}`);
      return;
    }

    this._pushActivity({ file: rel, outcome: 'no-issues', detail: 'lint ✓ imports ✓ tests ✓' });
  }

  async _lintFile(full) {
    try {
      const { stdout } = await execa('npx', ['--no-install', 'eslint', full, '--fix-dry-run', '--format', 'json'], {
        cwd: this.projectPath,
        timeout: 30_000,
        reject: false
      });
      const reports = JSON.parse(stdout || '[]');
      const errors = reports.flatMap((r) => (r.messages || []).filter((m) => m.severity === 2));
      if (errors.length === 0) return { ok: true };
      return { ok: false, detail: errors.map((e) => `${e.line}:${e.column} ${e.message}`).slice(0, 6).join('\n') };
    } catch {
      // no local eslint — fall back to static checks only
      return { ok: true };
    }
  }

  async _staticCheck(full) {
    const ext = extname(full);
    if (!['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return [];
    const source = await readFile(full, 'utf8').catch(() => '');
    const issues = [];
    for (const spec of extractImports(source)) {
      if (spec.startsWith('.') || spec.startsWith('/')) {
        const candidates = [spec, spec.endsWith('.js') ? spec : `${spec}.js`, `${spec}/index.js`, `${spec}/index.jsx`];
        const ok = await Promise.all(candidates.map((c) => fsStat(join(dirname(full), c)).then(() => true).catch(() => false)));
        if (!ok.some(Boolean)) issues.push(`unresolved import: ${spec}`);
      }
    }
    return issues;
  }

  async _runRelatedTests(rel) {
    const base = rel.replace(/\.(jsx?|tsx?|mjs)$/, '');
    const candidates = [`${base}.test.js`, `${base}.spec.js`, `${base}.test.jsx`, `${base}.spec.jsx`];
    const exist = await Promise.all(
      candidates.map((c) => fsStat(join(this.projectPath, c)).then(() => true).catch(() => false))
    );
    const testFile = exist.indexOf(true) === -1 ? null : join(this.projectPath, candidates[exist.indexOf(true)]);
    if (!testFile) return { passed: true };
    try {
      const { stdout, stderr } = await execa('npm', ['test', '--', relative(this.projectPath, testFile)], {
        cwd: this.projectPath,
        timeout: 120_000,
        reject: false,
        env: { ...process.env, FORCE_COLOR: '0' }
      });
      const output = stdout + stderr;
      return { passed: !/FAIL|failed|✗|✖/.test(output), output: output.slice(-1200) };
    } catch (err) {
      return { passed: false, output: err.message };
    }
  }

  async _applyFix(rel, errorContext) {
    if (this.fixTimestamps.length >= this.config.maxFixesPerHour) {
      this._pushActivity({ file: rel, outcome: 'needs-review', detail: 'maxFixesPerHour budget reached — auto-fix paused' });
      return;
    }
    const assignment = await this.router?.pick('bugfix');
    if (!assignment) {
      this._pushActivity({ file: rel, outcome: 'needs-review', detail: 'no bugfix model available' });
      return;
    }

    const full = join(this.projectPath, rel);
    const source = await readFile(full, 'utf8').catch(() => '');
    let fixed = source;
    let attempts = 0;
    let verified = false;

    while (attempts < this.config.maxAttemptsPerFix && !verified) {
      attempts++;
      const res = await assignment.provider.complete(assignment.model.id, {
        messages: [
          {
            role: 'system',
            content: `BUGFIX
You are mcode's bugfix subagent. Fix the reported problem in the file below. Respond with EXACTLY the new full file content (no markdown, no commentary). File: ${rel}\n\nPROBLEM:\n${errorContext}`
          },
          { role: 'user', content: `CURRENT CONTENT:\n\`\`\`\n${source.slice(0, 8000)}\n\`\`\`` }
        ],
        temperature: 0.1,
        reasoning: this.router?.reasoning || null
      });
      const candidate = extractFixedContent(res.text);
      if (!candidate || candidate.length < 10) continue;

      // verify before applying
      const ok = await this._verifyFix(full, candidate);
      if (!ok) {
        errorContext += `\n\nPrevious fix attempt failed verification (attempt ${attempts}).`;
        continue;
      }
      fixed = candidate;
      verified = true;
    }

    if (verified) {
      await this.undoStack.snapshot(rel, source);
      await writeFile(full, fixed, 'utf8');
      this.fixesApplied++;
      this.fixTimestamps.push(Date.now());
      this.fixTimestamps = this.fixTimestamps.filter((t) => Date.now() - t < 3_600_000);
      this.bus?.emit(EVENTS.WATCH_FIX, { projectId: this.projectId, file: rel, outcome: WATCH_OUTCOMES.AUTO_FIXED, detail: errorContext.slice(0, 200) });
      this._pushActivity({ file: rel, outcome: 'auto-fixed', detail: `fixed after ${attempts} attempt(s)` });
      if (this.config.autoCommit) {
        await this._autoCommit(rel);
      }
    } else {
      this.bus?.emit(EVENTS.WATCH_FIX, { projectId: this.projectId, file: rel, outcome: WATCH_OUTCOMES.NEEDS_REVIEW, detail: errorContext.slice(0, 200) });
      this._pushActivity({ file: rel, outcome: 'needs-review', detail: `could not fix after ${attempts} attempt(s)` });
    }
    this.emitStatus();
  }

  async _verifyFix(full, candidate) {
    // lint the proposed content
    const tmp = join(dirname(full), `.mcode-fix-${basename(full)}`);
    await writeFile(tmp, candidate, 'utf8');
    try {
      const { stdout } = await execa('npx', ['--no-install', 'eslint', tmp, '--format', 'json'], {
        cwd: this.projectPath,
        timeout: 30_000,
        reject: false
      });
      const reports = JSON.parse(stdout || '[]');
      const errors = reports.flatMap((r) => (r.messages || []).filter((m) => m.severity === 2));
      if (errors.length > 0) return false;
    } catch {
      /* no eslint — accept */
    } finally {
      await rm(tmp, { force: true });
    }
    return true;
  }

  async _autoCommit(rel) {
    try {
      const git = (await import('simple-git')).default(this.projectPath);
      await git.add([rel]);
      await git.commit(`fix(watch): auto-fix ${rel}`);
    } catch {
      /* not a repo or git failure — safe to ignore */
    }
  }

  emitStatus() {
    this.bus?.emit(EVENTS.WATCH_STATUS, this.status);
  }

  summary() {
    return {
      project: this.projectPath,
      status: this.status,
      uptimeSecs: this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0,
      scansRun: this.scansRun,
      filesScanned: this.filesScanned,
      fixesApplied: this.fixesApplied,
      lastActivity: this.activity.slice(0, 10)
    };
  }

  async stop() {
    this._stopRequested = true;
    this.running = false;
    await this.watcher?.close();
    clearInterval(this.scanTimer);
    this.bus?.emit(EVENTS.WATCH_STATUS, 'stopped');
  }
}

function stripFence(text) {
  const m = /```[a-z]*\s*([\s\S]*?)```/.exec(String(text || ''));
  return (m ? m[1] : text || '').trim();
}

/** Accept either plain file content or a {"tool":"write_file","args":{content}} envelope. */
function extractFixedContent(text) {
  const raw = String(text || '').trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.tool === 'write_file' && parsed.args?.content) {
      return String(parsed.args.content).trim();
    }
  } catch {
    /* not JSON */
  }
  return stripFence(raw);
}
