import { useEffect, useRef, useState } from 'react';
import { theme, SPACING } from './theme.js';

const EVENT_COLORS = {
  USER_PROMPT: '#4da6ff',
  PLAN_GENERATED: '#5fb87a',
  SUBAGENT_STARTED: '#9d7cd8',
  SUBAGENT_STEP: '#f5a742',
  SUBAGENT_DONE: '#5fb87a',
  SUBAGENT_FAILED: '#e06c75',
  SUBAGENT_FILE: '#56b6c2',
  WAVE_START: '#9d7cd8',
  WAVE_COMPLETE: '#5fb87a',
  INTEGRATION_PASS: '#f5a742',
  BUILD_COMPLETE: '#4ade80',
  TOAST: '#f5a742',
  MESSAGE: '#888888',
  PERMISSION_ANSWER: '#f5a742',
  default: '#888888',
};

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour12: false });
}

function truncate(obj, len = 120) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj.length > len ? obj.slice(0, len) + '…' : obj;
  if (typeof obj === 'object') {
    try {
      const json = JSON.stringify(obj);
      return json.length > len ? json.slice(0, len) + '…' : json;
    } catch {
      return String(obj).slice(0, len);
    }
  }
  return String(obj).slice(0, len);
}

export function DebugPanel({ events = [], onClose = null }) {
  const scrollboxRef = useRef(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollboxRef.current) {
      try {
        scrollboxRef.current.scrollTo(0, 99999);
      } catch {
        /* scroll not supported yet */
      }
    }
  }, [events]);

  const filtered = filter
    ? events.filter((e) => e.type.toLowerCase().includes(filter.toLowerCase()))
    : events;

  const displayed = filtered.slice(-100); // last 100 events

  return (
    <box
      position="absolute"
      width="100%"
      height={20}
      flexDirection="column"
      backgroundColor={theme.bg}
      borderStyle="single"
      border
      borderColor={theme.accent}
      flexShrink={0}
    >
      <box flexDirection="row" justifyContent="space-between" paddingBottom={SPACING.sm} borderBottom={1} borderBottomColor={theme.divider}>
        <box flexDirection="row">
          <text fg={theme.accentDim}>{'◆ '}</text>
          <text fg={theme.textBright} attributes={{ BOLD: true }}>Event Inspector </text>
          <text fg={theme.muted}>{'('}{events.length}{' total)'}</text>
        </box>
        <box flexDirection="row">
          <text fg={theme.dim}>filter: </text>
          <text fg={theme.text}>{filter || <span fg={theme.muted}>all</span>}</text>
          <text fg={theme.muted}>{'  │  esc '}close</text>
        </box>
      </box>

      <scrollbox
        ref={scrollboxRef}
        flexGrow={1}
        scrollY
        scrollX={false}
        stickyScroll
        stickyStart="bottom"
        rootOptions={{ flexGrow: 1, flexDirection: 'column' }}
        viewportOptions={{ flexGrow: 1 }}
        scrollbarOptions={{ visible: true }}
      >
        <box flexDirection="column" paddingTop={SPACING.sm} paddingLeft={SPACING.sm} paddingRight={SPACING.sm}>
          {displayed.length === 0 ? (
            <text fg={theme.muted}>No events yet…</text>
          ) : (
            displayed.map((e, i) => {
              const color = EVENT_COLORS[e.type] || EVENT_COLORS.default;
              return (
                <box key={i} flexDirection="row" marginBottom={SPACING.none} paddingTop={SPACING.none} paddingBottom={SPACING.none}>
                  <text fg={theme.muted}>{fmtTime(e.timestamp)}</text>
                  <text fg={theme.dim}>{' '}</text>
                  <text fg={color}>{String(e.type).slice(0, 20).padEnd(20)}</text>
                  <text fg={theme.dim}>{' '}</text>
                  <text fg={theme.muted}>{truncate(e.payload, 100)}</text>
                </box>
              );
            })
          )}
        </box>
      </scrollbox>
    </box>
  );
}
