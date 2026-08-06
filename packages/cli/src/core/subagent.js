import { SUBAGENT_STATUS, EVENTS, estimateTokens } from '@mcode/shared';
import { ToolExecutor } from './tools.js';

/* global AbortController */

const SUBAGENT_SYSTEM = (todo, tools) => `SUBAGENT
You are mcode subagent #${todo.id}. You own exactly ONE todo. Work autonomously to completion.

TODO: ${todo.title}
${todo.description ? `DETAILS: ${todo.description}` : ''}
DOMAIN: ${todo.domain}

AVAILABLE TOOLS:
${Object.entries(tools).map(([name, spec]) => `- ${name}: ${spec.description} (args: ${JSON.stringify(spec.parameters)})`).join('\n')}

RULES:
- Work inside the project directory only. Prefer relative paths.
- Write real, working code. Run tests when you can.
- After every action, respond with EXACTLY one JSON object, no markdown, no prose:
  {"tool": "tool_name", "args": {...}}
- When the todo is fully done, respond with:
  {"done": true, "summary": "what you changed"}
- If blocked, respond with:
  {"blocked": true, "reason": "..."} (max 3 times, then give up)
- Never invent files that already exist; read before overwriting.
- Keep responses JSON-only. Maximum ${todo.maxTurns || 25} tool actions.`;

