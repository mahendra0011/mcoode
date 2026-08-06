import { useEffect, useState } from 'react';
import { highlight } from 'cli-highlight';
import { TextAttributes } from '@opentui/core';
import { theme } from './theme.js';
import { BgBox } from './BgBox.jsx';

export const SPIN_FRAMES = ['\u25cf', '\u25d0', '\u25d3', '\u25d1', '\u25d2'];
export const TOOL_VERBS = {
  read_file: 'Reading…',
  write_file: 'Writing…',
  edit_file: 'Writing…',
  run_shell: 'Running…',
  run_tests: 'Running tests…',
  list_files: 'Finding files…',
  search_code: 'Searching…',
  git_status: 'Checking git…'
};
export const TOOL_LABELS = {
  read_file: 'Read', write_file: 'Wrote', edit_file: 'Edit',
  run_shell: 'Run', run_tests: 'Run tests', list_files: 'Glob', search_code: 'Grep',
  git_status: 'Git status'
};
export const READ_MAX = 15;
export const CMD_MAX = 10;

// ── Spinner ──────────────────────────────────────────────────────
export function SpinnerBlock({ label }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setF((x) => (x + 1) % SPIN_FRAMES.length), 80);
    return () => clearInterval(id);
  }, []);
  return (
    <box flexDirection="row" paddingLeft={2} marginTop={1} flexShrink={0}>
      <text fg={theme.amber}>{SPIN_FRAMES[f]} </text>
      <text fg={theme.dim}>{label}</text>
    </box>
  );
}

// ── Thought ──────────────────────────────────────────────────────
export function ThoughtBlock({ text, seconds, live = false, expanded = false }) {
  const [dots, setDots] = useState('');
  const [frame, setFrame] = useState(0);
  const ms = Number(seconds);
  const label = live
    ? `Thinking${dots}`
    : `Thought: ${Number.isFinite(ms) ? Math.round(ms * 1000) : 0}ms`;

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setDots((d) => d.length >= 3 ? '' : d + '.'), 400);
    const sid = setInterval(() => setFrame((x) => (x + 1) % SPIN_FRAMES.length), 120);
    return () => { clearInterval(id); clearInterval(sid); };
  }, [live]);

  const lines = (text || '').split('\n').filter(Boolean);
  const lastLineIdx = lines.length - 1;

  const parseLine = (l) => {
    // Replace markdown bullets/numbers with DAG-like arrows if they match
    let formatted = l;
    const match = l.match(/^(\s*)([-*]|\d+\.)\s(.*)/);
    if (match) {
      const indent = match[1];
      formatted = `${indent}\u2514\u2500\u203a ${match[3]}`;
    }
    return formatted;
  };

  return (
    <box flexDirection="column" marginTop={0} flexShrink={0} paddingLeft={1}>
      <text>
        <span fg={theme.dim}>{expanded ? '\u25be ' : '\u25b8 '}</span>
        {live && <span fg={theme.green}>{SPIN_FRAMES[frame]} </span>}
        <span fg={theme.amber}>{label}</span>
      </text>
      {(live || expanded) && (
        <box marginTop={1} paddingLeft={2} flexDirection="column" borderStyle="single" border={['left']} borderColor={theme.divider}>
          {lines.map((l, i) => (
            <text key={i} fg={theme.dim}>
              {parseLine(l)}{live && i === lastLineIdx ? <span fg={theme.amber}>{'\u2588'}</span> : ''}
            </text>
          ))}
        </box>
      )}
    </box>
  );
}

// ── Read Block ───────────────────────────────────────────────────
export function ReadBlock({ path, lines, expanded = false, marginTop = 1 }) {
  const pad = String(lines.length).length;
  const truncated = lines.length > READ_MAX;
  const display = expanded ? lines : lines.slice(0, READ_MAX);
  
  let highlighted = display;
  try {
    const ext = path.split('.').pop() || 'js';
    const joined = display.join('\n');
    const hl = highlight(joined, { language: ext, ignoreIllegals: true });
    highlighted = hl.split('\n');
  } catch { /* fallback to plain text */ }
  
  const crumbs = path.split('/').join(' \u203a ');

  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.surface} borderStyle="round" border borderColor={theme.divider} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0}>
        <box flexDirection="row" paddingBottom={1} borderStyle="single" border={['bottom']} borderColor={theme.divider}>
          <text fg={theme.teal}>{'\u25ce'} </text>
          <text fg={theme.dim}>Read </text>
          <text fg={theme.textBright}>{crumbs}</text>
        </box>
        <box flexDirection="column" marginTop={1} paddingLeft={1}>
          {highlighted.map((line, i) => (
            <box key={i} flexDirection="row">
              <text fg={theme.dim}>{String(i + 1).padStart(pad)} │ </text>
              <text>{line || ' '}</text>
            </box>
          ))}
          {truncated && (
            <box flexDirection="row" marginTop={1}>
              <text fg={theme.accentDim}>
                {expanded
                  ? '\u2026 press Esc to collapse'
                  : `\u2026 ${lines.length - READ_MAX} more lines (Tab \u2192 Enter to expand)`}
              </text>
            </box>
          )}
        </box>
      </box>
    </box>
  );
}

