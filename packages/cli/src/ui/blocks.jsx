import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { highlight } from 'cli-highlight';
import { theme } from './theme.js';

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
    <Box flexDirection="row" paddingLeft={3} marginTop={1} flexShrink={0}>
      <Text color={theme.dim}>{FRAMES[f]} {label}</Text>
    </Box>
  );
}

export function ThoughtBlock({ text, seconds, live = false }) {
  return (
    <Box flexDirection="column" marginTop={0} flexShrink={0} paddingLeft={1}>
      <Text>
        <Text color={theme.amber}>{live ? 'Thinking\u2026' : `Thought: ${Math.round(seconds * 1000)}ms`}</Text>
      </Text>
      {live && (
        <Box marginTop={1} paddingLeft={1}>
          <Text color={theme.dim}>{text}<Text color={theme.dim}>{'\u2588'}</Text></Text>
        </Box>
      )}
    </Box>
  );
}

export function ReadBlock({ path, lines, expanded = false, onToggle = null, marginTop = 1 }) {
  const pad = String(lines.length).length;
  const truncated = lines.length > READ_MAX;
  const display = expanded ? lines : lines.slice(0, READ_MAX);
  return (
    <Box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <Text color={theme.dim}># Read {path}</Text>
      <Box flexDirection="column" marginTop={1} paddingLeft={2}>
        {display.map((line, i) => (
          <Text key={i} color={theme.text}>
            <Text color={theme.dim}>{String(i + 1).padStart(pad)}  </Text>
            {line || ' '}
          </Text>
        ))}
        {truncated && (
          <Text color={theme.dim}>
            {expanded ? '\u2026 click to collapse' : `\u2026 ${lines.length - READ_MAX} more \u00b7 click to expand`}
          </Text>
        )}
      </Box>
    </Box>
  );
}

export function WriteBlock({ path, lines, expanded = false, onToggle = null, marginTop = 1 }) {
  const pad = String(lines.length).length;
  const truncated = lines.length > READ_MAX;
  const display = expanded ? lines : lines.slice(0, READ_MAX);
  return (
    <Box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <Text color={theme.dim}># Wrote {path}</Text>
      <Box flexDirection="column" marginTop={1} paddingLeft={2}>
        {display.map((line, i) => (
          <Text key={i} color={theme.text}>
            <Text color={theme.dim}>{String(i + 1).padStart(pad)}  </Text>
            {line || ' '}
          </Text>
        ))}
        {truncated && (
          <Text color={theme.dim}>
            {expanded ? '\u2026 click to collapse' : `\u2026 ${lines.length - READ_MAX} more \u00b7 click to expand`}
          </Text>
        )}
      </Box>
    </Box>
  );
}

export function DiffBlock({ path, lines, expanded = false, onToggle = null, marginTop = 1 }) {
  const padOld = Math.max(2, String(oldMax(lines)).length);
  const padNew = Math.max(2, String(newMax(lines)).length);
  const maxRows = 60;
  const truncated = lines.length > maxRows;
  const display = expanded ? lines : lines.slice(0, maxRows);
  return (
    <Box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <Text color={theme.dim}>{'\u2190'} Edit {path}</Text>
      <Box flexDirection="column" marginTop={1} paddingLeft={2}>
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
            <Text key={i} color={isAdd ? theme.diffGreen : isRm ? theme.diffRed : theme.text}
              backgroundColor={isAdd ? theme.diffGreenBg : isRm ? theme.diffRedBg : undefined}>
              {String(l.oldNo ?? '').padStart(padOld)} {String(l.newNo ?? '').padStart(padNew)} {op} {code}
            </Text>
          );
        })}
        {truncated && (
          <Text color={theme.dim}>
            {expanded ? '\u2026 click to collapse' : `\u2026 ${lines.length - maxRows} more \u00b7 click to expand`}
          </Text>
        )}
      </Box>
    </Box>
  );
}

