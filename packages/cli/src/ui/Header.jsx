import { theme } from './theme.js';

export function Header({ projectName, model, watching, email = '', version = '' }) {
  const status = watching ? 'Watching' : 'Ready';
  const statusColor = watching ? theme.amber : theme.green;

  return (
    <box
      flexDirection="column"
      width="100%"
      borderStyle="round"
      borderColor="#233043"
      paddingLeft={2} paddingRight={2}
      backgroundColor={theme.panel}
      marginBottom={1}
    >
      <box flexDirection="row">
        <box width={22}>
          <text bold fg={theme.green}>{'\u25c8'} mcode</text>
        </box>
        <box flexGrow={1} justifyContent="center">
          <text fg={theme.text}>mcode CLI {version}</text>
        </box>
        <box justifyContent="flex-end">
          <text fg={statusColor}>{'\u25cf'} {status}</text>
        </box>
      </box>
      <box flexDirection="row">
        <box width={22}>
          <text fg={theme.gray}>Workspace: </text>
          <text fg={theme.text}>{projectName}</text>
        </box>
        <box flexGrow={1} justifyContent="center">
          <text fg={theme.dim}>{email}</text>
        </box>
        <box justifyContent="flex-end">
          <text fg={theme.blue}>{model}</text>
        </box>
      </box>
    </box>
  );
}
