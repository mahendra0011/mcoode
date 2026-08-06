import { useEffect, useState } from 'react';
import { highlight } from 'cli-highlight';
import { TextAttributes } from '@opentui/core';
import { theme } from './theme.js';
import { BgBox } from './BgBox.jsx';

export const FRAMES = ['\u280b', '\u2819', '\u2839', '\u2838', '\u283c', '\u2834', '\u2826', '\u2827', '\u2823', '\u280f'];
export const TOOL_VERBS = {
  read_file: 'Reading...',
  write_file: 'Writing...',
  edit_file: 'Writing...',
  run_shell: 'Running...',
  run_tests: 'Running...',
  list_files: 'Finding files...',
  search_code: 'Searching...',
  git_status: 'Checking...'
};
export const TOOL_LABELS = {
  read_file: 'Read', write_file: 'Wrote', edit_file: 'Edit',
  run_shell: 'Run', run_tests: 'Run tests', list_files: 'Glob', search_code: 'Grep',
  git_status: 'Git status'
};
export const READ_MAX = 15;
export const CMD_MAX = 10;

export function SpinnerBlock({ label }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setF((x) => (x + 1) % FRAMES.length), 90);
    return () => clearInterval(id);
  }, []);
  return (
    <box flexDirection="row" paddingLeft={2} marginTop={1} flexShrink={0}>
      <text fg={theme.amber}>{FRAMES[f]} </text>
      <text fg={theme.dim}>{label}</text>
    </box>
  );
}

export function ThoughtBlock({ text, seconds, live = false, expanded = false }) {
  const ms = Number(seconds);
  const label = live ? 'Thinking\u2026' : `Thought: ${Number.isFinite(ms) ? Math.round(ms * 1000) : 0}ms`;
  return (
    <box flexDirection="column" marginTop={0} flexShrink={0} paddingLeft={1}>
      <text>
        <span fg={theme.dim}>{expanded ? '- ' : '+ '}</span>
        <span fg={theme.amber}>{label}</span>
      </text>
      {live && (
        <box marginTop={1} paddingLeft={1}>
          <text fg={theme.dim}>{text}<span fg={theme.dim}>{'\u2588'}</span></text>
        </box>
      )}
    </box>
  );
}

export function ReadBlock({ path, lines, expanded = false, onToggle = null, marginTop = 1, width = 100 }) {
  const pad = String(lines.length).length;
  const truncated = lines.length > READ_MAX;
  const display = expanded ? lines : lines.slice(0, READ_MAX);
  const body = display.map((line, i) => `${String(i + 1).padStart(pad)}  ${line || ' '}`);
  if (truncated) body.push(expanded ? '\u2026 click to collapse' : `\u2026 ${lines.length - READ_MAX} more \u00b7 click to expand`);
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <BgBox width={width} bg={theme.bgMessage} fg={theme.text} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0} lines={[`\u25ce Read ${path}`, ...body]} />
    </box>
  );
}

export function WriteBlock({ path, lines, expanded = false, onToggle = null, marginTop = 1, width = 100 }) {
  const pad = String(lines.length).length;
  const truncated = lines.length > READ_MAX;
  const display = expanded ? lines : lines.slice(0, READ_MAX);
  const body = display.map((line, i) => `${String(i + 1).padStart(pad)}  ${line || ' '}`);
  if (truncated) body.push(expanded ? '\u2026 click to collapse' : `\u2026 ${lines.length - READ_MAX} more \u00b7 click to expand`);
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <BgBox width={width} bg={theme.bgMessage} fg={theme.text} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0} lines={[`\u270e Wrote ${path}`, ...body]} />
    </box>
  );
}

export function DiffBlock({ path, lines, expanded = false, onToggle = null, marginTop = 1 }) {
  const padOld = Math.max(2, String(oldMax(lines)).length);
  const padNew = Math.max(2, String(newMax(lines)).length);
  const maxRows = 60;
  const truncated = lines.length > maxRows;
  const display = expanded ? lines : lines.slice(0, maxRows);
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0}>
        <text fg={theme.dim}>{'\u270e'} Edit {path}</text>
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
            <text fg={theme.dim}>
              {expanded ? '\u2026 click to collapse' : `\u2026 ${lines.length - maxRows} more \u00b7 click to expand`}
            </text>
          )}
        </box>
      </box>
    </box>
  );
}