// ── Write Block ──────────────────────────────────────────────────
export function WriteBlock({ path, lines, expanded = false, marginTop = 1 }) {
  const pad = String(lines.length).length;
  const truncated = lines.length > READ_MAX;
  const display = expanded ? lines : lines.slice(0, READ_MAX);
  
  let highlighted = display;
  try {
    const ext = path.split('.').pop() || 'js';
    const joined = display.join('\n');
    const hl = highlight(joined, { language: ext, ignoreIllegals: true });
    highlighted = hl.split('\n');
  } catch { /* fallback to plain text */ }

  const crumbs = path.split('/').join(' \u203a ');

  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.surface} borderStyle="round" border borderColor={theme.divider} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0}>
        <box flexDirection="row" paddingBottom={1} borderStyle="single" border={['bottom']} borderColor={theme.divider}>
          <text fg={theme.green}>{'\u270e'} </text>
          <text fg={theme.dim}>Wrote </text>
          <text fg={theme.textBright}>{crumbs}</text>
        </box>
        <box flexDirection="column" marginTop={1} paddingLeft={1}>
          {highlighted.map((line, i) => (
            <box key={i} flexDirection="row">
              <text fg={theme.dim}>{String(i + 1).padStart(pad)} │ </text>
              <text>{line || ' '}</text>
            </box>
          ))}
          {truncated && (
            <box flexDirection="row" marginTop={1}>
              <text fg={theme.accentDim}>
                {expanded
                  ? '\u2026 press Esc to collapse'
                  : `\u2026 ${lines.length - READ_MAX} more lines (Tab \u2192 Enter to expand)`}
              </text>
            </box>
          )}
        </box>
      </box>
    </box>
  );
}

// ── Diff Block ───────────────────────────────────────────────────
export function DiffBlock({ path, lines, expanded = false, marginTop = 1 }) {
  const padOld = Math.max(2, String(oldMax(lines)).length);
  const padNew = Math.max(2, String(newMax(lines)).length);
  const maxRows = 60;
  const truncated = lines.length > maxRows;
  const display = expanded ? lines : lines.slice(0, maxRows);
  const crumbs = path.split('/').join(' \u203a ');
  const ext = path.split('.').pop() || 'js';

  const adds = lines.filter((l) => l.kind === 'add').length;
  const rms = lines.filter((l) => l.kind === 'remove').length;
  const isNew = adds > 0 && rms === 0 && lines.length === adds;
  const badge = isNew ? '[NEW]' : '[EDIT]';
  const badgeColor = isNew ? theme.teal : theme.amber;

  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.surface} borderStyle="round" border borderColor={theme.divider} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0}>
        <box flexDirection="row" paddingBottom={1} borderStyle="single" border={['bottom']} borderColor={theme.divider}>
          <text fg={badgeColor}>{badge} </text>
          <text fg={theme.textBright}>{crumbs}</text>
          <box flexGrow={1} />
          {adds > 0 && <text fg={theme.diffGreen}>+{adds} </text>}
          {rms > 0 && <text fg={theme.diffRed}>-{rms}</text>}
        </box>
        <box flexDirection="column" marginTop={1} paddingLeft={1}>
          {display.map((l, i) => {
            const isAdd = l.kind === 'add';
            const isRm = l.kind === 'remove';
            const op = isAdd ? '+' : isRm ? '-' : ' ';
            let code = l.text || ' ';
            try {
              code = highlight(code, { language: ext, ignoreIllegals: true });
            } catch { /* non-JS content */ }
            
            const isContext = !isAdd && !isRm;
            
            return (
              <box key={i} flexDirection="row" width="100%">
                <text fg={theme.dim}>{String(l.oldNo ?? '').padStart(padOld)} │ {String(l.newNo ?? '').padStart(padNew)} │ </text>
                <text fg={isAdd ? theme.diffGreen : isRm ? theme.diffRed : theme.dim}>
                  {op} 
                </text>
                <box flexGrow={1} backgroundColor={isAdd ? theme.diffGreenBg : isRm ? theme.diffRedBg : undefined}>
                  {isContext ? (
                    <text fg={theme.dim}>{l.text || ' '}</text>
                  ) : (
                    <text>{code}</text>
                  )}
                </box>
              </box>
            );
          })}
          {truncated && (
            <box flexDirection="row" marginTop={1}>
              <text fg={theme.accentDim}>
                {expanded
                  ? '\u2026 press Esc to collapse'
                  : `\u2026 ${lines.length - maxRows} more lines (Tab \u2192 Enter to expand)`}
              </text>
            </box>
          )}
        </box>
      </box>
    </box>
  );
}

