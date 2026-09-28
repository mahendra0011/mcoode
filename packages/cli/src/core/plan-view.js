import { planWaves } from '@mcode/shared';

/**
 * MF-003: shared plan renderer for `god --dry-run` (and any other caller that
 * wants to show the DAG before it runs). Plain text so it works in the TTY,
 * the JSON mode (embedded string), and tests alike.
 *
 * @param {{ summary?: string, prompt?: string, todos: Array<any> }} plan
 * @param {{ header?: string|null, maxTodos?: number }} [opts]
 * @returns {string}
 */
export function renderPlan(plan, { header = null, maxTodos = Infinity } = {}) {
  const todos = plan?.todos || [];
  const waves = planWaves(plan || { todos });
  const domains = [...new Set(todos.map((t) => t.domain).filter(Boolean))];
  const lines = [];
  lines.push(header || `plan: ${todos.length} todos · ${waves.length} wave(s) · ${domains.length} domain(s) — dry run, nothing dispatched`);
  if (plan?.summary && plan.summary !== plan.prompt) lines.push(`  ${plan.summary}`);
  let shown = 0;
  for (const [i, wave] of waves.entries()) {
    if (shown >= maxTodos) break;
    lines.push(`  wave ${i + 1}:`);
    for (const todo of wave) {
      if (shown >= maxTodos) break;
      shown++;
      const files = (todo.files || []).join(', ') || '—';
      const deps = (todo.dependsOn || []).join(', ') || '—';
      lines.push(`    ${todo.id} [${todo.domain}] ${todo.title}`);
      lines.push(`      files: ${files}   deps: ${deps}`);
    }
  }
  if (shown < todos.length) lines.push(`    … ${todos.length - shown} more todo(s) hidden`);
  return lines.join('\n');
}