export function CommandBlock({ title, relDir, command, output, expanded = false, onToggle = null, marginTop = 1 }) {  const out = String(output || '').split('\n');
  const truncated = out.length > CMD_MAX;
  const display = expanded ? out : out.slice(0, CMD_MAX);
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.bgMessage} borderStyle="round" borderColor={theme.divider} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0}>
        {title ? <text fg={theme.dim}>{'\u25b8'} {title}</text>
          : relDir ? <text fg={theme.dim}>{'\u25b8'} Running in {relDir}</text> : null}
        {command ? <text fg={theme.text} attributes={TextAttributes.BOLD}>$ {command}</text> : null}
        {output && (
          <box flexDirection="column" marginTop={title || command ? 1 : 0}>
            {display.map((line, i) => <text key={i} fg={theme.dim}>{line || ' '}</text>)}
            {truncated && (
              <text fg={theme.dim}>
                {expanded ? '\u2026 click to collapse' : `\u2026 ${out.length - CMD_MAX} more \u00b7 click to expand`}
              </text>
            )}
          </box>
        )}
      </box>
    </box>
  );
}

export function TodoBlock({ items, marginTop = 1 }) {
  const list = (items || []).slice(0, 12);
  const truncated = (items?.length || 0) > 12;
  const total = items?.length || 0;
  const doneCount = (items || []).filter((t) => t.status === 'done').length;
  const allDone = total > 0 && doneCount === total;
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.bgMessage} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0}>
        <text fg={theme.dim}>{'\u2630'} Todos {total ? `(${doneCount}/${total})` : ''}</text>
        <box flexDirection="column" marginTop={1} paddingLeft={1}>
          {list.map((t, i) => (
            <text key={i}>
              <span fg={t.status === 'done' ? theme.diffGreen : t.status === 'running' ? theme.orange : t.status === 'failed' || t.status === 'interrupt' ? theme.red : t.status === 'paused' ? theme.orange : theme.dim}>
                {t.status === 'done' ? '\u2713' : t.status === 'running' ? '\u25cf' : t.status === 'failed' || t.status === 'interrupt' ? '\u2717' : t.status === 'paused' ? '\u25d0' : '\u25cb'}
              </span>
              <span fg={theme.dim}> {' '}</span>
              <span fg={t.status === 'done' ? theme.dim : theme.text}>{t.title}</span>
            </text>
          ))}
          {truncated && <text fg={theme.dim}>... {(items?.length || 0) - 12} more</text>}
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

export function InterruptBlock({ marginTop = 1 }) {
  return (
    <box backgroundColor={theme.bgMessage} paddingLeft={2} paddingRight={2} marginTop={marginTop} marginLeft={1} flexShrink={0}>
      <text fg={theme.red}>{'\u2717 Interrupted by user'}</text>
    </box>
  );
}

export function ErrorBlock({ reason, marginTop = 1 }) {
  return (
    <box flexDirection="column" backgroundColor={theme.bgMessage} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0} marginTop={marginTop} marginLeft={1} flexShrink={0}>
      <text fg={theme.red}>{'\u2717 Something went wrong: '}{reason}</text>
      <text fg={theme.dim}>Press r to retry</text>
    </box>
  );
}

export function PermissionBlock({ pending, approved = false, command, marginTop = 1 }) {
  return (
    <box flexDirection="column" backgroundColor={theme.bgMessage} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0} marginTop={marginTop} marginLeft={1} flexShrink={0}>
      {pending ? (
        <>
          <text fg={theme.orange}>{'? Allow running: '}<span fg={theme.text} attributes={TextAttributes.BOLD}>{command}</span></text>
          <text fg={theme.dim}>{'  (y/n/always)'}</text>
        </>
      ) : approved ? (
        <text fg={theme.green}>{'\u2713 Approved'}</text>
      ) : (
        <text fg={theme.red}>{'\u2717 Denied'}</text>
      )}
    </box>
  );
}

export function ChangeSummaryBlock({ files, marginTop = 1 }) {
  const list = files || [];
  const totalAdded = list.reduce((s, f) => s + (f.added || 0), 0);
  const totalRemoved = list.reduce((s, f) => s + (f.removed || 0), 0);
  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" backgroundColor={theme.bgMessage} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0}>
        <text fg={theme.diffGreen}>{'\u2713'} Changed {list.length} {list.length === 1 ? 'file' : 'files'}</text>
        <box flexDirection="column" marginTop={1} paddingLeft={1}>
          {list.map((f, i) => (
            <text key={i}>
              <span fg={theme.text}>{f.path}</span>
              <span fg={theme.dim}>{' '.repeat(Math.max(1, 24 - f.path.length))}</span>
              {f.created ? <span fg={theme.dim}>(new)</span>
                : <><span fg={theme.diffGreen}>+{f.added}</span><span fg={theme.dim}>/</span><span fg={theme.diffRed}>-{f.removed}</span></>}
            </text>
          ))}
        </box>
        {list.length > 1 && (
          <box marginTop={1} paddingLeft={1}>
            <text fg={theme.dim}>Total: </text>
            <text fg={theme.diffGreen}>+{totalAdded}</text>
            <text fg={theme.dim}>/</text>
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