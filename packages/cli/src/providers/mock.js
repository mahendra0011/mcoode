import { ModelProvider } from '@mcode/shared';
import { TASK_DOMAINS } from '@mcode/shared';

/**
 * Mock provider — makes the entire pipeline (planner, router, subagents,
 * watch loop) runnable with zero API keys. Produces deterministic demo
 * output so the product can be exercised end-to-end before keys are added.
 */
export class MockProvider extends ModelProvider {
  constructor(options = {}) {
    super({ id: 'mock', displayName: 'Mock (no keys)', kind: 'local', ...options });
  }

  async probe() {
    return true;
  }

  listModels() {
    return [
      {
        id: 'mock',
        name: 'mock-planning',
        free: true,
        scores: Object.fromEntries(TASK_DOMAINS.map((d) => [d, 50]))
      }
    ];
  }

  _planForPrompt(prompt) {
    const p = String(prompt || '').toLowerCase();
    const has = (kw) => p.includes(kw);
    const todos = [];
    const add = (id, title, domain, dependsOn = []) => todos.push({ id, title, domain, dependsOn });
    if (has('frontend') || has('react') || has('dashboard') || has('ui') || has('web')) {
      add('t1', 'Frontend app shell (React + Tailwind)', 'frontend');
      add('t3', 'Interactive UI components', 'frontend', ['t1']);
    }
    if (has('backend') || has('api') || has('server') || has('auth') || has('postgres')) {
      if (!has('frontend') && !has('react')) add('t1', 'API server scaffold', 'backend');
      add('t2', 'Auth (JWT) + user model', 'backend', []);
      add('t4', 'Core business API routes', 'backend', ['t2']);
    }
    if (has('db') || has('postgres') || has('database') || has('mongo')) {
      add('t5', 'Database schema design', 'db', []);
      if (has('backend')) add('t6', 'Schema migration + seed', 'db', ['t5', 't4']);
    }
    if (has('ci') || has('docker') || has('deploy') || has('devops')) {
      add('t7', 'CI pipeline + Dockerfile', 'devops');
    }
    add('t8', 'Integration tests', 'test', todos.filter((t) => t.id !== 't8').map((t) => t.id));
    if (todos.length === 1) {
      todos.push({ id: 't2', title: `Implement "${prompt}"`, domain: 'backend', dependsOn: ['t1'] });
    }
    return {
      summary: `${String(prompt).slice(0, 80)} — planned by mock provider`,
      todos
    };
  }

  async complete(model, { messages } = {}) {
    const system = messages.find((m) => m.role === 'system')?.content || '';
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    let text = '';

    if (system.includes('PLAN_JSON')) {
      text = '```json\n' + JSON.stringify(this._planForPrompt(lastUser), null, 2) + '\n```';
    } else if (system.includes('SUBAGENT')) {
      if (lastUser.includes('TOOL RESULT')) {
        text = JSON.stringify({
          done: true,
          summary: `Mock subagent completed "${String(lastUser.split('TOOL RESULT')[0]).slice(0, 60)}" — wrote MOCK_RESULT.md (install real provider keys for model output)`
        });
      } else {
        // Derive a unique filename from the todo title to avoid overwrite conflicts
        // when multiple subagents run concurrently in the same project root.
        const taskTitle = String(lastUser || '').replace(/^Begin work on:\s*/, '').slice(0, 60);
        const safeName = taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'task';
        text = JSON.stringify({
          tool: 'write_file',
          args: {
            path: `MOCK_${safeName}.md`,
            content: `# Mock result\n\nTask: ${lastUser.slice(0, 120)}\n\n_(No API keys configured — install keys via \`mcode env add OPENROUTER_API_KEY sk-...\` for real model output.)_`
          }
        });
      }
    } else if (system.includes('IMPACT_ANALYSIS')) {
      text = JSON.stringify({ broken: false, reason: 'mock: no issue detected' });
    } else if (system.includes('BUGFIX')) {
      // echo the current file content back — the daemon verifies it, rewrites
      // the file, and records an auto-fix (mock has no real fix logic).
      const m = lastUser.match(/CURRENT CONTENT:\n```\n([\s\S]*?)```/);
      text = JSON.stringify({
        tool: 'write_file',
        args: {
          path: 'broken-file',
          content: m ? m[1].trim() : lastUser.slice(0, 500)
        }
      });
    } else {
      text = `Mock response to: ${lastUser.slice(0, 200)}`;
    }

    return {
      text,
      toolCall: null,
      usage: { inputTokens: 10, outputTokens: text.length / 4 },
      model,
      finishReason: 'stop'
    };
  }
}
