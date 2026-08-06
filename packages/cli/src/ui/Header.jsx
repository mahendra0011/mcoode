import { Logo } from './Logo.jsx';
import { theme } from './theme.js';

export function Header({ projectName, model, watching, email = '', version = '' }) {
  const status = watching ? 'Working' : 'Ready';
  const statusColor = watching ? theme.amber : theme.green;

  return (
    <box
      flexDirection="row"
      width="100%"
      borderStyle="round"
      borderColor={theme.divider || '#233043'}
      backgroundColor={theme.panel}
      padding={{ top: 4, bottom: 4 }}
      paddingLeft={2}
      paddingRight={2}
      marginBottom={0}
      minHeight={80}
    >
      <box width={24} flexShrink={0} flexGrow={0} justifyContent="center" alignItems="flex-start">
        {/* Use the regular (non‑mini) logo so it’s fully visible */}
        <Logo />
      </box>
      <box flexDirection="column" flexGrow={1} justifyContent="center" paddingLeft={3}>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.text}>mcode CLI {version}</text>
          <text fg={statusColor}>{'\u25cf'} {status}</text>
        </box>
        <box flexDirection="row" justifyContent="space-between" marginTop={1}>
          <box flexDirection="row">
            <text fg={theme.dim}>{'\ud83d\udcc1'} {projectName}</text>
            <text fg={theme.dim}>{email ? ` \u00b7 ${email}` : ''}</text>
          </box>
          <text fg={theme.green}>{model}</text>
        </box>
      </box>
    </box>
  );
}