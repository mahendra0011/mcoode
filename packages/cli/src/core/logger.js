let jsonMode = false;
let interactive = true;
let quiet = false;

export function setJsonMode(v) {
  jsonMode = v;
}

export function isJsonMode() {
  return jsonMode;
}

export function setInteractive(v) {
  interactive = v;
}

export function isInteractive() {
  return interactive;
}

export function setQuiet(v) {
  quiet = Boolean(v);
}

export function out(...parts) {
  if (jsonMode || quiet) return;
  process.stdout.write(parts.join(' ') + '\n');
}

export function ok(msg) {
  out(`\u2713 ${msg}`);
}

export function fail(msg) {
  out(`\u2717 ${msg}`);
}

export function info(msg) {
  out(`\u2022 ${msg}`);
}

export function warn(msg) {
  out(`\u26a0 ${msg}`);
}

export function json(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

export async function confirm(question, { defaultYes = false } = {}) {
  if (jsonMode || !interactive) return defaultYes;
  const { createInterface } = await import('node:readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultYes ? ' [Y/n] ' : ' [y/N] ';
  return new Promise((resolve) => {
    rl.question(question + suffix, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === '') resolve(defaultYes);
      else resolve(a === 'y' || a === 'yes');
    });
  });
}

export function table(rows, { columns } = {}) {
  if (jsonMode) return;
  if (!columns) return out(rows.map((r) => r.join('\t')).join('\n'));
  const widths = columns.map((c, i) =>
    Math.max(c.length, ...rows.map((r) => String(r[i] ?? '').length))
  );
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  out(line(columns));
  out(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) out(line(r));
}
