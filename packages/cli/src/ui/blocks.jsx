import { useEffect, useRef, useState } from 'react';
import { useTicker } from './useTicker.js';
import { useAnimatedProgress } from './useAnimatedProgress.js';
import { highlight } from 'cli-highlight';
import { TextAttributes } from '@opentui/core';
import { theme, SPACING } from './theme.js';
import { BgBox } from './BgBox.jsx';
import { useEntrance } from './useEntrance.js';

export function useFlashOnMount() {
  const [flash, setFlash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setFlash(false), 400);
    return () => clearTimeout(t);
  }, []);
  return flash;
}

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
  const ticks = useTicker();
  const f = ticks % SPIN_FRAMES.length;

  return (
    <box flexDirection="row" paddingLeft={SPACING.md} marginTop={SPACING.sm} flexShrink={0}>
      <text fg={theme.amber}>{SPIN_FRAMES[f]} </text>
      <text fg={theme.dim}>{label}</text>
    </box>
  );
}

/** Running tool indicator — spinner + args preview (matches Z Code's per-tool spinner pattern) */
export function RunningToolBlock({ tool, args, marginTop = 1 }) {
  const ticks = useTicker();
  const frame = SPIN_FRAMES[ticks % SPIN_FRAMES.length];
  const verb = TOOL_VERBS[tool] || 'Running…';
  const preview = String(args || '').slice(0, 60);

  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={SPACING.sm}>
      <box flexDirection="column" backgroundColor={theme.surface} borderStyle="round" border borderColor={theme.divider} paddingLeft={SPACING.sm} paddingRight={SPACING.sm} paddingTop={SPACING.none} paddingBottom={SPACING.none}>
        <box flexDirection="row" paddingBottom={SPACING.sm} borderStyle="single" border={['bottom']} borderColor={theme.divider}>
          <text fg={theme.amber}>{frame} </text>
          <text fg={theme.dim}>{TOOL_LABELS[tool] || tool} </text>
          <text fg={theme.textBright}>{preview}</text>
        </box>
        <box flexDirection="row" paddingTop={SPACING.sm}>
          <text fg={theme.muted}>{verb}</text>
        </box>
      </box>
    </box>
  );
}

