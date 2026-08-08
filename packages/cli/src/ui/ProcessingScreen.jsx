import { useEffect, useMemo, useState, useRef } from 'react';
import { useTicker } from './useTicker.js';
import { TextAttributes } from '@opentui/core';
import { theme, SPACING } from './theme.js';
import { SPIN_FRAMES } from './blocks.jsx';
import { useAnimatedProgress } from './useAnimatedProgress.js';

const CONTEXT_LIMIT = 200_000;
const BAR_WIDTH = 24;

function fmtElapsed(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtTokens(n) {
  if (!n) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function progressBar(filled, total = 100, width = BAR_WIDTH) {
  const pct = Math.max(0, Math.min(100, total === 0 ? 0 : (filled / total) * 100));
  const cells = Math.round((pct / 100) * width);
  const bar = '\u2588'.repeat(cells) + '\u2591'.repeat(width - cells);
  return bar;
}

function TodoRow({ t, isLast, status, runningAgent, failedAgent, frame, icon, color, dc, depColor }) {
  const [justCompleted, setJustCompleted] = useState(false);
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current !== 'done' && status === 'done') {
      setJustCompleted(true);
      const id = setTimeout(() => setJustCompleted(false), 400);
      return () => clearTimeout(id);
    }
    prevStatus.current = status;
  }, [status]);

  const step = runningAgent?.step || 0;
  const total = runningAgent?.totalSteps || 10;
  const pcts = total > 0 ? Math.round((step / total) * 100) : 0;
  
  const animatedPct = useAnimatedProgress(status === 'done' ? 100 : runningAgent ? pcts : 0);
  const bar = progressBar(animatedPct, 100, 12);

  const label = runningAgent
    ? `step ${step}/${total}`
    : status === 'done'
      ? 'done'
      : runningAgent?.message
        ? String(runningAgent.message).slice(0, 20)
        : 'queued';
  const prefix = isLast ? '\u2514\u2500\u2500' : '\u251c\u2500\u2500';
  const hasDeps = t.dependsOn && t.dependsOn.length > 0;
  const retryCount = failedAgent?.retryCount || 0;

  const bgProps = justCompleted ? { backgroundColor: theme.green } : {};
  const fgColor = justCompleted ? theme.textBright : color;
  const textAttr = justCompleted ? TextAttributes.BOLD : undefined;

  return (
    <box flexDirection="column" flexShrink={0} {...bgProps}>
      <box flexDirection="row" alignItems="center" marginBottom={SPACING.none} paddingTop={SPACING.none} paddingBottom={SPACING.none}>
        <text fg={depColor}>{prefix} </text>
        <text fg={fgColor} attributes={textAttr}>{icon} </text>
        <text fg={theme.text}>{String(t.id).padEnd(5)} </text>
        <text fg={dc}>[{String(t.domain).slice(0, 8).padEnd(8)}] </text>
        <text fg={theme.dim}>{bar} </text>
        <text fg={theme.dim}>{label}</text>
        {retryCount > 0 && (
          <text fg={theme.amber}>{'  '}\u21bb{retryCount}</text>
        )}
      </box>
      {hasDeps && (
        <text fg={theme.amber} paddingLeft={SPACING.lg} paddingTop={SPACING.none} paddingBottom={SPACING.none}>
          {'\u2502'} depends on: {t.dependsOn.join(', ')}
        </text>
      )}
    </box>
  );
}