function parseAction(text, { tools = null } = {}) {
  const trimmed = String(text || '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.tool || parsed.done || parsed.blocked) return parsed;
    // Some models emit {"write_file": {"path": ..., "content": ...}} —
    // the top-level key is the tool name.
    const keys = Object.keys(parsed);
    if (tools && keys.length === 1 && tools[keys[0]]) {
      const args = parsed[keys[0]];
      return { tool: keys[0], args: typeof args === 'object' && args ? args : {} };
    }
  } catch {
    /* fall through to extraction */
  }
  // Some models emit <tool_call>tool<arg_key>k</arg_key><arg_value>v</arg_value></tool_call>
  const xml = /<tool_call>\s*([\w-]+)\s*([\s\S]*?)<\/tool_call>/i.exec(trimmed);
  if (xml && (!tools || tools[xml[1]])) {
    const decode = (s) => s.replace(/&lt;|&gt;|&amp;|&quot;|&#39;/g, (e) => ({ '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'" }[e]));
    const args = {};
    const pairs = xml[2].matchAll(/<arg_key>([\s\S]*?)<\/arg_key>\s*<arg_value>([\s\S]*?)<\/arg_value>/gi);
    for (const p of pairs) {
      const key = decode(p[1]).trim();
      let val = decode(p[2]);
      try { val = JSON.parse(val); } catch { /* keep as string */ }
      if (key) args[key] = val;
    }
    return { tool: xml[1], args };
  }
  const fenced = /```json\s*([\s\S]*?)```/.exec(trimmed);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf('{');
  if (start === -1) return { blocked: true, reason: 'model output was not JSON' };
  let end = start;
  while ((end = candidate.indexOf('}', end)) !== -1) {
    try {
      const parsed = JSON.parse(candidate.slice(start, end + 1));
      if (parsed.tool || parsed.done || parsed.blocked) return parsed;
      const keys = Object.keys(parsed);
      if (tools && keys.length === 1 && tools[keys[0]]) {
        const args = parsed[keys[0]];
        return { tool: keys[0], args: typeof args === 'object' && args ? args : {} };
      }
    } catch {
      /* keep scanning for the end of the object */
    }
    end += 1;
  }
  return { blocked: true, reason: 'model output was not valid JSON' };
}

export class Subagent {
  constructor({ todo, assignment, projectPath, bus, undoStack, config = {}, onEvent = null, reasoning = null }) {
    this.todo = todo;
    this.assignment = assignment; // { provider, model, ref }
    this.reasoning = reasoning;
    this.bus = bus;
    this.undoStack = undoStack;
    this.projectPath = projectPath;
    this.maxTurns = config.maxTurnsPerSubagent || 25;
    this.allowShellAll = config.allowShellAll || false;
    this.networkWhitelist = config.networkWhitelist || null;
    this.auditLog = config.auditLog || null;
    this.onEvent = onEvent;
    this.status = SUBAGENT_STATUS.PENDING;
    this.step = 0;
    this.totalSteps = 1;
    this.message = 'queued';
    this.startedAt = null;
    this.finishedAt = null;
    this.messages = [];
    this.blockedCount = 0;
    this.result = null;
    this.timer = null;
    this.tokens = { in: 0, out: 0 };
    this.interrupted = false;
    this.abortController = new AbortController();
    this._jsonRetries = 0;
  }

  emit(event, payload) {
    this.bus?.emit(event, { todoId: this.todo.id, ...payload });
    this.onEvent?.(event, { todoId: this.todo.id, ...payload });
  }

  startTimer() {
    this.startedAt = new Date();
    this.interval = setInterval(() => {
      const secs = Math.floor((Date.now() - this.startedAt) / 1000);
      this.onEvent?.('TICK', { todoId: this.todo.id, elapsed: secs });
    }, 1000);
  }

  async run() {
    this.status = SUBAGENT_STATUS.RUNNING;
    this.startedAt = new Date();
    this.emit(EVENTS.SUBAGENT_ASSIGNED, { model: this.assignment.ref, domain: this.todo.domain });
    this.emit(EVENTS.SUBAGENT_STARTED, { model: this.assignment.ref, title: this.todo.title, domain: this.todo.domain, wave: this.todo.wave || 1, tokens: { in: 0, out: 0 }, latency: 0 });
    this.startTimer();

    const tools = new ToolExecutor({
      projectPath: this.projectPath,
      bus: this.bus,
      undoStack: this.undoStack,
      allowShellAll: this.allowShellAll,
      networkWhitelist: this.networkWhitelist,
      auditLog: this.auditLog,
      domain: this.todo.domain,
      todoId: this.todo.id,
      cancelSignal: this.abortController.signal
    });

    this.messages = [
      { role: 'system', content: SUBAGENT_SYSTEM(this.todo, tools.tools()) },
      { role: 'user', content: `Begin work on: ${this.todo.title}` }
    ];

    try {
      for (let turn = 0; turn < this.maxTurns; turn++) {
        this.step = turn + 1;
        this.totalSteps = this.maxTurns;
        this.message = `thinking (step ${this.step}/${this.maxTurns})`;
        this.emit(EVENTS.SUBAGENT_STEP, { step: this.step, total: this.maxTurns, message: this.message, tokens: this.tokens });

        const t0 = Date.now();
        const res = await this.assignment.provider.complete(this.assignment.model.id, {
          messages: this.messages,
          temperature: this._jsonRetries > 0 ? 0.7 : 0.1,
          reasoning: this.reasoning,
          signal: this.abortController.signal
        });
        this.latency = Date.now() - t0;
        if (this.interrupted) {
          return this._interrupted();
        }
        this.ledger?.(res);
        this.tokens.in += estimateTokens(this.messages.map((m) => m.content || '').join('\n'));
        this.tokens.out += estimateTokens(res.text);

        const action = parseAction(res.text, { tools: tools.tools() });
        this.messages.push({ role: 'assistant', content: res.text });

        if (action.done) {
          this.message = `done — ${String(action.summary || '').slice(0, 80)}`;
          this.status = SUBAGENT_STATUS.DONE;
          this.result = { status: 'done', summary: action.summary, model: this.assignment.ref };
          this.emit(EVENTS.SUBAGENT_DONE, { summary: action.summary, model: this.assignment.ref, result: this.result, tokens: this.tokens, latency: this.latency });
          return this.result;
        }

        if (action.blocked) {
          this.blockedCount++;
          if (this.blockedCount >= 3) {
            this.status = SUBAGENT_STATUS.NEEDS_REVIEW;
            this.result = { status: 'needs_review', reason: action.reason };
            this.emit(EVENTS.SUBAGENT_NEEDS_REVIEW, { reason: action.reason });
            return this.result;
          }
          const hint = String(action.reason || '').toLowerCase().includes('json')
            ? `Your last response was not valid JSON. Reply with EXACTLY one JSON object, nothing else. Examples:\n` +
              `{"tool": "read_file", "args": {"path": "src/foo.js"}}\n` +
              `{"done": true, "summary": "what you changed"}\n` +
              `No prose, no markdown, no XML tags.`
            : `You are blocked (${action.reason}). Try a different approach or use another tool.`;
          this._jsonRetries++;
          this.messages.push({ role: 'user', content: hint });
          continue;
        }

        if (action.tool && typeof tools[action.tool] === 'function') {
          this.message = `running ${action.tool}`;
          const toolResult = await tools.run(action.tool, action.args || {});
          if (this.interrupted) {
            return this._interrupted();
          }
          this.messages.push({
            role: 'user',
            content: `TOOL RESULT: ${JSON.stringify(toolResult).slice(0, 4000)}`
          });
        } else {
          this.messages.push({
            role: 'user',
            content: `Unknown tool "${action.tool}". Pick from: ${Object.keys(tools.tools()).join(', ')}`
          });
        }
      }

      this.status = SUBAGENT_STATUS.NEEDS_REVIEW;
      this.result = { status: 'needs_review', reason: `turn budget (${this.maxTurns}) exhausted` };
      this.emit(EVENTS.SUBAGENT_NEEDS_REVIEW, { reason: this.result.reason });
      return this.result;
    } catch (err) {
      if (this.interrupted) {
        return this._interrupted();
      }
      this.status = SUBAGENT_STATUS.FAILED;
      this.result = { status: 'failed', error: err.message };
      this.emit(EVENTS.SUBAGENT_FAILED, { error: err.message });
      return this.result;
    } finally {
      this.finishedAt = new Date();
      clearInterval(this.interval);
    }
  }

  _interrupted() {
    this.status = SUBAGENT_STATUS.NEEDS_REVIEW;
    this.result = { status: 'needs_review', reason: 'interrupted' };
    this.emit(EVENTS.SUBAGENT_NEEDS_REVIEW, { reason: 'interrupted' });
    return this.result;
  }

  interrupt() {
    this.interrupted = true;
    this.abortController.abort();
  }

  ledger(res) {
    this.assignment.ledger?.(res);
  }

  elapsedSecs() {
    if (!this.startedAt) return 0;
    const end = this.finishedAt || new Date();
    return Math.floor((end - this.startedAt) / 1000);
  }
}

export { Subagent as default };