// ── Thought ──────────────────────────────────────────────────────
export function ThoughtBlock({ text, seconds, live = false, expanded = false }) {
  const ticks = useTicker();
  const ms = Number(seconds);
  const dotsLength = Math.floor(ticks / 5) % 4; // 0 to 3 dots
  const dots = '.'.repeat(dotsLength);
  const label = live
    ? `Thinking${dots}`
    : `Thought: ${Number.isFinite(ms) ? Math.round(ms * 1000) : 0}ms`;

  const frame = ticks % SPIN_FRAMES.length;


  const lines = (text || '').split('\n').filter(Boolean);
  const lastLineIdx = lines.length - 1;
  // Progressive reveal for expanded (non-live) content via shared ticker
  const revealCount = useEntrance(lines.length, 1, expanded);
  const visibleCount = live ? lines.length : revealCount;

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
    <box flexDirection="column" marginTop={SPACING.none} flexShrink={0} paddingLeft={SPACING.sm}>
      <text>
        <span fg={theme.dim}>{expanded ? '\u25be ' : '\u25b8 '}</span>
        {live && <span fg={theme.green}>{SPIN_FRAMES[frame]} </span>}
        <span fg={theme.amber}>{label}</span>
      </text>
      {(live || expanded) && (
        <box marginTop={SPACING.sm} paddingLeft={SPACING.sm} flexDirection="column">
          {lines.slice(0, visibleCount).map((l, i) => (
            <box key={i} flexDirection="row">
              <text fg={theme.divider}>│ </text>
              <text fg={theme.dim}>
                {parseLine(l)}{live && i === lastLineIdx ? <span fg={theme.amber}>{'\u2588'}</span> : ''}
              </text>
            </box>
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
  
  const visibleLines = useEntrance(display.length, 0.375); // ~30ms per line
  const revealed = display.slice(0, visibleLines);
  const flash = useFlashOnMount();
  const bg = flash ? '#062012' : theme.surface;
  const borderCol = flash ? theme.green : theme.divider;

  let highlighted = revealed;
  try {
    const ext = path.split('.').pop() || 'js';
    const joined = revealed.join('\n');
    const hl = highlight(joined, { language: ext, ignoreIllegals: true });
    highlighted = hl.split('\n');
  } catch { /* fallback to plain text */ }
  
  const crumbs = path.split('/').join(' \u203a ');

  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={SPACING.sm}>
      <box flexDirection="column" backgroundColor={bg} borderStyle="round" border borderColor={borderCol} paddingLeft={SPACING.sm} paddingRight={SPACING.sm} paddingTop={SPACING.none} paddingBottom={SPACING.none}>
        <box flexDirection="row" paddingBottom={SPACING.sm} borderStyle="single" border={['bottom']} borderColor={theme.divider}>
          <text fg={flash ? theme.diffGreen : theme.teal}>{'\u25ce'} </text>
          <text fg={theme.dim}>Read </text>
          <text fg={theme.textBright}>{crumbs}</text>
          <box flexGrow={1} />
          <text fg={theme.dim}>{expanded ? '▾' : '▸'}</text>
        </box>
        {/* Only show content lines when expanded — collapsed shows just header */}
        {!expanded && (
          <box flexDirection="row" marginTop={SPACING.sm} paddingLeft={SPACING.sm} paddingBottom={SPACING.sm}>
            <text fg={theme.dim}>{lines.length} lines · Tab ↵ to expand</text>
          </box>
        )}
        {expanded && (
          <box flexDirection="column" marginTop={SPACING.sm} paddingLeft={SPACING.sm}>
            {highlighted.map((line, i) => (
              <box key={i} flexDirection="row">
                <text fg={theme.dim}>{String(i + 1).padStart(pad)} │ </text>
                <text>{line || ' '}</text>
              </box>
            ))}
            {truncated && (
              <box flexDirection="row" marginTop={SPACING.sm}>
                <text fg={theme.accentDim}>
                  {expanded
                    ? '\u2026 press Esc to collapse'
                    : `\u2026 ${lines.length - READ_MAX} more lines (Tab \u2192 Enter to expand)`}
                </text>
              </box>
            )}
          </box>
        )}
      </box>
    </box>
  );
}

// ── Write Block ──────────────────────────────────────────────────
export function WriteBlock({ path, lines, expanded = false, marginTop = 1 }) {
  const pad = String(lines.length).length;
  const truncated = lines.length > READ_MAX;
  const display = expanded ? lines : lines.slice(0, READ_MAX);
  
  const visibleLines = useEntrance(display.length, 0.375); // ~30ms per line
  const revealed = display.slice(0, visibleLines);
  const flash = useFlashOnMount();
  const bg = flash ? '#062012' : theme.surface;
  const borderCol = flash ? theme.green : theme.divider;

  let highlighted = revealed;
  try {
    const ext = path.split('.').pop() || 'js';
    const joined = revealed.join('\n');
    const hl = highlight(joined, { language: ext, ignoreIllegals: true });
    highlighted = hl.split('\n');
  } catch { /* fallback to plain text */ }

  const crumbs = path.split('/').join(' \u203a ');

  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={SPACING.sm}>
      <box flexDirection="column" backgroundColor={bg} borderStyle="round" border borderColor={borderCol} paddingLeft={SPACING.sm} paddingRight={SPACING.sm} paddingTop={SPACING.none} paddingBottom={SPACING.none}>
        <box flexDirection="row" paddingBottom={SPACING.sm} borderStyle="single" border={['bottom']} borderColor={theme.divider}>
          <text fg={flash ? theme.diffGreen : theme.green}>{'\u270e'} </text>
          <text fg={theme.dim}>Wrote </text>
          <text fg={theme.textBright}>{crumbs}</text>
        </box>
        <box flexDirection="column" marginTop={SPACING.sm} paddingLeft={SPACING.sm}>
          {highlighted.map((line, i) => (
            <box key={i} flexDirection="row">
              <text fg={theme.dim}>{String(i + 1).padStart(pad)} │ </text>
              <text>{line || ' '}</text>
            </box>
          ))}
          {truncated && (
            <box flexDirection="row" marginTop={SPACING.sm}>
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
  
  // Staggered reveal: adds faster (0.2 ticks), context medium (0.375), removes slower (0.5)
  const staggerTicks = useTicker();
  const [staggerStart, setStaggerStart] = useState(null);
  useEffect(() => { setStaggerStart(staggerTicks); }, [display.length, expanded]);
  let staggerVisible = 0;
  if (staggerStart !== null) {
    const elapsed = Math.max(0, staggerTicks - staggerStart);
    let cumulative = 0;
    for (let i = 0; i < display.length; i++) {
      const l = display[i];
      const delay = l.kind === 'add' ? 0.2 : l.kind === 'remove' ? 0.5 : 0.375;
      cumulative += delay;
      if (elapsed >= cumulative) staggerVisible = i + 1;
      else break;
    }
  }
  const revealed = display.slice(0, staggerVisible);
  const flash = useFlashOnMount();
  const bg = flash ? '#062012' : theme.surface;
  const borderCol = flash ? theme.green : theme.divider;
  
  const crumbs = path.split('/').join(' \u203a ');
  const ext = path.split('.').pop() || 'js';

  const adds = lines.filter((l) => l.kind === 'add').length;
  const rms = lines.filter((l) => l.kind === 'remove').length;
  const isNew = adds > 0 && rms === 0 && lines.length === adds;
  const badge = isNew ? '[NEW]' : '[EDIT]';
  const badgeColor = isNew ? theme.teal : theme.amber;

  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={SPACING.sm}>
      <box flexDirection="column" backgroundColor={bg} borderStyle="round" border borderColor={borderCol} paddingLeft={SPACING.sm} paddingRight={SPACING.sm} paddingTop={SPACING.none} paddingBottom={SPACING.none}>
        <box flexDirection="row" paddingBottom={SPACING.sm} borderStyle="single" border={['bottom']} borderColor={theme.divider}>
          <text fg={flash ? theme.diffGreen : badgeColor}>{badge} </text>
          <text fg={theme.textBright}>{crumbs}</text>
          <box flexGrow={1} />
          {adds > 0 && <text fg={theme.diffGreen}>+{adds} </text>}
          {rms > 0 && <text fg={theme.diffRed}>-{rms}</text>}
        </box>
        <box flexDirection="column" marginTop={SPACING.sm} paddingLeft={SPACING.sm}>
          {revealed.map((l, i) => {
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
            <box flexDirection="row" marginTop={SPACING.sm}>
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
  
  const visibleLines = useEntrance(display.length, 0.375); // ~30ms per line
  const revealed = display.slice(0, visibleLines);
  const flash = useFlashOnMount();
  const bg = flash ? '#062012' : theme.surface;
  const borderCol = flash ? theme.green : theme.divider;

  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={SPACING.sm}>
      <box flexDirection="column" backgroundColor={bg} borderStyle="round" border borderColor={borderCol} paddingLeft={SPACING.md} paddingRight={SPACING.md} paddingTop={SPACING.none} paddingBottom={SPACING.none}>
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
            {revealed.map((line, i) => <text key={i} fg={theme.dim}>{line || ' '}</text>)}
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
  const animatedPct = useAnimatedProgress(percent);
  const filled = Math.round((animatedPct / 100) * 20);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(20 - filled);

  const statusColor = (s) =>
    s === 'done' ? theme.diffGreen
    : s === 'running' ? theme.amber
    : s === 'failed' || s === 'interrupt' ? theme.red
    : s === 'paused' ? theme.orange
    : theme.muted;

  const ticks = useTicker();

  // Track newly-completed todos for flash animation (400ms green flash + bright checkmark)
  const [flashDone, setFlashDone] = useState(new Set());
  const prevDone = useRef(new Set());

  useEffect(() => {
    const currentDone = new Set();
    items?.forEach((t) => {
      if (t.status === 'done') currentDone.add(t.id);
    });
    const newDone = [...currentDone].filter((id) => !prevDone.current.has(id));
    if (newDone.length > 0) {
      setFlashDone((prev) => new Set([...prev, ...newDone]));
      const timer = setTimeout(() => {
        setFlashDone((prev) => {
          const next = new Set(prev);
          newDone.forEach((id) => next.delete(id));
          return next;
        });
      }, 400);
      return () => clearTimeout(timer);
    }
    prevDone.current = currentDone;
  }, [items]);

  /**
   * Status icon with Z-Code-style terminal animation:
   *  - done:    checkmark draw-in (dim → medium → bright → settled over ~320ms)
   *  - running: spinner cycle + smooth 16-step brightness pulse
   *  - failed:  cross
   *  - paused:  hollow circle
   *  - pending: hollow circle
   */
  const statusIcon = (s, id) => {
    if (s === 'done') {
      // Checkbox draw-in: progressively brighten over 8 ticks (~640ms)
      // Phase 0: '|' (downstroke starting) → Phase 1: '/' (diagonal) → Phase 2-3: '✓' dim → Phase 4+: '✓' bright
      if (flashDone.has(id)) {
        const phase = Math.floor((ticks % 8) / 2); // 0-3 over 8 ticks
        if (phase === 0) return '|';
        if (phase === 1) return '/';
        return '\u2713';
      }
      return '\u2713';
    }
    if (s === 'running') {
      // Spinner frame + smooth brightness pulse for in-progress dot
      return SPIN_FRAMES[ticks % SPIN_FRAMES.length];
    }
    if (s === 'failed' || s === 'interrupt') return '\u2717';
    if (s === 'paused') return '\u25d0';
    return '\u25cb';
  };

  // Smooth 16-step sine-like pulse for in-progress items (brighter around peak)
  const pulseSteps = 16;
  const pulsePhase = (ticks % (pulseSteps * 2)) / pulseSteps; // 0..2 sawtooth
  const pulseBrightness = Math.abs(pulsePhase - 1); // 1 at edges, 0 at middle → invert
  const pulseFactor = 0.3 + 0.7 * (1 - pulseBrightness); // 0.3 to 1.0 brightness

  // Checkbox draw-in color: dim → medium → bright → settled (matches phase in statusIcon)
  function todoFlashColor(id, status, t, theme) {
    if (status !== 'done') return theme.textBright;
    const phase = Math.floor((t % 8) / 2); // 0-3
    if (phase === 0) return theme.muted;      // '|' dim
    if (phase === 1) return theme.text;       // '/' medium
    return theme.diffGreen;                   // '✓' bright green (settled)
  }

  // Running dot color: smooth brightness pulse between amber and textBright
  function todoRunningColor(status, t, factor, theme, statusColorFn) {
    if (status !== 'running') return statusColorFn(status);
    const mix = (a, b, f) => {
      const ah = a.replace('#', '');
      const bh = b.replace('#', '');
      const ar = parseInt(ah.slice(0, 2), 16);
      const ag = parseInt(ah.slice(2, 4), 16);
      const ab = parseInt(ah.slice(4, 6), 16);
      const br = parseInt(bh.slice(0, 2), 16);
      const bg2 = parseInt(bh.slice(2, 4), 16);
      const bb = parseInt(bh.slice(4, 6), 16);
      const r = Math.round(ar + (br - ar) * f);
      const g = Math.round(ag + (bg2 - ag) * f);
      const b2 = Math.round(ab + (bb - ab) * f);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`;
    };
    return mix(theme.amber, theme.textBright, factor);
  }

  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={SPACING.sm}>
      <box flexDirection="column" backgroundColor={theme.surface} borderStyle="round" border borderColor={theme.divider} paddingLeft={SPACING.sm} paddingRight={SPACING.sm} paddingTop={SPACING.none} paddingBottom={SPACING.none}>
        <box flexDirection="row" paddingBottom={SPACING.sm} borderStyle="single" border={['bottom']} borderColor={theme.divider}>
          <text fg={theme.purple}>{'\u2630'} </text>
          <text fg={theme.textBright} attributes={TextAttributes.BOLD}>Todos </text>
          {total > 0 && (
            <text fg={theme.dim}> {doneCount}/{total}  [{bar}] {percent}%</text>
          )}
        </box>
        <box flexDirection="column" marginTop={SPACING.sm} paddingLeft={SPACING.sm}>
          {list.map((t, i) => {
            const isSub = t.dependsOn && t.dependsOn.length > 0;
            return (
              <box key={i} flexDirection="row">
                {isSub && <text fg={theme.divider}> {'\u2514\u2500\u203a'} </text>}
                {!isSub && <text> </text>}
                <text fg={flashDone.has(t.id) ? todoFlashColor(t.id, t.status, ticks, theme) : todoRunningColor(t.status, ticks, pulseFactor, theme, statusColor)}>{statusIcon(t.status, t.id)}</text>
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
            <box marginTop={SPACING.sm} flexDirection="row">
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
    <box flexDirection="row" backgroundColor={theme.surface} paddingLeft={SPACING.md} paddingRight={SPACING.md} marginTop={marginTop} marginLeft={SPACING.sm} flexShrink={0}>
      <text fg={theme.red}>{'\u2717'} </text>
      <text fg={theme.dim}>Interrupted by user</text>
    </box>
  );
}

// ── Error ────────────────────────────────────────────────────────
export function ErrorBlock({ reason, marginTop = 1 }) {
  return (
    <box flexDirection="column" backgroundColor={theme.surface} paddingLeft={SPACING.md} paddingRight={SPACING.md} paddingTop={SPACING.sm} paddingBottom={SPACING.sm} marginTop={marginTop} marginLeft={SPACING.sm} flexShrink={0}>
      <box flexDirection="row">
        <text fg={theme.red}>{'\u2717'} </text>
        <text fg={theme.red}>Something went wrong: </text>
        <text fg={theme.text}>{reason}</text>
      </box>
      <box marginTop={SPACING.sm}>
        <text fg={theme.dim}>Press </text>
        <text fg={theme.amber}>r</text>
        <text fg={theme.dim}> to retry</text>
      </box>
    </box>
  );
}

// ── Permission ───────────────────────────────────────────────────
export function PermissionBlock({ pending, approved = false, command, marginTop = 1 }) {
  const flash = useFlashOnMount();
  const bg = (!pending && approved !== undefined) ? (flash ? '#062012' : theme.surface) : theme.surface;
  const borderCol = (!pending && approved !== undefined) ? (flash ? theme.green : theme.divider) : theme.divider;

  return (
    <box flexDirection="column" backgroundColor={bg} borderStyle="round" border borderColor={borderCol} paddingLeft={SPACING.md} paddingRight={SPACING.md} paddingTop={SPACING.none} paddingBottom={SPACING.none} marginTop={marginTop} marginLeft={SPACING.sm} flexShrink={0}>
      {pending ? (
        <>
          <box flexDirection="row">
            <text fg={theme.orange}>{'? '}</text>
            <text fg={theme.dim}>Allow running: </text>
            <text fg={theme.textBright} attributes={TextAttributes.BOLD}>{command}</text>
          </box>
          <box flexDirection="row" marginTop={SPACING.none}>
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
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={SPACING.sm}>
      <box flexDirection="column" backgroundColor={theme.surface} paddingLeft={SPACING.md} paddingRight={SPACING.md} paddingTop={SPACING.sm} paddingBottom={SPACING.sm}>
        <box flexDirection="row">
          <text fg={theme.diffGreen}>{'\u2713'} </text>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>Changed {list.length} {list.length === 1 ? 'file' : 'files'}</text>
        </box>
        <box flexDirection="column" marginTop={SPACING.sm} paddingLeft={SPACING.md}>
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
          <box marginTop={SPACING.sm} paddingLeft={SPACING.md} flexDirection="row">
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