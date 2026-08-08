import { theme, SPACING } from './theme.js';

export function Sidebar({ width, title = 'New Chat', workspace, branch, version = '', tokens = 0, percent = 0, todos = [] }) {
  if (width <= 0) return null;

  const done = todos.filter((t) => t.status === 'done').length;
  const failed = todos.filter((t) => t.status === 'failed').length;

  return (
    <box
      flexDirection="column"
      width={width}
      height="100%"
      borderStyle="single"
      border={['left']}
      borderColor={theme.divider}
      paddingLeft={SPACING.md}
      paddingTop={SPACING.sm}
      backgroundColor={theme.bg}
    >
      <box flexShrink={0}>
        <text fg={theme.textBright}>{String(title || 'New Chat').slice(0, width - 4)}</text>
      </box>

      <box marginTop={SPACING.md} flexDirection="column">
        <text fg={theme.textBright}>Context</text>
        <text fg={theme.dim}>{tokens.toLocaleString()} tokens</text>
        <text fg={theme.dim}>{percent}% used</text>
      </box>

      {todos.length > 0 && (
        <box marginTop={SPACING.md} flexDirection="column">
          <text fg={theme.textBright}>Tasks</text>
          <text fg={done === todos.length ? theme.green : theme.dim}>
            {done}/{todos.length} done{failed > 0 ? ` · ${failed} failed` : ''}
          </text>
        </box>
      )}

      <box marginTop={SPACING.md} flexDirection="column">
        <text fg={theme.textBright}>Workspace</text>
        <text fg={theme.dim}>{String(workspace || '').slice(0, width - 4)}{branch ? `:${branch}` : ''}</text>
      </box>

      <box flexGrow={1} />

      <box flexShrink={0} flexDirection="column" marginBottom={SPACING.sm}>
        <box flexDirection="row">
          <text fg={theme.greenBright}>{'\u2022'} </text>
          <text fg={theme.dim}>mcode {version}</text>
        </box>
      </box>
    </box>
  );
}
