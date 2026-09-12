import { join, resolve, relative } from 'node:path';
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { execa } from 'execa';
import { EVENTS } from '@mcode/shared';
import { isInteractive } from './logger.js';
import { redactSecrets, isNetworkAllowed } from './security.js';
import { scoreRisk, RISK_LEVELS } from './audit.js';
import { BrowserTool } from './browser-tool.js';

/**
 * Scoped toolset handed to subagents. Writes go through a snapshot +
 * diff-preview layer so `/undo` can revert any todo's changes.
 */
export class ToolExecutor {
  constructor({ projectPath, bus = null, undoStack = null, allowShellAll = false, requireEditApproval = false, domain = 'backend', todoId = null, cancelSignal = null, networkWhitelist = null, auditLog = null, memoryDir = null }) {
    this.projectPath = resolve(projectPath);
    this.bus = bus;
    this.undoStack = undoStack;
    this.allowShellAll = allowShellAll;
    this.requireEditApproval = requireEditApproval;
    this.domain = domain;
    this.todoId = todoId;
    this.cancelSignal = cancelSignal;
    this.networkWhitelist = networkWhitelist;
    this.auditLog = auditLog;
    this.memoryDir = memoryDir;
    this.browserTool = null; // lazily created
  }

  tools() {
    const t = {
      read_file: { description: 'Read a file from the project', parameters: { path: 'string' } },
      list_files: { description: 'List files matching a glob', parameters: { glob: 'string' } },
      search_code: { description: 'Search the codebase for text', parameters: { query: 'string' } },
      web_search: { description: 'Search the web for information', parameters: { query: 'string' } },
      web_fetch: { description: 'Fetch and extract text content from a URL', parameters: { url: 'string' } },
      git_status: { description: 'Show current git status / diff summary', parameters: {} }
    };
    // Long-term user memory — only available when the session provides a
    // per-user memory file (web chat sessions). Claude-style: the model saves
    // durable facts (name, preferences, project details) — not per-turn notes.
    if (this.memoryDir) {
      t.memory_write = { description: 'Save a stable, lasting fact the user shared (their name, preferences, project details) to long-term memory — only for specific permanent facts, NOT random per-turn notes', parameters: { fact: 'string' } };
      t.memory_read = { description: 'Read facts previously saved to long-term user memory (optionally filtered by a keyword)', parameters: { key: 'string?' } };
    }
    if (this.domain !== 'chat' && this.domain !== 'docs') {
      t.write_file = { description: 'Write a file (creates parent dirs)', parameters: { path: 'string', content: 'string' } };
      t.edit_file = { description: 'Edit a file by replacing text', parameters: { path: 'string', old: 'string', new: 'string' } };
      t.run_shell = { description: 'Run a shell command inside the project (npm install, build, etc.)', parameters: { command: 'string' } };
      t.run_tests = { description: 'Run the project test suite (or one file)', parameters: { file: 'string' } };
      // Browser automation tools
      t.browser_navigate = { description: 'Open a URL in a real browser to test the running app', parameters: { url: 'string' } };
      t.browser_click = { description: 'Click an element by CSS selector or visible text', parameters: { selector: 'string?', text: 'string?' } };
      t.browser_type = { description: 'Type text into an input field', parameters: { selector: 'string', value: 'string' } };
      t.browser_screenshot = { description: 'Take a screenshot of the current page state', parameters: { fullPage: 'boolean?' } };
      t.browser_snapshot = { description: 'Get the accessibility tree of the current page (cheaper than a screenshot)', parameters: {} };
      t.browser_get_console_errors = { description: 'Check for JS errors logged in the browser console', parameters: {} };
    }
    return t;
  }

  _abs(path) {
    let cleanPath = String(path || '').trim();
    const normProj = resolve(this.projectPath);
    const full = resolve(normProj, cleanPath);
    const isWin = process.platform === 'win32';
    const normProjCheck = isWin ? normProj.toLowerCase() : normProj;
    const fullCheck = isWin ? full.toLowerCase() : full;
    const rel = relative(normProjCheck, fullCheck);
    if (rel.startsWith('..') || (isWin ? /^[a-zA-Z]:/.test(rel) : rel.startsWith('/'))) {
      throw new Error(`path escapes project root: ${path}`);
    }
    return full;
  }

