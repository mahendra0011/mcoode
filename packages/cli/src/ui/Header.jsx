import { Logo } from './Logo.jsx';
import { TextAttributes } from '@opentui/core';
import { theme, SPACING } from './theme.js';
import { useTicker } from './useTicker.js';
import { SPIN_FRAMES } from './blocks.jsx';

export function Header({ projectName, model, watching, email = '', version = '', agentsRunning = 0, agentsTotal = 0, elapsed = 0 }) {
  const ticks = useTicker();
  const frame = ticks % SPIN_FRAMES.length;
  const status = watching ? 'Working' : 'Ready';
  const statusColor = watching ? theme.amber : theme.green;
  const statusIcon = watching ? SPIN_FRAMES[frame] : theme.circle;
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
      paddingLeft={SPACING.md} paddingRight={SPACING.lg}
      paddingTop={SPACING.none} paddingBottom={SPACING.none}
      marginBottom={SPACING.sm}
      alignItems="center"
      >
      <box flexShrink={0} marginRight={SPACING.lg}>
        <Logo mini />
      </box>
      <box flexDirection="row" flexGrow={1} justifyContent="space-between">

        <box flexDirection="column" justifyContent="center">
          <box flexDirection="row">
            <text fg={theme.text} attributes={TextAttributes.BOLD}>mcode CLI </text>
            <text fg={theme.dim}>{version}</text>
          </box>
          <box flexDirection="row" marginTop={SPACING.sm}>
            <text fg={theme.blue}>{'\u25a3'} </text>
            <text fg={theme.text} attributes={TextAttributes.BOLD}>{String(projectName).slice(0, 28)}</text>
          </box>
        </box>

        <box flexDirection="column" alignItems="center" justifyContent="center">
          <text fg={theme.dim}>{emailLabel}</text>
          <text fg={theme.green} marginTop={SPACING.sm}>{modelLabel}</text>
        </box>

        <box flexDirection="column" alignItems="flex-end" justifyContent="center">
          <box flexDirection="row">
            <text fg={statusColor}>{statusIcon} </text>
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