// ── Command Block ────────────────────────────────────────────────
export function CommandBlock({ title, relDir, command, output, expanded = false, marginTop = 1 }) {
  const out = String(output || '').split('\n');
  const truncated = out.length > CMD_MAX;
  const display = expanded ? out : out.slice(0, CMD_MAX);
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.surface} borderStyle="round" border borderColor={theme.divider} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0}>
        {title ? (
          <box flexDirection="row">
            <text fg={theme.purple}>{'\u25b8'} </text>
            <text fg={theme.dim}>{title}</text>
          </box>
        ) : relDir ? (
          <box flexDirection="row">
            <text fg={theme.purple}>{'\u25b8'} </text>
            <text fg={theme.dim}>Running in </text>
            <text fg={theme.text}>{relDir}</text>
          </box>
        ) : null}
        {command ? (
          <box flexDirection="row" marginTop={title || relDir ? 0 : 0}>
            <text fg={theme.green}>$ </text>
            <text fg={theme.textBright} attributes={TextAttributes.BOLD}>{command}</text>
          </box>
        ) : null}
        {output && (
          <box flexDirection="column" marginTop={title || command ? 1 : 0}>
            {display.map((line, i) => <text key={i} fg={theme.dim}>{line || ' '}</text>)}
            {truncated && (
              <text fg={theme.accentDim}>
                {expanded ? '\u2026 collapse' : `\u2026 ${out.length - CMD_MAX} more lines`}
              </text>
            )}
          </box>
        )}
      </box>
    </box>
  );
}

// ── Todo Block ───────────────────────────────────────────────────
export function TodoBlock({ items, marginTop = 1 }) {
  const list = (items || []).slice(0, 12);
  const truncated = (items?.length || 0) > 12;
  const total = items?.length || 0;
  const doneCount = (items || []).filter((t) => t.status === 'done').length;
  const allDone = total > 0 && doneCount === total;

  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const filled = Math.round((percent / 100) * 20);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(20 - filled);

  const statusColor = (s) =>
    s === 'done' ? theme.diffGreen
    : s === 'running' ? theme.amber
    : s === 'failed' || s === 'interrupt' ? theme.red
    : s === 'paused' ? theme.orange
    : theme.muted;

  const statusIcon = (s) =>
    s === 'done' ? '\u2713'
    : s === 'running' ? '\u25cf'
    : s === 'failed' || s === 'interrupt' ? '\u2717'
    : s === 'paused' ? '\u25d0'
    : '\u25cb';

  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.surface} borderStyle="round" border borderColor={theme.divider} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0}>
        <box flexDirection="row" paddingBottom={1} borderStyle="single" border={['bottom']} borderColor={theme.divider}>
          <text fg={theme.purple}>{'\u2630'} </text>
          <text fg={theme.textBright} attributes={TextAttributes.BOLD}>Todos </text>
          {total > 0 && (
            <text fg={theme.dim}> {doneCount}/{total}  [{bar}] {percent}%</text>
          )}
        </box>
        <box flexDirection="column" marginTop={1} paddingLeft={1}>
          {list.map((t, i) => {
            const isSub = t.dependsOn && t.dependsOn.length > 0;
            return (
              <box key={i} flexDirection="row">
                {isSub && <text fg={theme.divider}> {'\u2514\u2500\u203a'} </text>}
                {!isSub && <text> </text>}
                <text fg={statusColor(t.status)}>{statusIcon(t.status)}</text>
                <text fg={theme.dim}> {t.id} </text>
                <text fg={theme.dim}>{t.domain ? `[${t.domain}] ` : ''}</text>
                <text fg={t.status === 'done' ? theme.dim : theme.text}>{t.title}</text>
                {t.dependsOn && t.dependsOn.length > 0 && (
                  <text fg={theme.dim}> (waits: {t.dependsOn.join(', ')})</text>
                )}
              </box>
            );
          })}
          {truncated && <box flexDirection="row"><text fg={theme.muted}>{'\u2026'} {(items?.length || 0) - 12} more</text></box>}
          {allDone && (
            <box marginTop={1} flexDirection="row">
              <text fg={theme.diffGreen}>{'\u2713'} All tasks completed</text>
            </box>
          )}
        </box>
      </box>
    </box>
  );
}

