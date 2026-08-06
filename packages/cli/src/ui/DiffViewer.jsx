import { useEffect, useState } from 'react';
import { useKeyboard } from '@opentui/react';
import { TextAttributes } from '@opentui/core';
import { theme } from './theme.js';
import { diffStats, gitDiff } from '../core/git.js';

export function DiffViewer({ width = 80, height = 30, cwd = process.cwd(), onBack = null }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({}); // file -> boolean

  useKeyboard((key) => {
    if (key.name === 'escape') onBack?.();
  });

  useEffect(() => {
    let cancelled = false;
    diffStats(cwd).then((list) => {
      if (!cancelled) {
        setFiles(list);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setFiles([]);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [cwd]);

  const toggle = (file) => setExpanded((e) => ({ ...e, [file]: !e[file] }));

  const totalAdded = files.reduce((s, f) => s + f.added, 0);
  const totalDeleted = files.reduce((s, f) => s + f.deleted, 0);

  return (
    <box
      position="absolute"
      width={width}
      height={height}
      flexDirection="column"
      backgroundColor={theme.panel}
      borderStyle="single"
      border
      borderColor={theme.accent}
      flexShrink={0}
    >
      <box
        flexDirection="row"
        justifyContent="space-between"
        paddingBottom={1}
        borderBottom={1}
        borderBottomColor={theme.divider}
        paddingLeft={2}
        paddingRight={2}
      >
        <text fg={theme.textBright} attributes={TextAttributes.BOLD}> Git Changes </text>
        <text fg={theme.muted}>esc close</text>
      </box>

      <box flexDirection="row" paddingLeft={2} paddingRight={2} paddingBottom={1}>
        <text fg={theme.green}>{`\u2261 ${totalAdded} lines added`}</text>
        <text fg={theme.dim}>{'  \u2502  '}</text>
        <text fg={theme.red}>{`\u2212 ${totalDeleted} lines removed`}</text>
      </box>

      {loading ? (
        <box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
          <text fg={theme.dim}>Scanning git changes…</text>
        </box>
      ) : (
        <scrollbox
          flexGrow={1}
          scrollY
          scrollX={false}
          rootOptions={{ flexDirection: 'column', width: width - 4 }}
          viewportOptions={{ flexGrow: 1 }}
          scrollbarOptions={{ visible: true }}
        >
          <box flexDirection="column" paddingLeft={1} paddingRight={1} paddingTop={1}>
            {files.length === 0 ? (
              <text fg={theme.muted}>No uncommitted changes</text>
            ) : (
              files.map((f) => (
                <box key={f.file} flexDirection="column" marginBottom={1}>
                  <box flexDirection="row" alignItems="center" paddingLeft={1} onMouseDown={() => toggle(f.file)}>
                    <text fg={theme.muted}>{expanded[f.file] ? '\u25bc' : '\u25b6'}</text>
                    <text fg={theme.dim}>{' '}</text>
                    <text fg={theme.textBright}>{String(f.file).slice(0, width - 20)}</text>
                    <box flexGrow={1} />
                    <text fg={theme.green}>{' +' + f.added} </text>
                    <text fg={theme.red}>{'-' + f.deleted}</text>
                    <text fg={theme.dim}>{'  [' + f.status + ']'}</text>
                  </box>
                  {expanded[f.file] && (
                    <ExpandedDiff file={f.file} cwd={cwd} width={width - 4} />
                  )}
                </box>
              ))
            )}
          </box>
        </scrollbox>
      )}
    </box>
  );
}

function ExpandedDiff({ file, cwd, width }) {
  const [diff, setDiff] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    gitDiff(cwd, file).then((text) => {
      if (!cancelled) {
        setDiff(text);
        setLoaded(true);
      }
    }).catch(() => {
      if (!cancelled) {
        setDiff('');
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [file, cwd]);

  if (!loaded) {
    return <text fg={theme.dim} paddingLeft={2}>loading diff…</text>;
  }

  if (!diff) {
    return <text fg={theme.muted} paddingLeft={2}>(no diff available)</text>;
  }

  return (
    <box flexDirection="column" marginTop={1} paddingLeft={2} paddingRight={1}>
      {diff.split('\n').map((line, i) => {
        const trimmed = line.slice(0, width - 2);
        if (line.startsWith('+') && !line.startsWith('+++')) {
          return <text key={i} fg={theme.green}>{trimmed}</text>;
        }
        if (line.startsWith('-') && !line.startsWith('---')) {
          return <text key={i} fg={theme.red}>{trimmed}</text>;
        }
        if (line.startsWith('@@')) {
          return <text key={i} fg={theme.blue}>{trimmed}</text>;
        }
        if (line.startsWith('diff') || line.startsWith('index')) {
          return <text key={i} fg={theme.muted}>{trimmed}</text>;
        }
        return <text key={i} fg={theme.dim}>{trimmed}</text>;
      })}
    </box>
  );
}
