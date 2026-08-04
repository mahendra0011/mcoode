import { SUBAGENT_STATUS, EVENTS } from '@mcode/shared';
import { ToolExecutor } from './tools.js';

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

function parseAction(text) {
  const trimmed = String(text || '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.tool || parsed.done || parsed.blocked) return parsed;
  } catch {
    /* fall through to regex extraction */
  }
  const fenced = /```json\s*([\s\S]*?)```/.exec(trimmed);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) return { blocked: true, reason: 'model output was not JSON' };
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return { blocked: true, reason: 'model output was not valid JSON' };
  }
}

export class Subagent {
  constructor({ todo, assignment, projectPath, bus, undoStack, config = {}, onEvent = null }) {
    this.todo = todo;
    this.assignment = assignment; // { provider, model, ref }
    this.bus = bus;
    this.undoStack = undoStack;
    this.projectPath = projectPath;
    this.maxTurns = config.maxTurnsPerSubagent || 25;
    this.allowShellAll = config.allowShellAll || false;
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
    this.emit(EVENTS.SUBAGENT_STARTED, { model: this.assignment.ref, title: this.todo.title, domain: this.todo.domain, wave: this.todo.wave || 1 });
    this.startTimer();

    const tools = new ToolExecutor({
      projectPath: this.projectPath,
      bus: this.bus,
      undoStack: this.undoStack,
      allowShellAll: this.allowShellAll,
      domain: this.todo.domain,
      todoId: this.todo.id
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
        this.emit(EVENTS.SUBAGENT_STEP, { step: this.step, total: this.maxTurns, message: this.message });

        const res = await this.assignment.provider.complete(this.assignment.model.id, {
          messages: this.messages,
          temperature: 0.1
        });
        this.ledger?.(res);

        const action = parseAction(res.text);
        this.messages.push({ role: 'assistant', content: res.text });

        if (action.done) {
          this.message = `done — ${String(action.summary || '').slice(0, 80)}`;
          this.status = SUBAGENT_STATUS.DONE;
          this.result = { status: 'done', summary: action.summary, model: this.assignment.ref };
          this.emit(EVENTS.SUBAGENT_DONE, { summary: action.summary, model: this.assignment.ref, result: this.result });
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
          this.messages.push({
            role: 'user',
            content: `You are blocked (${action.reason}). Try a different approach or use another tool.`
          });
          continue;
        }

        if (action.tool && typeof tools[action.tool] === 'function') {
          this.message = `running ${action.tool}`;
          const toolResult = await tools.run(action.tool, action.args || {});
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
      this.status = SUBAGENT_STATUS.FAILED;
      this.result = { status: 'failed', error: err.message };
      this.emit(EVENTS.SUBAGENT_FAILED, { error: err.message });
      return this.result;
    } finally {
      this.finishedAt = new Date();
      clearInterval(this.interval);
    }
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