// ── Interrupt ────────────────────────────────────────────────────
export function InterruptBlock({ marginTop = 1 }) {
  return (
    <box flexDirection="row" backgroundColor={theme.surface} paddingLeft={2} paddingRight={2} marginTop={marginTop} marginLeft={1} flexShrink={0}>
      <text fg={theme.red}>{'\u2717'} </text>
      <text fg={theme.dim}>Interrupted by user</text>
    </box>
  );
}

// ── Error ────────────────────────────────────────────────────────
export function ErrorBlock({ reason, marginTop = 1 }) {
  return (
    <box flexDirection="column" backgroundColor={theme.surface} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} marginTop={marginTop} marginLeft={1} flexShrink={0}>
      <box flexDirection="row">
        <text fg={theme.red}>{'\u2717'} </text>
        <text fg={theme.red}>Something went wrong: </text>
        <text fg={theme.text}>{reason}</text>
      </box>
      <box marginTop={1}>
        <text fg={theme.dim}>Press </text>
        <text fg={theme.amber}>r</text>
        <text fg={theme.dim}> to retry</text>
      </box>
    </box>
  );
}

// ── Permission ───────────────────────────────────────────────────
export function PermissionBlock({ pending, approved = false, command, marginTop = 1 }) {
  return (
    <box flexDirection="column" backgroundColor={theme.surface} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0} marginTop={marginTop} marginLeft={1} flexShrink={0}>
      {pending ? (
        <>
          <box flexDirection="row">
            <text fg={theme.orange}>{'? '}</text>
            <text fg={theme.dim}>Allow running: </text>
            <text fg={theme.textBright} attributes={TextAttributes.BOLD}>{command}</text>
          </box>
          <box flexDirection="row" marginTop={0}>
            <text fg={theme.muted}>  </text>
            <text fg={theme.dim}>(</text>
            <text fg={theme.green}>y</text>
            <text fg={theme.dim}>/</text>
            <text fg={theme.red}>n</text>
            <text fg={theme.dim}>/</text>
            <text fg={theme.amber}>always</text>
            <text fg={theme.dim}>)</text>
          </box>
        </>
      ) : approved ? (
        <box flexDirection="row">
          <text fg={theme.green}>{'\u2713'} </text>
          <text fg={theme.dim}>Approved</text>
        </box>
      ) : (
        <box flexDirection="row">
          <text fg={theme.red}>{'\u2717'} </text>
          <text fg={theme.dim}>Denied</text>
        </box>
      )}
    </box>
  );
}

// ── Change Summary ───────────────────────────────────────────────
export function ChangeSummaryBlock({ files, marginTop = 1 }) {
  const list = files || [];
  const totalAdded = list.reduce((s, f) => s + (f.added || 0), 0);
  const totalRemoved = list.reduce((s, f) => s + (f.removed || 0), 0);
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.surface} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
        <box flexDirection="row">
          <text fg={theme.diffGreen}>{'\u2713'} </text>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>Changed {list.length} {list.length === 1 ? 'file' : 'files'}</text>
        </box>
        <box flexDirection="column" marginTop={1} paddingLeft={2}>
          {list.map((f, i) => (
            <text key={i}>
              <span fg={theme.text}>{f.path}</span>
              <span fg={theme.dim}>{' '.repeat(Math.max(1, 24 - f.path.length))}</span>
              {f.created ? <span fg={theme.teal}>(new)</span>
                : <><span fg={theme.diffGreen}>+{f.added}</span><span fg={theme.muted}>/</span><span fg={theme.diffRed}>-{f.removed}</span></>}
            </text>
          ))}
        </box>
        {list.length > 1 && (
          <box marginTop={1} paddingLeft={2} flexDirection="row">
            <text fg={theme.dim}>Total: </text>
            <text fg={theme.diffGreen}>+{totalAdded}</text>
            <text fg={theme.muted}>/</text>
            <text fg={theme.diffRed}>-{totalRemoved}</text>
          </box>
        )}
      </box>
    </box>
  );
}

function oldMax(lines) {
  let m = 0;
  for (const l of lines) m = Math.max(m, l.oldNo || 0);
  return m;
}
function newMax(lines) {
  let m = 0;
  for (const l of lines) m = Math.max(m, l.newNo || 0);
  return m;
}