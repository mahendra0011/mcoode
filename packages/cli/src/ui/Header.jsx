import { Logo } from './Logo.jsx';
import { TextAttributes } from '@opentui/core';
import { theme } from './theme.js';

export function Header({ projectName, model, watching, email = '', version = '', agentsRunning = 0, agentsTotal = 0, elapsed = 0 }) {
  const status = watching ? 'Working' : 'Ready';
  const statusColor = watching ? theme.amber : theme.green;
  const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '\u2026' : s);
  const modelLabel = truncate(model, 26);
  const emailLabel = truncate(email, 30);

  return (
    <box
      flexDirection="row"
      width="100%"
      borderStyle="round"
      border
      borderColor={theme.divider}
      backgroundColor={theme.panel}
      paddingLeft={2} paddingRight={3}
      paddingTop={0} paddingBottom={0}
      marginBottom={1}
      alignItems="center"
      >
      <box flexShrink={0} marginRight={3}>
        <Logo mini />
      </box>
      <box flexDirection="row" flexGrow={1} justifyContent="space-between">

        <box flexDirection="column" justifyContent="center">
          <box flexDirection="row">
            <text fg={theme.text} attributes={TextAttributes.BOLD}>mcode CLI </text>
            <text fg={theme.dim}>{version}</text>
          </box>
          <box flexDirection="row" marginTop={1}>
            <text fg={theme.blue}>{'\u25a3'} </text>
            <text fg={theme.text} attributes={TextAttributes.BOLD}>{String(projectName).slice(0, 28)}</text>
          </box>
        </box>

        <box flexDirection="column" alignItems="center" justifyContent="center">
          <text fg={theme.dim}>{emailLabel}</text>
          <text fg={theme.green} marginTop={1}>{modelLabel}</text>
        </box>

        <box flexDirection="column" alignItems="flex-end" justifyContent="center">
          <box flexDirection="row">
            <text fg={statusColor}>{theme.circle} </text>
            <text fg={theme.text} attributes={TextAttributes.BOLD}>{status}</text>
            {watching && (agentsTotal > 0 || elapsed > 0) && (
              <text fg={theme.dim}>{` \u00b7 ${agentsRunning}/${agentsTotal} agents \u00b7 ${elapsed}s`}</text>
            )}
          </box>
        </box>

      </box>
    </box>
  );
}
