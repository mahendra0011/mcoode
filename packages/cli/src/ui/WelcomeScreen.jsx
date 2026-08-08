import { useEffect, useState } from 'react';
import { Logo } from './Logo.jsx';
import { theme, SPACING } from './theme.js';
import { useTerminalDimensions } from '@opentui/react';
import { useTicker } from './useTicker.js';

const TIPS = [
  'Tip: run `mcode --god "<prompt>"` to plan → build in one go',
  'Tip: `/watch on` keeps fixing broken code while you work',
  'Tip: press ctrl+p any time to open the command palette',
  'Tip: no API key? mock + local providers still work out of the box',
  'Tip: use /mode to switch between low/medium/high/max reasoning',
  'Tip: press Esc to interrupt a running build',
  'Tip: `1-9` while agents run pins a subagent panel'
];

// Gradient palette for animated background
const GRADIENT_COLORS = ['#0a0a0a', '#0d0d12', '#100f17', '#0a0f1a', '#120d14'];

function fmtNum(n) {
  if (!n) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

export function WelcomeScreen({ tip, onQuickAction = null, onTemplate = null, children }) {
  const [stats, setStats] = useState({ files: 0, loc: 0, deps: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [statsStartTick, setStatsStartTick] = useState(null);
  const { width: tw, height: th } = useTerminalDimensions();
  const ticks = useTicker();

  const tipIdx = tip ? -1 : Math.floor(ticks / 100) % TIPS.length;
  const frame = Math.floor(ticks / 25) % GRADIENT_COLORS.length;

  const activeTip = tip || TIPS[tipIdx];

  const [tipStartTick, setTipStartTick] = useState(ticks);
  useEffect(() => {
    setTipStartTick(ticks);
  }, [tipIdx]);

  const charsToReveal = Math.max(0, ticks - tipStartTick) * 3;
  const revealedTip = activeTip.slice(0, charsToReveal);

  // Staggered stats reveal: each stat appears 3 ticks (240ms) after the previous
  useEffect(() => {
    if (statsLoaded && statsStartTick === null) setStatsStartTick(ticks);
  }, [statsLoaded, ticks]);

  const statEntries = [
    { color: theme.blue, icon: '\u25cf', label: 'files', value: fmtNum(stats.files) },
    { color: theme.green, icon: '\u25cf', label: 'LOC', value: fmtNum(stats.loc) },
    { color: theme.amber, icon: '\u25cf', label: 'deps', value: fmtNum(stats.deps) }
  ];

  const bg = GRADIENT_COLORS[frame];

  // Load project stats
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { readdir, readFile } = await import('node:fs/promises');
        const { join } = await import('node:path');
        const cwd = process.cwd();

        let fileCount = 0;
        let loc = 0;

        const walk = async (dir) => {
          let entries;
          try {
            entries = await readdir(dir, { withFileTypes: true });
          } catch {
            return;
          }
          for (const entry of entries) {
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
              await walk(full);
            } else if (['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.rb', '.java', '.c', '.cpp'].includes(entry.name.split('.').pop())) {
              fileCount++;
              try {
                const content = await readFile(full, 'utf8');
                loc += content.split('\n').length;
              } catch {
                /* binary file */
              }
            }
          }
        };

        await walk(cwd);

        let depCount = 0;
        try {
          const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8'));
          depCount = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length;
        } catch {
          /* no package.json */
        }
        if (!cancelled) {
          setStats({ files: fileCount, loc: loc, deps: depCount });
          setStatsLoaded(true);
        }
      } catch {
        /* non-interactive */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} backgroundColor={bg} width="100%" height={th || 24}>
      <Logo />

      {/* Project stats — staggered reveal when loaded */}
      {statsLoaded && statsStartTick !== null && (
        <box marginTop={SPACING.md} flexDirection="row" flexShrink={0}>
          {statEntries.map((s, i) => {
            const visible = ticks >= statsStartTick + i * 3;
            return visible ? (
              <box key={i} flexDirection="row" marginRight={i < 2 ? SPACING.lg : 0}>
                <text fg={s.color}>{s.icon} </text>
                <text fg={theme.dim}>{s.label} </text>
                <text fg={theme.text}>{s.value}</text>
              </box>
            ) : null;
          })}
        </box>
      )}

      {children}

      <box marginTop={SPACING.md} flexDirection="row" flexShrink={0}>
        <text fg={theme.muted}>{'│ '}</text>
        <text fg={theme.dim}>esc </text><text fg={theme.text}>interrupt</text>
        <text fg={theme.muted}>  {'│  '}</text>
        <text fg={theme.dim}>ctrl+p </text><text fg={theme.text}>commands</text>
        <text fg={theme.muted}>  {'│  '}</text>
        <text fg={theme.dim}>/ </text><text fg={theme.text}>slash cmds</text>
        <text fg={theme.muted}> {'│'}</text>
      </box>

      <box marginTop={SPACING.md} flexDirection="row" flexShrink={0}>
        <text fg={theme.amber}>{'◆ '}</text>
        <text fg={theme.dim}>{revealedTip}</text>
        {revealedTip.length < activeTip.length && (
          <text fg={theme.amber}>█</text>
        )}
      </box>
    </box>
  );
}
