import { normalizePlan, validatePlan, findCycle } from '@mcode/shared';
import { z } from 'zod';

const PlanSchema = z.object({
  summary: z.string(),
  todos: z.array(z.object({
    id: z.string(),
    title: z.string(),
    domain: z.string(),
    dependsOn: z.array(z.string()),
    files: z.array(z.string()),
  })),
});

const PLAN_SYSTEM = `PLAN_JSON
You are mcode's planner. Turn the user's build request into a precise, dependency-ordered todo plan.

Respond with ONLY a JSON object (no markdown fence, no commentary) shaped like:
{
  "summary": "one-line summary of the build",
  "todos": [
    { "id": "t1", "title": "...", "description": "...", "domain": "db", "dependsOn": [], "files": ["src/db.ts"] }
  ]
}

Rules:
- domain is one of: frontend | backend | db | devops | test | docs
- dependsOn lists ids that must finish first (empty array when none)
- files lists the paths this todo will likely create or modify (relative, no leading ./)
- if two todos touch the same file, make one depend on the other — never let two todos share a file
- split big work into 4-14 granular todos; each todo should be doable by one agent
- always include a test todo depending on the core implementation todos
- plan a fresh build unless the repo context shows an existing app to extend
- keep titles short (under 8 words)`;

const JSON_RE = /```json\s*([\s\S]*?)```|```\s*([\s\S]*?)```|^(\{[\s\S]*\})$/m;

export function parsePlanOutput(text) {
  const match = JSON_RE.exec(String(text || '').trim());
  const raw = match?.[1] || match?.[2] || match?.[3] || text;
  const start = raw.indexOf('{');
  if (start === -1) throw new Error('no JSON object found in planner output');

  let inString = false;
  let escape = false;
  let depth = 0;
  let end = -1;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
  }

  if (end !== -1) {
    try {
      return normalizePlan(JSON.parse(raw.slice(start, end + 1)));
    } catch {}
  }

  // Fallback: search backwards from last closing brace
  const lastBrace = raw.lastIndexOf('}');
  if (lastBrace > start) {
    try {
      return normalizePlan(JSON.parse(raw.slice(start, lastBrace + 1)));
    } catch {}
  }

  throw new Error('no valid JSON object found in planner output');
}

export class Planner {
  /**
   * @param {object} [opts]
   * @param {any} [opts.router]
   * @param {{ on: Function, off: Function, emit: (event: string, payload?: any) => void }|null} [opts.bus]
   * @param {string} [opts.modelDomain]
   */
  constructor({ router, bus, modelDomain = 'planning' } = {}) {
    this.router = router;
    this.bus = bus;
    this.modelDomain = modelDomain;
  }

  /**
   * @param {string} prompt
   * @param {object} [opts]
   * @param {string} [opts.repoContext]
   * @param {any} [opts.model]
   * @param {string} [opts.projectPath]
   */
  async plan(prompt, { repoContext = '', model = null, projectPath = null } = {}) {
    let assignment = model;
    if (!assignment) {
      assignment = await this.router?.pick(this.modelDomain);
      if (!assignment) {
        throw new Error('no planning model available — add a provider key or use the mock provider');
      }
    }
    this.bus?.emit('MESSAGE', {
      kind: 'planning',
      text: `planning with ${assignment.provider.id}:${assignment.model.id}...`
    });

    const user = repoContext
      ? `PROJECT CONTEXT (existing code to extend):\n${repoContext}\n\nBUILD REQUEST:\n${prompt}`
      : `BUILD REQUEST (fresh project):\n${prompt}`;

    let raw;
    try {
      raw = await assignment.provider.complete(assignment.model.id, {
        messages: [
          { role: 'system', content: PLAN_SYSTEM },
          { role: 'user', content: user }
        ],
        temperature: 0.2,
        reasoning: this.router?.reasoning || null
      });
    } catch (err) {
      this.bus?.emit('MESSAGE', { kind: 'planning', text: `planner model failed: ${err.message}` });
      throw new Error(`planning failed: ${err.message}`);
    }

    const plan = parsePlanOutput(raw.text);
    plan.prompt = prompt;
    plan.model = `${assignment.provider.id}:${assignment.model.id}`;
    const parsed = PlanSchema.safeParse(plan);
    if (!parsed.success) {
      throw new Error(`plan output has invalid shape: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    }
    const check = validatePlan(plan);
    if (!check.ok) throw new Error(check.error);
    const cycle = findCycle(plan);
    if (cycle) throw new Error(`todo dependency cycle detected at ${cycle}`);

    this.bus?.emit('PLAN_GENERATED', plan);
    return plan;
  }
}
