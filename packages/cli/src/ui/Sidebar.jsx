import { theme } from './theme.js';

export function Sidebar({ width, title = 'New Chat', workspace, branch, version = '', tokens = 0, percent = 0, spent = '0.00', todos = [] }) {
  if (width <= 0) return null;

  const done = todos.filter((t) => t.status === 'done').length;
  const failed = todos.filter((t) => t.status === 'failed').length;

  return (
    <box flexDirection="row">
      <box width={1} backgroundColor={theme.divider}><text> </text></box>
      <box
        width={width - 1}
        flexDirection="column"
        backgroundColor={theme.panel}
        paddingLeft={2}
        paddingTop={1}
      >
        <box flexShrink={0}>
          <text bold fg={theme.text}>{title}</text>
        </box>

        <box marginTop={2} flexDirection="column">
          <text bold fg={theme.text}>Context</text>
          <text fg={theme.dim}>{tokens.toLocaleString()} tokens</text>
          <text fg={theme.dim}>{percent}% used</text>
          <text fg={theme.dim}>${spent} spent</text>
        </box>

        {todos.length > 0 && (
          <box marginTop={2} flexDirection="column">
            <text bold fg={theme.text}>Tasks</text>
            <text fg={done === todos.length ? theme.green : theme.dim}>
              {done}/{todos.length} done{failed > 0 ? ` · ${failed} failed` : ''}
            </text>
          </box>
        )}

        <box marginTop={2} flexDirection="column">
          <text bold fg={theme.text}>LSP</text>
          <text fg={theme.dim}>LSPs are disabled</text>
        </box>

        <box flexGrow={1} />

        <box flexShrink={0} flexDirection="column" marginBottom={1}>
          <text fg={theme.dim}>/{workspace || ''}{branch ? `:${branch}` : ''}</text>
          <box flexDirection="row">
            <text fg={theme.greenBright}>{'\u2022'} </text>
            <text fg={theme.dim}>OpenCode {version}</text>
          </box>
        </box>
      </box>
    </box>
  );
}