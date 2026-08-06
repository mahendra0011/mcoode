import { useEffect, useState } from 'react';
import { highlight } from 'cli-highlight';
import { TextAttributes } from '@opentui/core';
import { theme } from './theme.js';
import { BgBox } from './BgBox.jsx';

export const FRAMES = ['\u280b', '\u2819', '\u2839', '\u2838', '\u283c', '\u2834', '\u2826', '\u2827', '\u2823', '\u280f'];
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
    const id = setInterval(() => setF((x) => (x + 1) % FRAMES.length), 80);
    return () => clearInterval(id);
  }, []);
  return (
    <box flexDirection="row" paddingLeft={2} marginTop={1} flexShrink={0}>
      <text fg={theme.amber}>{FRAMES[f]} </text>
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

  return (
    <box flexDirection="column" marginTop={0} flexShrink={0} paddingLeft={1}>
      <text>
        <span fg={theme.dim}>{expanded ? '- ' : '+ '}</span>
        {live && <span fg={theme.green}>{SPIN_FRAMES[frame]} </span>}
        <span fg={theme.amber}>{label}</span>
      </text>
      {live && (
        <box marginTop={1} paddingLeft={1}>
          <text fg={theme.dim}>{text}<span fg={theme.amber}>{'\u2588'}</span></text>
        </box>
      )}
    </box>
  );
}

// ── Read Block ───────────────────────────────────────────────────
export function ReadBlock({ path, lines, expanded = false, onToggle = null, marginTop = 1, width = 100 }) {
  const pad = String(lines.length).length;
  const truncated = lines.length > READ_MAX;
  const display = expanded ? lines : lines.slice(0, READ_MAX);
  const body = display.map((line, i) => `${String(i + 1).padStart(pad)}  ${line || ' '}`);
  if (truncated) body.push(expanded ? '\u2026 collapse' : `\u2026 ${lines.length - READ_MAX} more lines`);
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.surface} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0}>
        <box flexDirection="row">
          <text fg={theme.teal}>{'\u25ce'} </text>
          <text fg={theme.dim}>Read </text>
          <text fg={theme.text}>{path}</text>
        </box>
        {body.map((line, i) => (
          <text key={i} fg={i === body.length - 1 && truncated ? theme.accentDim : theme.dim}>{line}</text>
        ))}
      </box>
    </box>
  );
}

// ── Write Block ──────────────────────────────────────────────────
export function WriteBlock({ path, lines, expanded = false, onToggle = null, marginTop = 1, width = 100 }) {
  const pad = String(lines.length).length;
  const truncated = lines.length > READ_MAX;
  const display = expanded ? lines : lines.slice(0, READ_MAX);
  const body = display.map((line, i) => `${String(i + 1).padStart(pad)}  ${line || ' '}`);
  if (truncated) body.push(expanded ? '\u2026 collapse' : `\u2026 ${lines.length - READ_MAX} more lines`);
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.surface} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0}>
        <box flexDirection="row">
          <text fg={theme.green}>{'\u270e'} </text>
          <text fg={theme.dim}>Wrote </text>
          <text fg={theme.text}>{path}</text>
        </box>
        {body.map((line, i) => (
          <text key={i} fg={i === body.length - 1 && truncated ? theme.accentDim : theme.dim}>{line}</text>
        ))}
      </box>
    </box>
  );
}

// ── Diff Block ───────────────────────────────────────────────────
export function DiffBlock({ path, lines, expanded = false, onToggle = null, marginTop = 1 }) {
  const padOld = Math.max(2, String(oldMax(lines)).length);
  const padNew = Math.max(2, String(newMax(lines)).length);
  const maxRows = 60;
  const truncated = lines.length > maxRows;
  const display = expanded ? lines : lines.slice(0, maxRows);
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.surface} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0}>
        <box flexDirection="row">
          <text fg={theme.amber}>{'\u270e'} </text>
          <text fg={theme.dim}>Edit </text>
          <text fg={theme.text}>{path}</text>
        </box>
        <box flexDirection="column" marginTop={1} paddingLeft={1}>
          {display.map((l, i) => {
            const isAdd = l.kind === 'add';
            const isRm = l.kind === 'remove';
            const op = isAdd ? '+' : isRm ? '-' : ' ';
            let code = l.text || ' ';
            if (!isAdd && !isRm) {
              try {
                code = highlight(code, { language: 'javascript', ignoreIllegals: true });
              } catch {}
            }
            return (
              <text key={i} fg={isAdd ? theme.diffGreen : isRm ? theme.diffRed : theme.text}
                bg={isAdd ? theme.diffGreenBg : isRm ? theme.diffRedBg : undefined}>
                {String(l.oldNo ?? '').padStart(padOld)} {String(l.newNo ?? '').padStart(padNew)} {op} {code}
              </text>
            );
          })}
          {truncated && (
            <text fg={theme.accentDim}>
              {expanded ? '\u2026 collapse' : `\u2026 ${lines.length - maxRows} more lines`}
            </text>
          )}
        </box>
      </box>
    </box>
  );
}

// ── Command Block ────────────────────────────────────────────────
export function CommandBlock({ title, relDir, command, output, expanded = false, onToggle = null, marginTop = 1 }) {
  const out = String(output || '').split('\n');
  const truncated = out.length > CMD_MAX;
  const display = expanded ? out : out.slice(0, CMD_MAX);
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.surface} borderStyle="round" borderColor={theme.divider} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0}>
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
      <box flexDirection="column" backgroundColor={theme.surface} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
        <box flexDirection="row">
          <text fg={theme.purple}>{'\u2630'} </text>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>Todos </text>
          <text fg={theme.dim}>{total ? `(${doneCount}/${total})` : ''}</text>
        </box>
        <box flexDirection="column" marginTop={1} paddingLeft={2}>
          {list.map((t, i) => (
            <text key={i}>
              <span fg={statusColor(t.status)}>{statusIcon(t.status)}</span>
              <span fg={theme.dim}> </span>
              <span fg={t.status === 'done' ? theme.dim : theme.text}>{t.title}</span>
            </text>
          ))}
          {truncated && <text fg={theme.muted}>{'\u2026'} {(items?.length || 0) - 12} more</text>}
          {allDone && (
            <box marginTop={1}>
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