  async run(name, args) {
    const start = Date.now();
    const { score, level } = scoreRisk(name, args);
    this.bus?.emit(EVENTS.SUBAGENT_TOOL_CALL, { tool: name, args: JSON.stringify(args).slice(0, 200), risk: level });

    // High-risk operations always require permission, even in agent mode
    if (level === RISK_LEVELS.CRITICAL && this.bus && this.bus.listenerCount) {
      const approved = await this._askPermissionIfNeeded(name, args);
      if (!approved) {
        this.auditLog?.logPermission(name, 'denied', { reason: 'high risk', args });
        return { ok: false, error: `permission denied: ${name} flagged as ${level}` };
      }
      this.auditLog?.logPermission(name, 'approved', { args });
    }

    this.auditLog?.logToolCall(name, { ...args, todoId: this.todoId, domain: this.domain });

    let result;
    try {
      result = await this[name](args || {});
    } catch (err) {
      result = { ok: false, error: err.message };
    }
    this.bus?.emit(EVENTS.SUBAGENT_TOOL_RESULT, { tool: name, ms: Date.now() - start, risk: level, truncated: String(result).slice(0, 300) });
    return result;
  }

  /** Risk-based permission prompt for critical operations. */
  async _askPermissionIfNeeded(name, args) {
    if (!this.bus) return true;
    const requestId = `risk${Date.now().toString(36)}`;
    let resolved = false;
    let approved = false;
    const onAnswer = (p) => {
      if (p.requestId !== requestId) return;
      if (p.answer === 'always' || p.answer === 'yes') approved = true;
      resolved = true;
      this.bus.off('PERMISSION_ANSWER', onAnswer);
      clearTimeout(timer);
    };
    this.bus.on('PERMISSION_ANSWER', onAnswer);
    const timer = setTimeout(() => {
      if (!resolved) {
        this.bus.off('PERMISSION_ANSWER', onAnswer);
        resolved = true;
        approved = false;
      }
    }, 60_000);

    this.bus.emit(EVENTS.MESSAGE, {
      kind: 'tool',
      block: 'permission',
      requestId,
      status: 'running',
      prompt: `High-risk action: ${name}`,
      command: name,
      detail: `risk level: ${scoreRisk(name, args).level} (score ${scoreRisk(name, args).score}/10)`,
    });

    // Wait for answer
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (resolved) { clearInterval(check); resolve(); }
      }, 50);
    });
    return approved;
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
      return { ok: true, files: await this._nativeSearch(query) };
    }
  }

  /** ripgrep-less fallback: bounded recursive text scan over source-ish files. */
  async _nativeSearch(query) {
    const matches = [];
    const walk = async (dir) => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (matches.length >= 50) return;
        if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (/\.(js|jsx|ts|tsx|mjs|cjs|json|md|css|html|vue|svelte)$/i.test(entry.name)) {
          try {
            const content = await readFile(full, 'utf8');
            if (content.includes(query)) matches.push(full);
          } catch {
            /* unreadable */
          }
        }
      }
    };
    await walk(this.projectPath);
    return matches;
  }

  async write_file({ path, content }) {
    const full = this._abs(path);
    await mkdir(join(full, '..'), { recursive: true });
    const prev = await readFile(full, 'utf8').catch(() => null);
    if (prev !== null) {
      if (this.requireEditApproval) {
        const answer = await this._askOverwrite(path, prev);
        if (answer !== 'y' && answer !== 'always') {
          return { ok: false, error: `Overwrite denied by user for ${path}` };
        }
      }
    } else if (this.requireEditApproval) {
      // New file — prompt for approval when review-before-write is enabled
      const answer = await this._askOverwrite(path, null, true);
      if (answer !== 'y' && answer !== 'always') {
        return { ok: false, error: `Write denied by user for ${path}` };
      }
    }
    const undoId = await this.undoStack?.snapshot(path, prev);
    await writeFile(full, content, 'utf8');
    const created = prev === null;
    const diff = created ? null : lineDiff(prev || '', content);
    const rel = relative(this.projectPath, full).replace(/\\/g, '/');
    this.bus?.emit(EVENTS.SUBAGENT_FILE, {
      todoId: this.todoId || null,
      file: rel,
      content,
      diff: diff || diffText(prev || '', content),
      language: rel.split('.').pop() || 'txt',
      timestamp: Date.now()
    });
    return { ok: true, file: rel, created, diff, diffLines: diff?.lines || [], content, undoId };
  }

  async edit_file({ path, old: oldText, new: newText }) {
    const full = this._abs(path);
    const prev = await readFile(full, 'utf8').catch(() => null);
    if (prev === null) {
      return { ok: false, error: `file not found: ${path}` };
    }
    if (!prev.includes(oldText)) {
      return { ok: false, error: `old text not found in ${path}` };
    }
    // Guard against ambiguous edits — replace() only touches the first match,
    // so if oldText appears more than once we'd silently edit whichever
    // occurrence happens to come first, which may not be the intended one.
    const occurrences = prev.split(oldText).length - 1;
    if (occurrences > 1) {
      return { ok: false, error: `old text matches ${occurrences} locations in ${path} — include more surrounding context to make it unique` };
    }

    // Prompt for approval when review-before-write is enabled
    if (this.requireEditApproval) {
      const answer = await this._askOverwrite(path, prev);
      if (answer !== 'y' && answer !== 'always') {
        return { ok: false, error: `Edit denied by user for ${path}` };
      }
    }

    const content = prev.replace(oldText, newText);
    const undoId = await this.undoStack?.snapshot(path, prev);
    await writeFile(full, content, 'utf8');
    const diff = lineDiff(prev, content);
    this.bus?.emit(EVENTS.SUBAGENT_FILE, {
      todoId: this.todoId || null,
      file: path,
      content,
      diff: diff || diffText(prev, content),
      language: path.split('.').pop() || 'txt',
      timestamp: Date.now()
    });
    return { ok: true, file: path, diff, diffLines: diff?.lines || [], content, undoId };
  }

  /** Strip HTML tags and decode entities to plain text. */
  _stripHtml(html) {
    return String(html || '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  async web_search({ query }) {
    const cleanQuery = String(query || '').replace(/^["']|["']$/g, '').trim();
    if (!cleanQuery) return { ok: false, error: 'empty search query' };

    // Helper to decode Bing redirect URLs (u=a1base64url)
    const decodeBingUrl = (url) => {
      if (!url || typeof url !== 'string') return '';
      if (url.includes('bing.com/ck/a')) {
        try {
          const parsed = new URL(url, 'https://www.bing.com');
          const uParam = parsed.searchParams.get('u');
          if (uParam && uParam.length > 2) {
            let b64 = (uParam.startsWith('a1') || uParam.startsWith('a0')) ? uParam.slice(2) : uParam;
            b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4 !== 0) b64 += '=';
            const decoded = Buffer.from(b64, 'base64').toString('utf-8');
            if (decoded.startsWith('http://') || decoded.startsWith('https://')) return decoded;
          }
        } catch { /* ignore */ }
      }
      return url;
    };

    const results = [];

    // Tier 1: DuckDuckGo Lite HTML (fast, direct URLs, no ads/redirects)
    try {
      const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        body: 'q=' + encodeURIComponent(cleanQuery),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: this.cancelSignal || undefined,
        timeout: 7000
      });
      if (ddgRes.ok) {
        const html = await ddgRes.text();
        const linkRegex = /<a\s+[^>]*?href=['"]([^'"]+)['"][^>]*?class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>|<a\s+[^>]*?class=['"]result-link['"][^>]*?href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
        const snippetRegex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

        const links = [];
        let m;
        while ((m = linkRegex.exec(html)) !== null && links.length < 5) {
          let href = m[1] || m[3];
          let title = m[2] || m[4];
          if (href && href.includes('uddg=')) {
            try {
              const u = new URL(href, 'https://duckduckgo.com');
              href = decodeURIComponent(u.searchParams.get('uddg'));
            } catch { /* ignore */ }
          }
          if (title && href && href.startsWith('http') && !href.includes('duckduckgo.com')) {
            links.push({
              title: redactSecrets(this._stripHtml(title).trim()),
              url: href
            });
          }
        }

        const snippets = [];
        while ((m = snippetRegex.exec(html)) !== null && snippets.length < 5) {
          snippets.push(redactSecrets(this._stripHtml(m[1]).replace(/\s+/g, ' ').trim()));
        }

        for (let i = 0; i < links.length; i++) {
          results.push({
            ...links[i],
            snippet: snippets[i] || ''
          });
        }
      }
    } catch { /* fallback to Bing */ }

    // Tier 2: Bing HTML with redirect decoding and strict domain exclusion
    if (results.length === 0) {
      try {
        const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(cleanQuery)}&count=10&setmkt=en-US&setlang=en-US`;
        const res = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.bing.com/',
          },
          signal: this.cancelSignal || undefined,
          timeout: 7000
        });
        if (res.ok) {
          const html = await res.text();
          const algoRegex = /<li[^]*?class=["']b_algo["'][^]*?<\/li>/gi;
          let algoMatch;
          while ((algoMatch = algoRegex.exec(html)) !== null && results.length < 5) {
            const block = algoMatch[0];
            const linkMatch = block.match(/<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
            if (!linkMatch) continue;

            const url = decodeBingUrl(linkMatch[1]);
            if (!url || !url.startsWith('http') || url.includes('bing.com') || url.includes('microsoft.com')) {
              continue;
            }

            const title = redactSecrets(this._stripHtml(linkMatch[2]).trim());
            const snippetMatch = block.match(/<div[^]*?class=["']b_caption["'][^]*?<p[^>]*>([\s\S]*?)<\/p>/i);
            const snippet = snippetMatch
              ? redactSecrets(this._stripHtml(snippetMatch[1]).trim().replace(/\s+/g, ' '))
              : '';

            if (title && url) {
              results.push({ title, url, snippet });
            }
          }
        }
      } catch { /* fallback to Wikipedia */ }
    }

    // Tier 3: Wikipedia OpenSearch API
    if (results.length === 0) {
      try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=5&namespace=0&format=json`;
        const wikiRes = await fetch(wikiUrl, { timeout: 4000 });
        if (wikiRes.ok) {
          const data = await wikiRes.json();
          if (Array.isArray(data) && data.length >= 4) {
            const titles = data[1] || [];
            const snippets = data[2] || [];
            const urls = data[3] || [];
            for (let i = 0; i < titles.length && results.length < 5; i++) {
              if (urls[i] && urls[i].startsWith('http')) {
                results.push({
                  title: redactSecrets(titles[i]),
                  url: urls[i],
                  snippet: redactSecrets(snippets[i] || '')
                });
              }
            }
          }
        }
      } catch { /* ignore */ }
    }

    if (results.length === 0) {
      return { ok: false, error: 'No search results found' };
    }
    return { ok: true, results };
  }

  async web_fetch({ url }) {
    if (!isNetworkAllowed(url, this.networkWhitelist)) {
      return { ok: false, error: 'network request blocked by whitelist' };
    }
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          'Accept': 'text/markdown,text/plain,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: this.cancelSignal || undefined,
        timeout: 15_000
      });
      const contentType = String(res.headers.get('content-type') || '').toLowerCase();
      const raw = await res.text();
      const isMarkdown = contentType.includes('markdown') || url.endsWith('.md') || url.endsWith('.markdown');

      let text = '';
      let title = url;

      if (isMarkdown) {
        text = raw;
      } else {
        const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) title = redactSecrets(this._stripHtml(titleMatch[1]));

        // Extract main container if present (open-webSearch pattern)
        const articleMatch = raw.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i);
        const sourceHtml = articleMatch ? articleMatch[2] : raw;
        text = redactSecrets(this._stripHtml(sourceHtml));

        if (!text || text.length < 60) {
          text = redactSecrets(this._stripHtml(raw));
        }
      }

      return { ok: true, url, title, content: text.slice(0, 8000) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /** Save a durable user fact to the per-user memory file (append-only, deduped). */
  async memory_write({ fact }) {
    if (!this.memoryDir) return { ok: false, error: 'memory is not available in this session' };
    const factStr = String(fact || '').trim();
    if (!factStr) return { ok: false, error: 'no fact provided' };
    try {
      const { dirname } = await import('node:path');
      await mkdir(dirname(this.memoryDir), { recursive: true });
      let content = '';
      try { content = await readFile(this.memoryDir, 'utf8'); } catch { /* first write */ }
      const line = `- ${factStr.replace(/\n/g, ' ')}`;
      if (content.split('\n').includes(line)) return { ok: true, saved: false, note: 'already in memory' };
      const updated = content.trimEnd() + (content.trimEnd() ? '\n' : '') + line + '\n';
      await writeFile(this.memoryDir, updated, 'utf8');
      return { ok: true, saved: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /** Read facts from the per-user memory file (optionally filtered by keyword). */
  async memory_read({ key = null } = {}) {
    if (!this.memoryDir) return { ok: false, error: 'memory is not available in this session' };
    try {
      let content = '';
      try { content = await readFile(this.memoryDir, 'utf8'); } catch { return { ok: true, entries: [] }; }
      const entries = content
        .split('\n')
        .map((l) => l.replace(/^-\s*/, '').trim())
        .filter(Boolean);
      const filtered = key
        ? entries.filter((l) => l.toLowerCase().includes(String(key).toLowerCase()))
        : entries;
      return { ok: true, entries: filtered };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /** Ask the user for permission before writing/editing a file.
   *  When `requireEditApproval` is enabled this runs for every write/edit;
   *  otherwise it only runs for overwrites. Emits a permission message on the
   *  bus and waits for PERMISSION_ANSWER.
   *  Returns 'y' | 'n' | 'always'. 'always' is cached for this executor. */
  async _askOverwrite(path, prev, isNew = false) {
    if (!this.bus) return 'y';
    if (!isInteractive()) return 'y';
    if (this._alwaysApprove) return 'always';

    const lineCount = prev === null ? 0 : String(prev || '').split('\n').length;

    return new Promise((resolve) => {
      const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const onAnswer = (p) => {
        if (p.requestId !== requestId) return;
        this.bus.off(EVENTS.PERMISSION_ANSWER, onAnswer);
        if (p.answer === 'always') this._alwaysApprove = true;
        clearTimeout(timer);
        resolve(p.answer);
      };
      this.bus.on(EVENTS.PERMISSION_ANSWER, onAnswer);
      const timer = setTimeout(() => {
        this.bus.off(EVENTS.PERMISSION_ANSWER, onAnswer);
        resolve('n');
      }, 60_000);

      this.auditLog?.logPermission('write_file', 'pending', { path, reason: 'overwrite', lineCount });
      this.bus.emit(EVENTS.MESSAGE, {
        kind: 'tool',
        block: 'permission',
        requestId,
        status: 'running',
        prompt: isNew
          ? `Create new file: ${path}`
          : `Overwrite existing file: ${path} (${lineCount} lines)`,
        command: `write_file → ${path}`,
        detail: '',
      });
    });
  }

  async git_status() {
    const git = (await import('simple-git')).default(this.projectPath);
    const status = await git.status();
    return { ok: true, files: status.files.map((f) => `${f.index} ${f.path}`), branch: status.current };
  }

  async run_shell({ command }) {
    if (!this.allowShellAll) {
      // strip quoting/escapes first so `r"m" -r -f` / `r\m -rf` can't sneak past
      const flat = String(command).replace(/["'`\\]/g, '');
      const tokens = flat.toLowerCase().split(/[\s;&|()]+/);
      const killers = ['rm', 'rmdir', 'del', 'erase', 'dd', 'mkfs', 'format', 'shutdown'];
      const hit = tokens.some((t) => killers.some((k) => t === k || t.startsWith(`${k}.`)));
      const dangerousFlags = /-{1,2}([a-z]*r[a-z]*|[a-z]*f[a-z]*)/.test(flat) || /(^|\s)\/[a-z]*[sq][a-z]*(?=\s|$)/.test(flat);
      if (
        (hit && dangerousFlags) ||
        /:\(\)\s*\{/.test(flat) ||
        /mkfs\s+\S+/.test(flat) ||
        /format\s+[a-z]:/i.test(flat)
      ) {
        return { ok: false, error: 'destructive command blocked by sandbox (use --allow-shell-all to bypass)' };
      }
    }
    const child = execa(command, {
      cwd: this.projectPath,
      shell: true,
      timeout: 120_000,
      cancelSignal: this.cancelSignal || undefined,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    child.stdout?.on('data', chunk => this.bus?.emit(EVENTS.SUBAGENT_SHELL_OUTPUT, { chunk: chunk.toString() }));
    child.stderr?.on('data', chunk => this.bus?.emit(EVENTS.SUBAGENT_SHELL_OUTPUT, { chunk: chunk.toString() }));
    
    const { stdout, stderr } = await child;
    return { ok: true, stdout: stdout.slice(0, 4000), stderr: stderr.slice(0, 2000) };
  }

  async run_tests({ file = '' }) {
    try {
      const args = ['test', '--', ...(file ? [file] : [])];
      const child = execa('npm', args, {
        cwd: this.projectPath,
        timeout: 180_000,
        cancelSignal: this.cancelSignal || undefined,
        env: { ...process.env, FORCE_COLOR: '1' },
        reject: false
      });
      child.stdout?.on('data', chunk => this.bus?.emit('SUBAGENT_SHELL_OUTPUT', { chunk: chunk.toString() }));
      child.stderr?.on('data', chunk => this.bus?.emit('SUBAGENT_SHELL_OUTPUT', { chunk: chunk.toString() }));
      
      const { stdout, stderr } = await child;
      const passed = !/FAIL|failed/i.test(stdout + stderr);
      return { ok: true, passed, output: (stdout + stderr).slice(-1500) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /* ── Browser automation tools (Antigravity/Codex/Claude-in-Chrome pattern) ── */

  _getBrowserTool() {
    if (!this.browserTool) {
      this.browserTool = new BrowserTool({
        projectPath: this.projectPath,
        bus: this.bus,
      });
    }
    return this.browserTool;
  }

  async browser_navigate({ url }) {
    return await this._getBrowserTool().browser_navigate({ url });
  }

  async browser_click({ selector, text }) {
    return await this._getBrowserTool().browser_click({ selector, text });
  }

  async browser_type({ selector, value }) {
    return await this._getBrowserTool().browser_type({ selector, value });
  }

  async browser_screenshot({ fullPage = false } = {}) {
    return await this._getBrowserTool().browser_screenshot({ fullPage });
  }

  async browser_snapshot() {
    return await this._getBrowserTool().browser_snapshot();
  }

  async browser_get_console_errors() {
    return await this._getBrowserTool().browser_get_console_errors();
  }

  /** Clean up browser resources when the executor is done. */
  async cleanupBrowser() {
    if (this.browserTool) {
      await this.browserTool.close();
      this.browserTool = null;
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
  constructor({ filePath, maxEntries = 200, projectPath = null } = {}) {
    this.filePath = filePath;
    this.maxEntries = maxEntries;
    this.entries = [];
    this.projectPath = projectPath;
  }

  async snapshot(relPath, prevContent) {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.entries.push({ id, at: new Date().toISOString(), file: relPath, prev: prevContent });
    if (this.entries.length > this.maxEntries) this.entries.shift();
    if (this.filePath) {
      try {
        await writeFile(this.filePath, JSON.stringify(this.entries), 'utf8');
      } catch {
        /* best-effort persistence */
      }
    }
    return id;
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

  /** Revert a write by id (when provided) or the most recent write (LIFO fallback).
   *  Returns the reverted file path or null if the stack is empty. */
  async undo(id) {
    await this.load();
    let entry;
    if (id) {
      const idx = this.entries.findIndex((e) => e.id === id);
      if (idx !== -1) entry = this.entries.splice(idx, 1)[0];
    }
    if (!entry) entry = this.entries.pop();
    if (!entry) return null;
    const full = this.projectPath ? resolve(this.projectPath, entry.file) : resolve(process.cwd(), entry.file);
    if (entry.prev === null) {
      await rm(full, { force: true });
    } else {
      await writeFile(full, entry.prev, 'utf8');
    }
    if (this.filePath) {
      await writeFile(this.filePath, JSON.stringify(this.entries), 'utf8').catch(() => {});
    }
    return entry.file;
  }

  pending() {
    return this.entries.length;
  }
}