export function CommandBlock({ title, relDir, command, output, expanded = false, onToggle = null, marginTop = 1 }) {  const out = String(output || '').split('\n');
  const truncated = out.length > CMD_MAX;
  const display = expanded ? out : out.slice(0, CMD_MAX);
  return (
    <Box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <Box flexDirection="column" borderStyle="round" borderColor={theme.divider} paddingX={1} paddingY={0}>
        {title ? <Text color={theme.dim}># {title}</Text>
          : relDir ? <Text color={theme.dim}># Running in {relDir}</Text> : null}
        {command ? <Text color={theme.text} bold>$ {command}</Text> : null}
        {output && (
          <Box flexDirection="column" marginTop={title || command ? 1 : 0}>
            {display.map((line, i) => <Text key={i} color={theme.dim}>{line || ' '}</Text>)}
            {truncated && (
              <Text color={theme.dim}>
                {expanded ? '\u2026 click to collapse' : `\u2026 ${out.length - CMD_MAX} more \u00b7 click to expand`}
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export function TodoBlock({ items, marginTop = 1 }) {
  const list = (items || []).slice(0, 12);
  const truncated = (items?.length || 0) > 12;
  return (
    <Box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <Text color={theme.dim}># Todos</Text>
      <Box flexDirection="column" marginTop={1} paddingLeft={2}>
        {list.map((t, i) => (
          <Text key={i}>
            <Text color={t.status === 'done' ? theme.diffGreen : t.status === 'running' ? theme.orange : t.status === 'failed' || t.status === 'interrupt' ? theme.red : t.status === 'paused' ? theme.orange : theme.dim}>
              {t.status === 'done' ? '\u2713' : t.status === 'running' ? '\u25cf' : t.status === 'failed' || t.status === 'interrupt' ? '\u2717' : t.status === 'paused' ? '\u25d0' : '\u25cb'}
            </Text>
            <Text color={theme.dim}> {' '}</Text>
            <Text color={t.status === 'done' ? theme.dim : theme.text}>{t.title}</Text>
          </Text>
        ))}
        {truncated && <Text color={theme.dim}>... {(items?.length || 0) - 12} more</Text>}
      </Box>
    </Box>
  );
}

export function InterruptBlock({ marginTop = 1 }) {
  return (
    <Box marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <Text color={theme.red}>{'\u2717 Interrupted by user'}</Text>
    </Box>
  );
}

export function ErrorBlock({ reason, marginTop = 1 }) {
  return (
    <Box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <Text color={theme.red}>{'\u2717 Something went wrong: '}{reason}</Text>
      <Text color={theme.dim}>Press r to retry</Text>
    </Box>
  );
}

export function PermissionBlock({ pending, approved = false, command, marginTop = 1 }) {
  return (
    <Box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      {pending ? (
        <>
          <Text color={theme.orange}>{'? Allow running: '}<Text bold color={theme.text}>{command}</Text></Text>
          <Text color={theme.dim}>{'  (y/n/always)'}</Text>
        </>
      ) : approved ? (
        <Text color={theme.green}>{'\u2713 Approved'}</Text>
      ) : (
        <Text color={theme.red}>{'\u2717 Denied'}</Text>
      )}
    </Box>
  );
}

export function ChangeSummaryBlock({ files, marginTop = 1 }) {
  const list = files || [];
  return (
    <Box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <Text color={theme.dim}># Changed {list.length} {list.length === 1 ? 'file' : 'files'}</Text>
      <Box flexDirection="column" marginTop={1} paddingLeft={2}>
        {list.map((f, i) => (
          <Text key={i}>
            <Text color={theme.text}>{f.path}</Text>
            <Text color={theme.dim}>{' '.repeat(Math.max(1, 24 - f.path.length))}</Text>
            {f.created ? <Text color={theme.dim}>(new)</Text>
              : <><Text color={theme.diffGreen}>+{f.added}</Text><Text color={theme.dim}>/</Text><Text color={theme.diffRed}>-{f.removed}</Text></>}
          </Text>
        ))}
      </Box>
    </Box>
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