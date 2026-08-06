import { useEffect, useState, useMemo } from 'react';
import { theme } from './theme.js';

const SPIN = ['\u25cf', '\u25d0', '\u25d3', '\u25d1', '\u25d2'];

const AGENT_MODE_ICONS = {
  'Build': '\u2692',
  'Edit': '\u270f',
  'Read': '\u{1F4D6}',
  'Notebook': '\u{1F4CB}',
  'Architect': '\u{1F3D7}'
};

const DOMAIN_COLORS = {
  frontend: theme.purple,
  backend: theme.blue,
  db: theme.amber,
  devops: theme.green,
  test: theme.cyan,
  docs: theme.muted
};

const DOMAIN_ICONS = {
  frontend: '\u{1F3A8}', // 🎨
  backend: '\u{2699}\u{FE0F}', // ⚙️
  db: '\u{1F6E2}\u{FE0F}', // 🛢️
  devops: '\u{1F680}', // 🚀
  test: '\u{1F9EA}', // 🧪
  docs: '\u{1F4DD}' // 📝
};

const AGENT_MODE_COLORS = {
  'Build': theme.blue,
  'Edit': theme.amber,
  'Read': theme.teal,
  'Notebook': theme.purple,
  'Architect': theme.green
};

const STATUS_META = {
  created: { icon: '\u23f3', color: theme.muted, label: 'queued' },
  queued: { icon: '\u23f3', color: theme.muted, label: 'queued' },
  pending: { icon: '\u23f3', color: theme.muted, label: 'queued' },
  running: { icon: SPIN[0], color: theme.green, spin: true, label: 'running' },
  done: { icon: '\u2713', color: theme.green, label: 'done' },
  failed: { icon: '\u2717', color: theme.red, label: 'failed' },
  needs_review: { icon: '\u26a0', color: theme.amber, label: 'review' }
};

function formatElapsed(ms) {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AgentStrip({ agents = [], selectedId = null, onSelect = null }) {
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(Date.now());
  const hasRunning = agents.some((a) => a.status === 'running');

  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [hasRunning]);

  // Also update clock every second for elapsed timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (agents.length === 0) return null;

  const pills = agents.map((a, i) => {
    const meta = STATUS_META[a.status] || STATUS_META.pending;
    const num = String(a.todoId || i + 1).replace(/\D/g, '') || String(i + 1);
    const icon = meta.spin ? SPIN[tick % SPIN.length] : meta.icon;
    const isSelected = a.todoId === selectedId;
    const domainColor = DOMAIN_COLORS[a.domain] || theme.text;
    const domainIcon = DOMAIN_ICONS[a.domain] || '';
    const modeIcon = AGENT_MODE_ICONS[a.mode] || '';
    const modeColor = AGENT_MODE_COLORS[a.mode] || theme.dim;
    const elapsed = a.startedAt ? formatElapsed(now - new Date(a.startedAt).getTime()) : '';
    const showDetails = isSelected || a.status === 'running';

    return (
      <box
        key={a.todoId || i}
        marginLeft={i === 0 ? 0 : 1}
        backgroundColor={isSelected ? theme.surfaceHover : undefined}
        paddingLeft={1}
        paddingRight={1}
        borderStyle={isSelected ? 'single' : undefined}
        border={isSelected ? ['bottom'] : undefined}
        borderColor={theme.accent}
      >
        <text fg={a.status === 'running' && tick % 2 === 0 ? theme.textBright : meta.color}>
          {icon}{' '}
        </text>
        <text fg={modeColor}>{modeIcon} </text>
        <text fg={a.status === 'running' && tick % 2 === 0 ? theme.textBright : meta.color}>{num}</text>
        
        {showDetails && (
          <>
            <text fg={domainColor}> [{domainIcon} {a.domain}]</text>
            {elapsed && <text fg={theme.dim}> {elapsed}</text>}
            {a.model && a.model !== '…' && (
              <text fg={theme.dim}> ({String(a.model).split(':').pop()})</text>
            )}
            {(a.tokens?.in > 0 || a.tokens?.out > 0) && (
              <text fg={theme.dim}> {a.tokens.in + a.tokens.out > 1000 ? `${Math.round((a.tokens.in + a.tokens.out) / 1000)}K` : a.tokens.in + a.tokens.out}t</text>
            )}
            {a.latency && (
              <text fg={theme.dim}> {Math.round(a.latency / 1000)}s</text>
            )}
            {a.message && a.status === 'running' && (
              <text fg={theme.dim}> · {String(a.message).slice(0, 20)}</text>
            )}
          </>
        )}
        {!showDetails && (
          <text fg={theme.dim}> {meta.label}</text>
        )}
      </box>
    );
  });

  const runningCount = agents.filter((a) => a.status === 'running').length;
  const doneCount = agents.filter((a) => a.status === 'done').length;
  const failedCount = agents.filter((a) => a.status === 'failed').length;

  return (
    <box flexDirection="row" paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={1} flexShrink={0}>
      <text fg={theme.muted}>agents </text>
      {pills}
      {(runningCount > 0 || doneCount > 0 || failedCount > 0) && (
        <text fg={theme.dim}>
          {' '}\u00b7
          {runningCount > 0 && <text fg={theme.green}> {runningCount}r </text>}
          {doneCount > 0 && <text fg={theme.green}> {doneCount}\u2713 </text>}
          {failedCount > 0 && <text fg={theme.red}> {failedCount}\u2717 </text>}
        </text>
      )}
    </box>
  );
}
