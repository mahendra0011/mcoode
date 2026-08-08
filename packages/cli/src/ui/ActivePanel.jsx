import { useEffect, useRef, useState } from 'react';
import { TextAttributes } from '@opentui/core';
import { theme, SPACING } from './theme.js';
import { SPIN_FRAMES as SPIN } from './blocks.jsx';
import { useTicker } from './useTicker.js';
import { useEntrance } from './useEntrance.js';

const MAX_LINES = 24;

const STATUS_LABEL = {
  created: 'queued',
  queued: 'queued',
  pending: 'queued',
  running: 'working',
  done: '\u2713 done',
  failed: '\u2717 failed',
  needs_review: '\u26a0 review'
};

const TABS = ['files', 'diff', 'logs', 'metrics'];

export function ActivePanel({ agents = [], files = {}, selectedId = null, pinned = false, onTogglePin = null, onSelect = null, onClose = null }) {
  const [tab, setTab] = useState('files');
  const prevFileKey = useRef(null);
  const ticks = useTicker();

  const agent = agents.find((a) => a.todoId === selectedId) || agents[0];
  const fileList = (files[agent?.todoId] || []).slice(0, 5);
  const current = fileList[fileList.length - 1] || null;
  const key = `${agent?.todoId}-${current?.file || 'none'}-${current?.lines?.length || 0}`;

  useEffect(() => {
    if (key !== prevFileKey.current) {
      prevFileKey.current = key;
      setTab('files');
    }
  }, [key]);

  if (!agent) return null;

  const lines = (current?.lines || []).slice(0, MAX_LINES);
  // Progressive reveal via shared ticker (~14ms/line equivalent using fractional ticksPerItem)
  const visibleCount = useEntrance(lines.length, 0.175, key);
  const shown = lines.slice(0, visibleCount);
  const running = agent.status === 'running';
  // Spinner cycle via shared ticker (160ms cycle = 2 ticks)
  const spinFrame = ticks % SPIN.length;
  const meta = agent.model ? `${agent.domain} \u00b7 ${String(agent.model).split(':').pop()}` : agent.domain;

  const renderTabContent = () => {
    switch (tab) {
      case 'files':
        return (
          <box flexDirection="column" flexGrow={1} overflow="hidden">
            {current ? (
              <>
                <box flexDirection="row" flexShrink={0}>
                  <text fg={theme.teal}>{'\u25ce'} </text>
                  <text fg={theme.text}>{current.file}</text>
                  {current.created && <text fg={theme.teal}> (new)</text>}
                </box>
                <box flexDirection="column" marginTop={SPACING.sm} flexGrow={1} overflow="hidden" paddingLeft={SPACING.sm}>
                  {shown.map((l, i) => {
                    const isAdd = l.kind === 'add';
                    const isRm = l.kind === 'remove';
                    const op = isAdd ? '+' : isRm ? '-' : ' ';
                    return (
                      <text key={i} fg={isAdd ? theme.diffGreen : isRm ? theme.diffRed : theme.muted}
                        bg={isAdd ? theme.diffGreenBg : isRm ? theme.diffRedBg : undefined}>
                        {op} {l.text || ' '}
                      </text>
                    );
                  })}
                  {visibleCount < lines.length && <text fg={theme.green}>{'\u25ae'} streaming...</text>}
                  {(current.lines || []).length > MAX_LINES && (
                    <text fg={theme.muted}>{'\u2026'} {(current.lines || []).length - MAX_LINES} more</text>
                  )}
                </box>
              </>
            ) : (
              <text fg={theme.dim}>{running ? `${SPIN[spinFrame]} thinking...` : 'no file activity'}</text>
            )}
          </box>
        );

      case 'diff':
        return (
          <box flexDirection="column" flexGrow={1} overflow="hidden">
            <text fg={theme.dim}>diff summary</text>
            <box flexDirection="column" marginTop={SPACING.sm} flexGrow={1} overflow="hidden" paddingLeft={SPACING.sm}>
              {fileList.length === 0 ? (
                <text fg={theme.muted}>no changes yet</text>
              ) : (
                fileList.map((f, i) => (
                  <box key={i} flexDirection="row" marginBottom={SPACING.sm}>
                    <text fg={f.created ? theme.diffGreen : theme.diffRed}>
                      {f.created ? '+' : '~'} {String(f.file || '').split('/').pop()}
                    </text>
                    <text fg={theme.dim}> ({f.lines?.length || 0} lines)</text>
                  </box>
                ))
              )}
            </box>
          </box>
        );

      case 'logs':
        return (
          <box flexDirection="column" flexGrow={1} overflow="hidden">
            <text fg={theme.dim}>agent logs</text>
            <box flexDirection="column" marginTop={SPACING.sm} flexGrow={1} overflow="hidden" paddingLeft={SPACING.sm}>
              <text fg={theme.muted}>step: {agent.step || 0}/{agent.totalSteps || '?'}</text>
              <text fg={theme.muted}>message: {agent.message || '—'}</text>
              {agent.startedAt && (
                <text fg={theme.muted}>started: {new Date(agent.startedAt).toLocaleTimeString()}</text>
              )}
            </box>
          </box>
        );

      case 'metrics':
        return (
          <box flexDirection="column" flexGrow={1} overflow="hidden">
            <text fg={theme.dim}>metrics</text>
            <box flexDirection="column" marginTop={SPACING.sm} flexGrow={1} overflow="hidden" paddingLeft={SPACING.sm}>
              <text fg={theme.muted}>domain: {agent.domain}</text>
              {agent.model && <text fg={theme.muted}>model: {String(agent.model).split(':').pop()}</text>}
              <text fg={theme.muted}>status: {agent.status}</text>
              {agent.todoId && <text fg={theme.muted}>todo: {agent.todoId}</text>}
            </box>
          </box>
        );
    }
  };

  return (
    <box
      flexDirection="column"
      width={46}
      height="100%"
      borderStyle="single"
      border={['left']}
      borderColor={running ? theme.accentDim : theme.divider}
      backgroundColor={theme.panel}
      paddingLeft={SPACING.sm} paddingRight={SPACING.sm}
      paddingTop={SPACING.sm} paddingBottom={SPACING.sm}
      flexShrink={0}
    >
      {/* ── Header row ─────────────── */}
      <box flexDirection="row" flexShrink={0} paddingBottom={SPACING.sm} borderStyle="single" border={['bottom']} borderColor={theme.divider}>
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>{'\u25b8'} subagent </text>
        <text fg={theme.textBright} attributes={TextAttributes.BOLD}>{String(agent.todoId || '?').replace(/\D/g, '') || '?'}</text>
        <text fg={theme.muted}>{'  '}</text>
        <text fg={running ? theme.green : theme.dim}>{running ? `${SPIN[spinFrame]} ` : ''}{STATUS_LABEL[agent.status] || agent.status}</text>
        <box flexGrow={1} />
        <text fg={theme.muted}>{'p'} </text>
        <text fg={pinned ? theme.amber : theme.dim}>{pinned ? 'pinned' : 'auto'}</text>
      </box>

      {/* ── Tab strip ──────────────── */}
      <box flexDirection="row" marginTop={SPACING.sm} flexShrink={0}>
        {TABS.map((t) => (
          <box
            key={t}
            marginRight={SPACING.sm}
            paddingLeft={SPACING.sm}
            paddingRight={SPACING.sm}
            backgroundColor={tab === t ? theme.surfaceHover : undefined}
            onMouseDown={() => setTab(t)}
          >
            <text fg={tab === t ? theme.text : theme.dim}>{t}</text>
          </box>
        ))}
      </box>

      {/* ── Title ──────────────────── */}
      <box flexDirection="column" marginTop={SPACING.sm} flexShrink={0}>
        <text fg={theme.text}>{String(agent.title || 'todo').slice(0, 42)}</text>
        <text fg={theme.dim}>{meta}</text>
      </box>

      {/* ── Tab content ────────────── */}
      <box flexDirection="column" marginTop={SPACING.sm} flexGrow={1} overflow="hidden">
        {renderTabContent()}
      </box>

      {/* ── Footer ─────────────────── */}
      <box flexDirection="row" marginTop={SPACING.sm} flexShrink={0}>
        <text fg={theme.muted}>1-9 pin \u00b7 p toggle \u00b7 esc close \u00b7 tab switch</text>
      </box>
    </box>
  );
}
