import { ToolExecutor } from './tools.js';
import { EVENTS } from '@mcode/shared';
import { join, isAbsolute, relative } from 'node:path';

/* global AbortController */

/**
 * Agent-mode chat: the assistant can inspect the project, edit files, run
 * commands and tests, then answer — opencode-style. The model narrates and
 * emits at most ONE tool action per turn inside a ```mcode-action fence```.
 * This text protocol works on every provider (native function-calling is
 * optional, not required).
 */

export function buildAgentSystem(projectPath, tools, maxTurns) {
  return `You are mcode, a terminal-first AI coding agent. You are working autonomously inside the project:
${projectPath}

You can inspect code, edit files, run commands and tests, then give the user a final answer.

AVAILABLE TOOLS:
${Object.entries(tools)
  .map(([name, spec]) => `- ${name}: ${spec.description} (args: ${JSON.stringify(spec.parameters)})`)
  .join('\n')}

HOW TO WORK:
- If the user asks about code or wants changes, explore first: read the relevant files before writing anything.
- Keep your narration short and technical. Tell the user what you are doing.

WHEN TO USE web_search / web_fetch (do this WITHOUT being asked):
- Anything about current events, prices, versions, releases, or "latest" X.
- Any library/package/API/framework detail you are not fully certain is still accurate — package versions, API signatures, deprecated methods, breaking changes.
- Questions about the current state of something (who holds a role, what a company currently offers, current docs for a tool).
- If the user gives you a URL, always web_fetch it before answering about its contents.
- Do NOT wait for the user to say "search the web" — if your own knowledge could be stale or you are not confident, search first, then answer. Silence about a knowledge gap is worse than one extra tool call.
- Skip search only for stable, well-known facts (language syntax, math, historical events, general concepts) where recency doesn't matter.
- To invoke a tool, end your reply with an action fence EXACTLY like this:
\`\`\`mcode-action
{"tool":"read_file","args":{"path":"src/foo.js"}}
\`\`\`
- ONE action per reply. Never put more than one action fence in a reply.
- After you see the TOOL RESULT, continue in your next reply (read more, fix, test, ...).
- When the task is complete, reply with a plain final answer and NO action fence.

RULES:
- Only use tools from the list above. Paths are relative to the project root.
- Read a file before overwriting it. Never invent files that already exist.
- run_shell is allowed for npm scripts, builds, git commands — but never destructive commands (rm -rf etc).
- Verify your work: run the relevant tests when you changed code.
- Maximum ${maxTurns} actions for one user request. When you are done, stop.`;
}

const ACTION_FENCE = /```mcode-action\s*([\s\S]*?)```/g;
const TOOL_CALL_XML = /<tool_call>\s*([\w_-]+)([\s\S]*?)<\/tool_call>/g;
const ARG_PAIR = /<arg_key>\s*([^<]+?)\s*<\/arg_key>\s*<arg_value>([\s\S]*?)<\/arg_value>/g;

export function extractAction(text) {
  const actions = extractActions(text);
  return actions[0] || null;
}

/**
 * Extract ALL tool actions from a response (for parallel execution).
 * Returns array of { tool, args } — empty if none found.
 * Supports multiple JSON action fences in a single response.
 */
