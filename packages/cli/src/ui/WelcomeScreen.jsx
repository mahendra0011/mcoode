import { Logo } from './Logo.jsx';
import { theme } from './theme.js';

const TIPS = [
  'Tip: run `mcode god "<prompt>"` to plan \u2192 build \u2192 ship in one go',
  'Tip: `mcode watch` keeps fixing broken code while you work',
  'Tip: press ctrl+p any time to open the command palette',
  'Tip: no API key? mock + local providers still work out of the box',
  'Tip: use /mode to switch between low/medium/high/max reasoning',
  'Tip: press Shift+Enter for multi-line prompts'
];

export function WelcomeScreen({ modelLabel = 'auto', agentMode = 'Build', tip, children }) {
  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Logo />

      {children}

      <box marginTop={1} flexDirection="row">
        <text fg={theme.muted}>{'\u2502'} </text>
        <text fg={theme.dim}>tab </text><text fg={theme.text}>agents</text>
        <text fg={theme.muted}>  {'\u2502'}  </text>
        <text fg={theme.dim}>ctrl+p </text><text fg={theme.text}>commands</text>
        <text fg={theme.muted}>  {'\u2502'}  </text>
        <text fg={theme.dim}>/ </text><text fg={theme.text}>slash cmds</text>
        <text fg={theme.muted}> {'\u2502'}</text>
      </box>

      <box marginTop={2} flexDirection="row">
        <text fg={theme.amber}>{'\u25c6'} </text>
        <text fg={theme.dim}>{tip || TIPS[Math.floor(Math.random() * TIPS.length)]}</text>
      </box>
    </box>
  );
}