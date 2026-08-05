import { normalizePlan, validatePlan, findCycle } from '@mcode/shared';

const PLAN_SYSTEM = `PLAN_JSON
You are mcode's planner. Turn the user's build request into a precise, dependency-ordered todo plan.

Respond with ONLY a JSON object (no markdown fence, no commentary) shaped like:
{
  "summary": "one-line summary of the build",
  "todos": [
    { "id": "t1", "title": "...", "description": "...", "domain": "db", "dependsOn": [] }
  ]
}

Rules:
- domain is one of: frontend | backend | db | devops | test | docs
- dependsOn lists ids that must finish first (empty array when none)
- split big work into 4-14 granular todos; each todo should be doable by one agent
- always include a test todo depending on the core implementation todos
- plan a fresh build unless the repo context shows an existing app to extend
- keep titles short (under 8 words)`;

const JSON_RE = /```json\s*([\s\S]*?)```|```\s*([\s\S]*?)```|^(\{[\s\S]*\})$/m;

export function parsePlanOutput(text) {
  const match = JSON_RE.exec(String(text || '').trim());
  const raw = match?.[1] || match?.[2] || match?.[3] || text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object found in planner output');
  return normalizePlan(JSON.parse(raw.slice(start, end + 1)));
}

export class Planner {
  constructor({ router, bus, modelDomain = 'planning' } = {}) {
    this.router = router;
    this.bus = bus;
    this.modelDomain = modelDomain;
  }

  async plan(prompt, { repoContext = '', model = null } = {}) {
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
      // fall back to the mock provider so planning never hard-fails
      const { MockProvider } = await import('../providers/mock.js');
      const mock = new MockProvider();
      raw = await mock.complete('mock', { messages: [{ role: 'user', content: user }] });
      this.bus?.emit('MESSAGE', { kind: 'planning', text: `planner model failed (${err.message}) — using mock plan` });
    }

    const plan = parsePlanOutput(raw.text);
    plan.prompt = prompt;
    plan.model = `${assignment.provider.id}:${assignment.model.id}`;
    const check = validatePlan(plan);
    if (!check.ok) throw new Error(check.error);
    const cycle = findCycle(plan);
    if (cycle) throw new Error(`todo dependency cycle detected at ${cycle}`);

    this.bus?.emit('PLAN_GENERATED', plan);
    return plan;
  }
}
