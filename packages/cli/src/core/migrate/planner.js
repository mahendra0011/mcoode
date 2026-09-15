import { normalizePlan, validatePlan, findCycle } from '@mcode/shared';
import { parsePlanOutput } from '../planner.js';

const MIGRATE_PLAN_SYSTEM = `MIGRATE_PLAN_JSON
You are mcode's migration planner. Your job is to plan a large structural transformation
where the external behavior must remain 100% IDENTICAL (behavioral equivalence).
Examples: React 18->19, JS->TypeScript conversion, swapping libraries, refactoring architecture.

Respond with ONLY a JSON object (no markdown fence, no commentary) shaped like:
{
  "summary": "one-line summary of the migration",
  "todos": [
    {
      "id": "t1",
      "title": "short title under 8 words",
      "description": "what to transform AND explicitly what behavior must remain identical",
      "domain": "migration",
      "dependsOn": [],
      "files": ["src/index.ts"]
    }
  ]
}

Rules:
- domain should be 'migration' for transformation todos
- For EACH todo, clearly state what must remain behaviorally identical
- dependsOn lists ids that must finish first
- files lists the paths this todo will modify or create
- split the work into clear, file-by-file or component-by-component granular todos
- ensure all todos preserve existing public APIs, interfaces, return types, and side effects`;

/**
 * Plans a migration workflow tailored to preserving behavioral equivalence.
 *
 * @param {string} prompt
 * @param {{
 *   projectPath?: string,
 *   repoContext?: string,
 *   router?: object,
 *   bus?: object
 * }} options
 * @returns {Promise<object>} The validated plan
 */
export async function planMigration(prompt, { projectPath = process.cwd(), repoContext = '', router, bus } = {}) {
  let assignment = null;
  if (router) {
    try {
      // Pick model with migration domain
      assignment = await router.pick('migration');
    } catch {
      try {
        assignment = await router.pick('planning');
      } catch {
        assignment = null;
      }
    }
  }

  bus?.emit('MIGRATE_STATUS', {
    stage: 'planning',
    message: assignment
      ? `planning migration (domain: migration with ${assignment.provider.id}:${assignment.model.id})...`
      : 'planning migration (domain: migration)...'
  });

  const user = repoContext
    ? `PROJECT CONTEXT:\n${repoContext}\n\nMIGRATION REQUEST:\n${prompt}`
    : `MIGRATION REQUEST:\n${prompt}`;

  let raw;
  if (assignment?.provider) {
    try {
      raw = await assignment.provider.complete(assignment.model.id, {
        messages: [
          { role: 'system', content: MIGRATE_PLAN_SYSTEM },
          { role: 'user', content: user }
        ],
        temperature: 0.1,
        reasoning: router?.reasoning || null
      });
    } catch (err) {
      bus?.emit('MIGRATE_STATUS', {
        stage: 'planning-warn',
        message: `migration planner model failed (${err.message}) — using heuristic migration plan`
      });
      raw = null;
    }
  }

  let plan;
  if (raw?.text) {
    try {
      plan = parsePlanOutput(raw.text);
    } catch {
      plan = null;
    }
  }

  // Fallback heuristic migration plan if model output is unavailable
  if (!plan || !Array.isArray(plan.todos) || plan.todos.length === 0) {
    plan = {
      summary: `Migration: ${prompt}`,
      todos: [
        {
          id: 'mig-t1',
          title: 'Prepare configuration and dependencies',
          description: `Set up configs and dependencies for: ${prompt}. Retain all existing package entry points and public contracts.`,
          domain: 'migration',
          dependsOn: [],
          files: ['package.json']
        },
        {
          id: 'mig-t2',
          title: 'Transform core modules',
          description: `Migrate core application modules for: ${prompt}. Ensure exports, signatures, and runtime behavior remain identical.`,
          domain: 'migration',
          dependsOn: ['mig-t1'],
          files: []
        },
        {
          id: 'mig-t3',
          title: 'Update references and test integration',
          description: `Update call sites and verify that behavior exactly matches baseline without regressions.`,
          domain: 'migration',
          dependsOn: ['mig-t2'],
          files: []
        }
      ]
    };
  }

  plan.prompt = prompt;
  plan.domain = 'migration';

  // Ensure all migration todos have domain: 'migration'
  for (const todo of plan.todos) {
    todo.domain = 'migration';
  }

  const check = validatePlan(plan);
  if (!check.ok) {
    // Attempt normalization
    plan = normalizePlan(plan);
  }

  const cycle = findCycle(plan);
  if (cycle) {
    // If cycle found, break it by clearing dependsOn on the cycle node
    for (const todo of plan.todos) {
      if (todo.id === cycle) {
        todo.dependsOn = [];
      }
    }
  }

  bus?.emit('MIGRATE_PLAN_GENERATED', plan);
  return plan;
}
