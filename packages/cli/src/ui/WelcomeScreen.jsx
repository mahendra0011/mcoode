import { useEffect, useState } from 'react';
import { Logo } from './Logo.jsx';
import { theme } from './theme.js';
import { useTerminalDimensions } from '@opentui/react';

const TIPS = [
  'Tip: run `mcode --god "<prompt>"` to plan → build in one go',
  'Tip: `/watch on` keeps fixing broken code while you work',
  'Tip: press ctrl+p any time to open the command palette',
  'Tip: no API key? mock + local providers still work out of the box',
  'Tip: use /mode to switch between low/medium/high/max reasoning',
  'Tip: press Esc to interrupt a running build',
  'Tip: `1-9` while agents run pins a subagent panel'
];

const QUICK_ACTIONS = [
  { key: 'shift+1', label: 'Build it', desc: 'sample prompt', action: 'build' },
  { key: 'shift+2', label: 'Watch', desc: 'auto-fix while coding', action: 'watch' },
  { key: 'shift+3', label: 'Connect', desc: 'add an API provider', action: 'connect' },
  { key: 'shift+4', label: 'Debug', desc: 'provider + model status', action: 'debug' }
];

const TEMPLATES = [
  { name: 'React', prompt: 'Create a React todo app with TypeScript, Tailwind CSS, and local storage', color: theme.blue },
  { name: 'Express API', prompt: 'Build a REST API for orders with Express, PostgreSQL, and tests', color: theme.green },
  { name: 'CLI Tool', prompt: 'Build a command-line tool with Node.js, commander, and unit tests', color: theme.amber },
  { name: 'Full Stack', prompt: 'Build a full-stack app with React frontend and Node backend with auth', color: theme.purple }
];

// Gradient palette for animated background
const GRADIENT_COLORS = ['#0a0a0a', '#0d0d12', '#100f17', '#0a0f1a', '#120d14'];

function fmtNum(n) {
  if (!n) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

export function WelcomeScreen({ tip, onQuickAction = null, onTemplate = null, children }) {
  const [tipIdx, setTipIdx] = useState(() => (tip ? -1 : Math.floor(Math.random() * TIPS.length)));
  const [stats, setStats] = useState({ files: 0, loc: 0, deps: 0 });
  const [frame, setFrame] = useState(0);
  const { width: tw, height: th } = useTerminalDimensions();

  useEffect(() => {
    if (tip) return;
    const id = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 8000);
    return () => clearInterval(id);
  }, [tip]);

  // Animated gradient background
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % GRADIENT_COLORS.length), 2000);
    return () => clearInterval(id);
  }, []);

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

        if (!cancelled) setStats({ files: fileCount, loc, deps: depCount });
      } catch {
        /* non-interactive */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeTip = tip || TIPS[tipIdx];
  const bg = GRADIENT_COLORS[frame];

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} backgroundColor={bg} width="100%" height={th || 24}>
      <Logo />

      {/* Project stats */}
      <box marginTop={2} flexDirection="row" flexShrink={0}>
        <box flexDirection="row" marginRight={3}>
          <text fg={theme.blue}>{'● '}</text>
          <text fg={theme.dim}>files </text>
          <text fg={theme.text}>{fmtNum(stats.files)}</text>
        </box>
        <box flexDirection="row" marginRight={3}>
          <text fg={theme.green}>{'● '}</text>
          <text fg={theme.dim}>LOC </text>
          <text fg={theme.text}>{fmtNum(stats.loc)}</text>
        </box>
        <box flexDirection="row">
          <text fg={theme.amber}>{'● '}</text>
          <text fg={theme.dim}>deps </text>
          <text fg={theme.text}>{fmtNum(stats.deps)}</text>
        </box>
      </box>

      {/* Quick templates */}
      {onTemplate && (
        <box marginTop={2} flexDirection="column" alignItems="center" flexShrink={0}>
          <text fg={theme.dim}>Quick start templates:</text>
          <box marginTop={1} flexDirection="row" flexWrap="wrap" justifyContent="center">
            {TEMPLATES.map((t) => (
              <box
                key={t.name}
                marginLeft={1} marginRight={1} marginTop={1} marginBottom={1}
                paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0}
                borderStyle="round"
                borderColor={t.color}
                backgroundColor={theme.panel}
              >
                <text fg={t.color} attributes={{ BOLD: true }}>{t.name}</text>
              </box>
            ))}
          </box>
        </box>
      )}

      {children}

      {onQuickAction && (
        <box marginTop={2} flexDirection="row" flexShrink={0}>
          {QUICK_ACTIONS.map((a, i) => (
            <box key={a.label} flexDirection="row" marginLeft={i === 0 ? 0 : 3}>
              <text fg={theme.accent}>{a.key}</text>
              <text fg={theme.text}> {'\u2502'} {a.label}</text>
              <text fg={theme.dim}> {a.desc}</text>
            </box>
          ))}
        </box>
      )}

      <box marginTop={2} flexDirection="row" flexShrink={0}>
        <text fg={theme.muted}>{'│ '}</text>
        <text fg={theme.dim}>esc </text><text fg={theme.text}>interrupt</text>
        <text fg={theme.muted}>  {'│  '}</text>
        <text fg={theme.dim}>ctrl+p </text><text fg={theme.text}>commands</text>
        <text fg={theme.muted}>  {'│  '}</text>
        <text fg={theme.dim}>/ </text><text fg={theme.text}>slash cmds</text>
        <text fg={theme.muted}> {'│'}</text>
      </box>

      <box marginTop={2} flexDirection="row" flexShrink={0}>
        <text fg={theme.amber}>{'◆ '}</text>
        <text fg={theme.dim}>{activeTip}</text>
      </box>
    </box>
  );
}