export function ProcessingScreen({
  plan = null,
  waves = [],
  currentWave = 0,
  totalWaves = 0,
  completedWaves = [],
  todos = [],
  agents = [],
  elapsed = 0,
  contextTokens = 0,
  cost = 0,
  onInterrupt = null,
  height = 24
}) {
  const ticks = useTicker();
  const frame = ticks % SPIN_FRAMES.length;


  const statusColor = (s) => {
    if (s === 'done') return theme.diffGreen;
    if (s === 'failed' || s === 'interrupt') return theme.red;
    if (s === 'running') return theme.green;
    if (s === 'needs_review') return theme.amber;
    if (s === 'paused') return theme.orange;
    return theme.muted;
  };

  const statusIcon = (s) => {
    if (s === 'done') return '\u2713';
    if (s === 'failed' || s === 'interrupt') return '\u2717';
    if (s === 'running') return SPIN_FRAMES[frame];
    if (s === 'needs_review') return '\u26a0';
    if (s === 'paused') return '\u25d0';
    return '\u25cb';
  };

  // Build a flat list of all todos with their wave assignment
  const allTodos = useMemo(() => {
    if (plan?.todos) return plan.todos.map((t) => ({
      id: t.id,
      domain: t.domain,
      title: t.title,
      wave: t.wave || 1,
      dependsOn: t.dependsOn || [],
    }));
    const flat = [];
    waves.forEach((wave, wi) => {
      if (Array.isArray(wave)) {
        wave.forEach((t) => flat.push({ ...t, wave: wi + 1 }));
      }
    });
    return flat;
  }, [plan, waves]);

  // Build a quick status lookup
  const statusById = useMemo(() => {
    const m = new Map();
    todos.forEach((t) => m.set(t.id, t.status));
    allTodos.forEach((t) => {
      if (!m.has(t.id)) m.set(t.id, 'pending');
    });
    return m;
  }, [todos, allTodos]);

  // Compute wave progress
  const waveProgress = (waveTodos) => {
    if (!waveTodos || waveTodos.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = waveTodos.filter((t) => statusById.get(t.id) === 'done').length;
    const total = waveTodos.length;
    return { done, total, pct: Math.round((done / total) * 100) };
  };

  // Active domain color mapping — memoized to avoid recreating on every render
  const DOMAIN_COLOR_MAP = useMemo(() => ({
    planning: theme.purple,
    frontend: theme.blue,
    backend: theme.purple,
    db: theme.amber,
    devops: theme.gray,
    test: theme.teal,
    docs: theme.green,
    bugfix: theme.red,
  }), []);

  const domainColor = (domain) => DOMAIN_COLOR_MAP[domain] || theme.dim;

  const totalTodos = allTodos.length;
  const doneTodos = allTodos.filter((t) => statusById.get(t.id) === 'done').length;
  const failedTodos = allTodos.filter((t) => statusById.get(t.id) === 'failed').length;

  // Memoized agent lookup to avoid O(n) .find() on every render
  const agentByTodoId = useMemo(() => {
    const m = new Map();
    agents.forEach((a) => m.set(a.todoId, a));
    return m;
  }, [agents]);

  // Render the wave DAG section
  const renderWaves = () => {
    const sections = [];
    for (let wi = 0; wi < totalWaves; wi++) {
      const waveNum = wi + 1;
      const waveTodos = allTodos.filter((t) => t.wave === waveNum);
      const waveDone = waveProgress(waveTodos);
      const isActive = waveNum === currentWave && currentWave > 0;
      const isPast = completedWaves.includes(waveNum) || (currentWave > 0 && waveNum < currentWave);
      const isUpcoming = !isActive && !isPast;

      const dot = isActive ? SPIN_FRAMES[frame] : isPast ? '\u2713' : '\u25cb';
      const dotColor = isActive ? theme.green : isPast ? theme.diffGreen : theme.muted;

      const animatedWavePct = useAnimatedProgress(waveDone.pct);

      sections.push(
        <box key={`wave-${waveNum}`} flexDirection="column" marginTop={SPACING.sm} flexShrink={0}>
          <box flexDirection="row" alignItems="center" marginBottom={SPACING.sm}>
            <text fg={dotColor}>{dot} </text>
            <text fg={isActive ? theme.textBright : isPast ? theme.green : theme.muted}
              attributes={isActive ? TextAttributes.BOLD : undefined}>
              Wave {waveNum}/{totalWaves}
            </text>
            <text fg={theme.dim}>{'  '}\u2502{'  '}</text>
            <text fg={theme.dim}>{progressBar(animatedWavePct, 100, 10)}</text>
            <text fg={theme.dim}> {waveDone.done}/{waveDone.total}</text>
          </box>

          {isActive && (
            <box flexDirection="column" paddingLeft={SPACING.md} flexShrink={0}>
            {waveTodos.map((t, ti) => {
              const status = statusById.get(t.id) || 'pending';
              const runningAgent = agentByTodoId.get(t.id);
              const icon = statusIcon(status);
              const color = statusColor(status);
              const isLast = ti === waveTodos.length - 1;
              const hasDeps = t.dependsOn && t.dependsOn.length > 0;
              const depColor = hasDeps ? theme.amber : theme.divider;
              const failedAgent = agentByTodoId.get(t.id);
              const dc = domainColor(t.domain);

              return (
                <TodoRow
                  key={t.id}
                  t={t}
                  isLast={isLast}
                  status={status}
                  runningAgent={runningAgent}
                  failedAgent={failedAgent}
                  frame={frame}
                  icon={icon}
                  color={color}
                  dc={dc}
                  depColor={depColor}
                />
              );
            })}
            </box>
          )}
        </box>
      );
    }

    // Integration / bugfix phase
    if (currentWave === totalWaves && doneTodos + failedTodos >= totalTodos) {
      sections.push(
        <box key="integration" flexDirection="column" marginTop={SPACING.sm} flexShrink={0}>
          <box flexDirection="row" alignItems="center" marginBottom={SPACING.sm}>
            <text fg={theme.amber}>{SPIN_FRAMES[frame]} </text>
            <text fg={theme.textBright} attributes={TextAttributes.BOLD}>Verification </text>
            <text fg={theme.dim}>{progressBar(0, 100, 14)}</text>
          </box>
          <box flexDirection="column" paddingLeft={SPACING.md} flexShrink={0}>
            <box flexDirection="row">
              <text fg={theme.dim}>integration tests</text>
              <text fg={theme.dim}>{' '}\u2502{' '}</text>
              <text fg={theme.amber}>running...</text>
            </box>
          </box>
        </box>
      );
    }

    return sections;
  };

  const contextPct = Math.round((contextTokens / CONTEXT_LIMIT) * 100);
  const animatedContextPct = useAnimatedProgress(contextPct);
  const contextBar = progressBar(animatedContextPct, 100, 20);

  const timeLabel = fmtElapsed(elapsed);

  // ETA: estimate remaining time based on progress ratio
  const progressPct = totalTodos > 0 ? Math.round(((doneTodos + failedTodos) / totalTodos) * 100) : 0;
  let etaLabel = '';
  if (progressPct > 0 && progressPct < 100) {
    const elapsedSecs = elapsed;
    const totalEstimated = (elapsedSecs / progressPct) * 100;
    const remaining = Math.max(0, totalEstimated - elapsedSecs);
    etaLabel = ` \u00b7 ETA ${fmtElapsed(remaining * 1000)}`;
  }
  const costLabel = `$${Number(cost).toFixed(2)}`;

  return (
    <box
      position="absolute"
      width="100%"
      height={height}
      flexDirection="column"
      backgroundColor={theme.bg}
      flexShrink={0}
    >
      {/* Header */}
      <box flexDirection="row" alignItems="center" paddingLeft={SPACING.sm} paddingRight={SPACING.sm} paddingTop={SPACING.sm} paddingBottom={SPACING.sm}
        borderStyle="single" border={['bottom']} borderColor={theme.divider}>
        <text fg={theme.amber}>{'\u25b8 '}</text>
        <text fg={theme.textBright} attributes={TextAttributes.BOLD}>God Mode </text>
        <text fg={theme.dim}>building your project</text>
        <box flexGrow={1} />
        {onInterrupt && (
          <text fg={theme.red}>esc </text>
        )}
        <text fg={theme.dim}>to cancel</text>
      </box>

      {/* Wave DAG */}
      <box flexDirection="column" flexGrow={1} paddingLeft={SPACING.sm} paddingRight={SPACING.sm} marginTop={SPACING.sm} overflow="hidden">
        {renderWaves()}
      </box>

      {/* Context / Metrics footer */}
      <box flexDirection="row" justifyContent="space-between"
        paddingLeft={SPACING.sm} paddingRight={SPACING.sm} paddingTop={SPACING.sm} paddingBottom={SPACING.sm}
        borderStyle="single" border={['top']} borderColor={theme.divider}>
        <box flexDirection="row" alignItems="center">
          <text fg={theme.dim}>Context: </text>
          <text fg={theme.text}>{fmtTokens(contextTokens)}</text>
          <text fg={theme.dim}> / </text>
          <text fg={theme.text}>{fmtTokens(CONTEXT_LIMIT)}</text>
          <text fg={theme.dim}>{'  '}{contextBar} </text>
          <text fg={theme.dim}>{contextPct}%</text>
        </box>
        <box flexDirection="row" alignItems="center">
          <text fg={theme.dim}>Cost: </text>
          <text fg={theme.green}>{costLabel}</text>
          <text fg={theme.dim}>{'  \u2502  '}</text>
          <text fg={theme.dim}>Time: </text>
          <text fg={theme.amber}>{timeLabel}</text>
          {etaLabel && <text fg={theme.dim}>{etaLabel}</text>}
          <text fg={theme.dim}>{'  \u2502  '}</text>
          <text fg={theme.dim}>{progressPct}%</text>
          <text fg={theme.dim}>{'  \u2502  '}</text>
          <text fg={theme.dim}>{doneTodos}/{totalTodos} done</text>
          {failedTodos > 0 && <text fg={theme.red}>{'  \u2502  '}{failedTodos} failed</text>}
        </box>
      </box>
    </box>
  );
}
