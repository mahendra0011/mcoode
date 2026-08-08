import { useMemo } from 'react';
import { theme, SPACING } from './theme.js';
import { useTicker } from './useTicker.js';
import { SPIN_FRAMES } from './blocks.jsx';

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
  running: { icon: SPIN_FRAMES[0], color: theme.green, spin: true, label: 'running' },
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
  const ticks = useTicker();
  const hasRunning = agents.some((a) => a.status === 'running');
  // tick advances ~every 960ms (12 ticks × 80ms) for 1s pulse granularity
  const tick = Math.floor(ticks / 12);
  const now = useMemo(() => Date.now(), [tick]);

  if (agents.length === 0) return null;

  const rows = agents.map((a, i) => {
    const meta = STATUS_META[a.status] || STATUS_META.pending;
    const icon = meta.spin ? SPIN_FRAMES[ticks % SPIN_FRAMES.length] : meta.icon;
    const modeText = a.mode ? `[${a.mode}]` : (a.domain ? `[${a.domain}]` : '[Explore]');
    const elapsed = a.startedAt ? formatElapsed(now - new Date(a.startedAt).getTime()) : '';
    const title = a.title || a.message || 'Investigate task';

    return (
      <box
        key={a.todoId || i}
        flexDirection="row"
        paddingLeft={SPACING.sm}
        paddingRight={SPACING.sm}
      >
        <text fg={theme.dim}>🤖 </text>
        <text fg={theme.textBright}>SubAgent </text>
        <text fg={theme.cyan}>{modeText} </text>
        <text fg={theme.dim}>· </text>
        <text fg={a.status === 'running' && tick % 2 === 0 ? theme.textBright : meta.color}>
          {icon}{' '}
        </text>
        <text fg={theme.dim}>{title} </text>
        <text fg={theme.muted}>#{a.todoId || (i + 1)}</text>
        {elapsed && a.status === 'running' && <text fg={theme.dim}> ({elapsed})</text>}
      </box>
    );
  });

  return (
    <box flexDirection="column" paddingLeft={SPACING.none} paddingRight={SPACING.none} paddingTop={SPACING.sm} paddingBottom={SPACING.sm} flexShrink={0}>
      {rows}
    </box>
  );
}