export function extractActions(text) {
  const source = String(text || '');
  const actions = [];

  // Parse all JSON action fences: ```mcode-action {tool, args} ```
  const fenceRegex = /```mcode-action\s*([\s\S]*?)```/g;
  for (const match of source.matchAll(fenceRegex)) {
    const raw = match[1].trim();
    const start = raw.indexOf('{');
    if (start === -1) continue;

    // Find matching closing brace
    let depth = 0;
    let end = start;
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === '{') depth++;
      if (raw[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    try {
      const parsed = JSON.parse(raw.slice(start, end + 1));
      if (parsed && typeof parsed.tool === 'string') {
        actions.push({
          tool: parsed.tool,
          args: parsed.args && typeof parsed.args === 'object' ? parsed.args : {}
        });
      }
    } catch {
      /* JSON parse failed — try next brace position */
      try {
        const parsed = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
        if (parsed && typeof parsed.tool === 'string') {
          actions.push({
            tool: parsed.tool,
            args: parsed.args && typeof parsed.args === 'object' ? parsed.args : {}
          });
        }
      } catch {
        /* skip this action fence */
      }
    }
  }

  // Fallback: parse XML-style <tool_call> blocks
  if (actions.length === 0) {
    const xml = [...source.matchAll(TOOL_CALL_XML)];
    for (const block of xml) {
      const tool = block[1];
      const args = {};
      for (const pair of block[2].matchAll(ARG_PAIR)) {
        args[pair[1].trim()] = pair[2].trim();
      }
      actions.push({ tool, args });
    }
  }

  return actions;
}

/**
 * Classify a tool call as safe for parallel execution (no dependencies).
 * Destructive tools (write_file, edit_file, run_shell) are NOT parallelized
 * unless explicitly marked as independent.
 */
function canParallelize(toolName, args, changedFiles) {
  // Read-only tools can always run in parallel
  const readOnly = ['read_file', 'list_files', 'search_code', 'web_search', 'web_fetch', 'git_status'];
  if (readOnly.includes(toolName)) return true;

  // write_file/edit_file depend on file state — parallelize only if different files
  if (toolName === 'write_file' || toolName === 'edit_file') {
    const targetPath = args?.path || args?.file || '';
    const conflict = changedFiles.some(f => f.path === targetPath);
    return !conflict;
  }

  // run_tests can run in parallel if different files
  if (toolName === 'run_tests' && args?.file) return true;

  // run_shell is potentially destructive — don't parallelize
  return false;
}

export function stripActions(text) {
  const out = String(text || '')
    .replace(ACTION_FENCE, '')
    .replace(TOOL_CALL_XML, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return out;
}

/** Stream a turn from any provider: native stream when available, else complete(). */
async function* streamText(assignment, model, params) {
  if (typeof assignment.provider.stream === 'function') {
    yield* assignment.provider.stream(model, params);
  } else {
    const res = await assignment.provider.complete(model, params);
    if (res?.text) yield res.text;
  }
}
export class ChatAgent {
  constructor({ assignment, projectPath, bus, undoStack, config = {}, reasoning = null, history = [], onTool = null, domain = null }) {
    this.assignment = assignment;
    this.projectPath = projectPath;
    this.config = config;
    this.domain = domain; // domain specialization for context isolation
    this.bus = bus;
    this.undoStack = undoStack;
    this.reasoning = reasoning;
    this.history = history ? history.slice(-20) : [];
    this.maxTurns = Math.max(1, Number(config.chatAgentTurns) || config.maxTurnsPerAgent || 12);
    this.allowShellAll = Boolean(config.allowShellAll);
    this.requireEditApproval = Boolean(config.requireEditApproval);
    this.networkWhitelist = config.networkWhitelist || null;
    this.auditLog = config.auditLog || null;
    this.requirePermission = config.requirePermission !== false;
    this.permissionTimeoutMs = Math.max(5_000, Number(config.permissionTimeoutMs) || 120_000);
    this.onTool = onTool;
    this.turn = 0;
    this.narration = [];
    this.toolSeq = 0;
    this.changedFiles = [];
    this.aborted = false;
    this.abortWaiters = [];
    this.pendingPermission = null;
    this.abortController = null;
  }

  /** Clear conversation history for this specialized agent (frees context window). */
  clearHistory() {
    this.history = [];
  }

  /** Cancel the current run (user pressed escape/Ctrl+C). */
  abort() {
    if (this.aborted) return;
    this.aborted = true;
    this.abortController?.abort();
    for (const resolve of this.abortWaiters.splice(0)) resolve('aborted');
    if (this.pendingPermission) {
      const { requestId } = this.pendingPermission;
      this.pendingPermission = null;
      this.bus?.emit(EVENTS.MESSAGE, {
        kind: 'tool',
        replaceKey: requestId,
        block: 'permission',
        status: 'done',
        permission: 'denied',
        approved: false,
        command: '',
        interrupt: true
      });
    }
  }

  /** Interactive permission gate — resolved by the UI (y/n/always), abort, or timeout. */
  _askPermission(command) {
    const requestId = `perm${++this.toolSeq}`;
    return new Promise((resolve) => {
      let settled = false;
      const settle = (answer) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.abortWaiters = this.abortWaiters.filter((w) => w !== settle);
        this.bus.off(EVENTS.PERMISSION_ANSWER, onAnswer);
        if (this.pendingPermission?.requestId === requestId) this.pendingPermission = null;
        resolve(answer);
      };
      const onAnswer = (p) => {
        if (p.requestId !== requestId) return;
        settle(p.answer || 'no');
      };
      const timeout = setTimeout(() => {
        this.bus?.emit(EVENTS.MESSAGE, {
          kind: 'system',
          replaceKey: requestId,
          text: `permission prompt timed out after ${Math.round(this.permissionTimeoutMs / 1000)}s — auto-denied`
        });
        settle('no');
      }, this.permissionTimeoutMs);
      this.pendingPermission = { requestId, command, resolve: settle };
      this.abortWaiters.push(settle);
      this.bus?.on(EVENTS.PERMISSION_ANSWER, onAnswer);
      this.bus?.emit(EVENTS.MESSAGE, {
        kind: 'tool',
        replaceKey: requestId,
        requestId,
        block: 'permission',
        status: 'running',
        permission: 'pending',
        command,
        approved: false
      });
    });
  }

  _toolArgsPreview(name, args) {
    if (name === 'read_file' || name === 'write_file' || name === 'run_tests') return String(args.path || args.file || '');
    if (name === 'run_shell') return String(args.command || '');
    if (name.startsWith('browser_navigate')) return String(args.url || '');
    if (name.startsWith('browser_click')) return args.text ? `text: "${args.text}"` : String(args.selector || '');
    if (name.startsWith('browser_type')) return `${args.selector} → "${String(args.value || '').slice(0, 30)}"`;
    if (name.startsWith('browser_screenshot')) return args.fullPage ? 'full page' : 'viewport';
    if (name.startsWith('browser_snapshot')) return 'accessibility tree';
    if (name.startsWith('browser_get_console_errors')) return 'console check';
    return JSON.stringify(args || {}).slice(0, 80);
  }

  _toolResultSummary(name, result) {
    if (!result || result.ok === false) return String(result?.error || 'failed').slice(0, 120);
    if (name === 'read_file') {
      const lines = String(result.content || '').split('\n').length;
      return `${lines} lines`;
    }
    if (name === 'list_files') return `${(result.files || []).length} files`;
    if (name === 'search_code') return `${(result.files || []).length} matches`;
    if (name === 'write_file') {
      return `${result?.diff?.changedLines ?? result?.diffLines?.length ?? '?'} lines changed in ${result.file}`;
    }
    if (name === 'run_shell') return String(result.stdout || '').split('\n').slice(0, 3).join(' · ').slice(0, 120) || 'ok';
    if (name === 'run_tests') return result.passed ? 'tests passed' : 'tests failed';
    if (name === 'git_status') return `${(result.files || []).length} changed files`;
    if (name === 'edit_file') return `${result?.diff?.changedLines ?? result?.diffLines?.length ?? '?'} lines changed in ${result.file}`;
    if (name === 'web_search') return `${(result?.results || []).length} results`;
    if (name === 'web_fetch') return `${String(result?.content || '').length} chars fetched`;
    if (name === 'browser_navigate') return `Opened ${result.url || ''} — "${result.title || ''}"`;
    if (name === 'browser_click') return 'clicked';
    if (name === 'browser_type') return 'typed';
    if (name === 'browser_screenshot') return 'screenshot captured';
    if (name === 'browser_snapshot') return (result.snapshot?.children || []).length + ' nodes in tree';
    if (name === 'browser_get_console_errors') return `${(result.errors || []).length} console errors`;
    return 'ok';
  }

  _toolOutput(name, result) {
    if (!result || result.ok === false) return '';
    if (name === 'run_shell') return String(result.stdout || '').slice(0, 3000);
    if (name === 'read_file') return String(result.content || '').slice(0, 3000);
    if (name === 'write_file') return String(result.diff?.sample || '').slice(0, 3000);
    return '';
  }

  _fullPath(p) {
    if (!p) return '';
    return isAbsolute(p) ? p : join(this.projectPath, p);
  }

  /** Build the spec block payload for a completed tool result. */
  _blockMeta(name, args, result) {
    const ok = !result || result.ok !== false;
    if (name === 'read_file') {
      return {
        block: 'read',
        path: this._fullPath(args.path),
        lines: String(result?.content || '').split('\n').slice(0, 400),
        diffLines: [],
        command: '',
        relDir: '',
        title: '',
        output: ''
      };
    }
    if (name === 'write_file') {
      const created = !!result?.created;
      return {
        block: created ? 'write' : 'edit',
        path: this._fullPath(result?.file || args.path),
        created,
        lines: String(result?.content || '').split('\n').slice(0, 200),
        diffLines: (result?.diffLines || []).slice(0, 200),
        command: '',
        relDir: '',
        title: '',
        output: '',
        undoId: result?.undoId
      };
    }
    if (name === 'edit_file') {
      return {
        block: 'edit',
        path: this._fullPath(args.path),
        created: false,
        lines: String(result?.content || '').split('\n').slice(0, 200),
        diffLines: (result?.diffLines || []).slice(0, 200),
        command: '',
        relDir: '',
        title: '',
        output: '',
        undoId: result?.undoId
      };
    }
    if (name === 'run_shell') {
      const rel = ''; // commands run at project root → header omitted per spec §7
      const output = String(result?.stdout || '') + (result?.stderr ? `\n${result.stderr}` : '');
      return {
        block: 'command',
        path: '',
        lines: [],
        command: String(args.command || ''),
        relDir: rel && rel !== '.' ? rel : '',
        title: '',
        output: output.slice(0, 3000)
      };
    }
    if (name === 'run_tests') {
      return {
        block: 'command',
        path: '',
        lines: [],
        command: `npm test${args.file ? ` -- ${args.file}` : ''}`,
        relDir: '',
        title: '',
        output: String(result?.output || (ok ? 'passed' : 'failed')).slice(0, 3000)
      };
    }
    if (name === 'list_files') {
      return {
        block: 'command', path: '', lines: [], command: '', relDir: '',
        title: `Glob ${JSON.stringify(args.glob ?? '**/*')}`,
        output: String((result?.files || []).join('\n')).slice(0, 3000)
      };
    }
    if (name === 'search_code') {
      return {
        block: 'command', path: '', lines: [], command: '', relDir: '',
        title: `Grep ${JSON.stringify(args.query || '')}`,
        output: String((result?.files || []).join('\n')).slice(0, 3000)
      };
    }
    if (name === 'web_search') {
      const results = (result?.results || []).slice(0, 5);
      const output = results.map((r, i) =>
        `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet || ''}`
      ).join('\n\n');
      const ret = {
        block: 'command', path: '', lines: [], command: '', relDir: '',
        title: `Web search: ${args.query || ''}`,
        output: output.slice(0, 3000)
      };
      // Only include searchResults when the tool actually returned data
      if (result?.ok !== false && results.length > 0) {
        ret.searchResults = {
          query: args.query || '',
          phase: 'done',
          results: results,
          answer: ''
        };
      }
      return ret;
    }
    if (name === 'web_fetch') {
      const content = String(result?.content || '').split('\n').slice(0, 60);
      const ret = {
        block: 'read', path: args.url || '',
        lines: content,
        diffLines: [], command: '', relDir: '',
        title: `Fetched: ${result?.title || args.url || ''}`,
        output: ''
      };
      if (result?.ok !== false && result?.content) {
        ret.searchResults = {
          query: `Fetched: ${args.url || ''}`,
          phase: 'done',
          results: [{ title: result?.title || args.url, url: args.url, snippet: String(result?.content || '').slice(0, 200) }],
          answer: ''
        };
      }
      return ret;
    }
    if (name === 'git_status') {
      return {
        block: 'command', path: '', lines: [], command: '', relDir: '',
        title: 'Git status',
        output: String((result?.files || []).join('\n')).slice(0, 3000)
      };
    }
    if (name === 'browser_navigate') {
      return {
        block: 'browser-nav', path: String(args.url || ''), lines: [], command: '', relDir: '',
        title: `Navigate to ${result.url || args.url || ''}`,
        output: result.title || '',
        url: result.url
      };
    }
    if (name === 'browser_click') {
      const target = args.text ? `"${args.text}" (text)` : args.selector;
      return {
        block: 'browser-interact', path: '', lines: [], command: '', relDir: '',
        title: 'Click', output: typeof target === 'string' ? target : ''
      };
    }
    if (name === 'browser_type') {
      return {
        block: 'browser-interact', path: '', lines: [], command: '', relDir: '',
        title: 'Type', output: typeof args.value === 'string' ? args.value.slice(0, 100) : ''
      };
    }
    if (name === 'browser_screenshot') {
      return {
        block: 'browser-screenshot', path: '', lines: [], command: '', relDir: '',
        title: args.fullPage ? 'Full-page screenshot' : 'Viewport screenshot',
        output: '',
        image: result.image || ''
      };
    }
    if (name === 'browser_snapshot') {
      return {
        block: 'browser-inspect', path: '', lines: [], command: '', relDir: '',
        title: 'Accessibility snapshot',
        output: '',
        snapshot: result.snapshot || null
      };
    }
    if (name === 'browser_get_console_errors') {
      return {
        block: 'browser-console', path: '', lines: [], command: '', relDir: '',
        title: 'Console errors',
        output: (result.errors || []).map((e) => e.text).join('\n').slice(0, 2000),
        errors: result.errors || []
      };
    }
    return {
      block: 'command', path: '', lines: [], command: '', relDir: '',
      title: String(name), output: String(this._toolResultSummary(name, result))
    };
  }

  async run(prompt) {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const tools = new ToolExecutor({
      projectPath: this.projectPath,
      bus: this.bus,
      undoStack: this.undoStack,
      allowShellAll: this.allowShellAll,
      requireEditApproval: this.requireEditApproval,
      networkWhitelist: this.networkWhitelist,
      auditLog: this.auditLog,
      domain: this.config.domain || 'backend',
      todoId: null,
      cancelSignal: signal
    });

    const messages = [
      { role: 'system', content: buildAgentSystem(this.projectPath, tools.tools(), this.maxTurns) },
      ...this.history,
      { role: 'user', content: prompt }
    ];
    this.history.push({ role: 'user', content: prompt });

    for (this.turn = 0; this.turn < this.maxTurns; this.turn++) {
      let text = '';
      try {
        for await (const chunk of streamText(this.assignment, this.assignment.model.id, {
          messages,
          temperature: 0.15,
          reasoning: this.reasoning,
          signal
        })) {
          if (this.aborted) break;
          text += chunk;
          this.bus?.emit(EVENTS.MESSAGE, { kind: 'stream', text: chunk });
        }
      } catch (err) {
        if (this.aborted) break;
        this.bus?.emit(EVENTS.MESSAGE, { kind: 'system', text: `model error: ${err.message}` });
        break;
      }
      if (this.aborted) break;
      messages.push({ role: 'assistant', content: text });
      this.history.push({ role: 'assistant', content: stripActions(text) });

      const actions = extractActions(text);
      if (actions.length === 0) {
        this.narration.push(stripActions(text));
        break;
      }

      const toolText = stripActions(text);
      if (toolText) this.narration.push(toolText);

      // Batch process all actions — run independent tools in parallel
      const batch = actions.map((action) => {
        const seq = ++this.toolSeq;
        const replaceKey = `t${seq}`;
        const preview = this._toolArgsPreview(action.tool, action.args);
        this.bus?.emit(EVENTS.MESSAGE, {
          kind: 'tool',
          replaceKey,
          tool: action.tool,
          args: preview,
          status: 'running'
        });
        this.onTool?.({ tool: action.tool, args: action.args, replaceKey });
        return { action, replaceKey, preview, seq };
      });

      // Determine if all actions can run in parallel
      const parallelizable = batch.every(
        ({ action }) => canParallelize(action.tool, action.args, this.changedFiles)
      );

      // Execute tools — in parallel if safe, sequentially if not
      const results = parallelizable && batch.length > 1
        ? await Promise.all(
            batch.map(async ({ action, replaceKey }) => {
              let result;
              if (typeof tools[action.tool] === 'function') {
                if (action.tool === 'run_shell' && !this.allowShellAll && this.requirePermission) {
                  const answer = await this._askPermission(String(action.args?.command || ''));
                  if (answer === 'aborted' || this.aborted) throw new Error('aborted');
                  if (answer === 'always') {
                    this.allowShellAll = true;
                    tools.allowShellAll = true;
                    this.bus?.emit('permission:always_granted', { tool: 'run_shell' });
                  }
                  if (answer !== 'yes' && answer !== 'always') {
                    result = { ok: false, error: 'permission denied by user' };
                    this.bus?.emit(EVENTS.MESSAGE, {
                      kind: 'tool', replaceKey, tool: action.tool, args: this._toolArgsPreview(action.tool, action.args),
                      status: 'done', block: 'command', path: '', lines: [],
                      command: String(action.args?.command || ''), relDir: '', title: '', output: ''
                    });
                  } else {
                    try { result = await tools.run(action.tool, action.args || {}); }
                    catch (err) { result = { ok: false, error: `tool error: ${err.message}` }; }
                  }
                } else {
                  try { result = await tools.run(action.tool, action.args || {}); }
                  catch (err) { result = { ok: false, error: `tool error: ${err.message}` }; }
                }
              } else {
                result = { ok: false, error: `unknown tool "${action.tool}"` };
              }
              return { action, replaceKey, preview: this._toolArgsPreview(action.tool, action.args), result };
            })
          )
        : await (async () => {
            // Sequential fallback
            const seqResults = [];
            for (const { action, replaceKey, preview } of batch) {
              let result;
              if (typeof tools[action.tool] === 'function') {
                if (action.tool === 'run_shell' && !this.allowShellAll && this.requirePermission) {
                  const answer = await this._askPermission(String(action.args?.command || ''));
                  if (answer === 'aborted' || this.aborted) break;
                  if (answer === 'always') {
                    this.allowShellAll = true;
                    tools.allowShellAll = true;
                    this.bus?.emit('permission:always_granted', { tool: 'run_shell' });
                  }
                  if (answer !== 'yes' && answer !== 'always') {
                    result = { ok: false, error: 'permission denied by user' };
                    this.bus?.emit(EVENTS.MESSAGE, {
                      kind: 'tool', replaceKey, tool: action.tool, args: preview,
                      status: 'done', block: 'command', path: '', lines: [],
                      command: String(action.args?.command || ''), relDir: '', title: '', output: ''
                    });
                    messages.push({ role: 'user', content: `TOOL RESULT: ${JSON.stringify(result)}` });
                    this.history.push({ role: 'user', content: `TOOL RESULT (${action.tool}): permission denied by user` });
                    seqResults.push({ action, replaceKey, preview, result });
                    continue;
                  }
                }
                try {
                  result = await tools.run(action.tool, action.args || {});
                } catch (err) {
                  if (this.aborted) break;
                  result = { ok: false, error: `tool error: ${err.message}` };
                }
              } else {
                result = { ok: false, error: `unknown tool "${action.tool}"` };
              }
              seqResults.push({ action, replaceKey, preview, result });
            }
            return seqResults;
          })();

      // Process results
      for (const { action, replaceKey, preview, result } of results.filter(r => r)) {
        if (!result) continue;
        const ok = !result || result.ok !== false;
        this.bus?.emit(EVENTS.MESSAGE, {
          kind: 'tool',
          replaceKey,
          tool: action.tool,
          args: preview,
          status: ok ? 'done' : 'failed',
          error: ok ? '' : String(result?.error || 'failed').slice(0, 300),
          ...this._blockMeta(action.tool, action.args || {}, result)
        });

        if (ok && action.tool === 'write_file') {
          const diff = Array.isArray(result?.diffLines) ? result.diffLines : [];
          this.changedFiles.push({
            path: result?.file || this._fullPath(action.args?.path || action.args?.file || ''),
            added: diff.filter((l) => l.kind === 'add').length,
            removed: diff.filter((l) => l.kind === 'remove').length,
            created: Boolean(result?.created)
          });
        }

        messages.push({ role: 'user', content: `TOOL RESULT: ${JSON.stringify(result).slice(0, 4000)}` });
        this.history.push({ role: 'user', content: `TOOL RESULT (${action.tool}): ${this._toolResultSummary(action.tool, result)}` });
      }
    }

    if (this.aborted) {
      this.bus?.emit(EVENTS.MESSAGE, { kind: 'interrupt', replaceKey: `interrupt${Date.now()}` });
    } else if (this.changedFiles.length >= 2) {
      this.bus?.emit(EVENTS.MESSAGE, {
        kind: 'summary',
        replaceKey: `summary${Date.now()}`,
        files: this.changedFiles.map((f) => ({
          ...f,
          path: relative(this.projectPath, f.path) || f.path
        }))
      });
    }

    // Clean up browser resources
    try { await tools.cleanupBrowser(); } catch { /* ignore */ }

    const full = this.narration.join('\n\n') || '...';
    this.history = this.history.slice(-20);
    return { text: full, turns: this.turn, history: this.history, interrupted: this.aborted };
  }
}

export { ChatAgent as default };
