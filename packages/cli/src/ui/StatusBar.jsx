import { useTerminalDimensions } from '@opentui/react';
import { theme } from './theme.js';

const CONTEXT_LIMIT = 200_000;

function fmtTokens(n) {
  if (!n) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

export function StatusBar({ tokens = 0, percent = 0, cwd = '', isGenerating = false, branch = null, gitDirty = false, mode = 'medium', agentMode = 'Build', watching = false, agentsRunning = 0, agentsTotal = 0, elapsed = 0, cost = 0, tokenIn = 0, tokenOut = 0, providers = 0, latency = 0, modelLabel = 'auto', specialMode = null }) {
  const { width: tw } = useTerminalDimensions();
  const termWidth = tw || 80;
  const tokenLabel = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K` : `${tokens}`;

  // Visual usage bar (8 chars wide)
  const barWidth = 8;
  const filled = Math.round((percent / 100) * barWidth);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);

  const modeColor = mode === 'god' || mode === 'max' ? theme.red : mode === 'high' || mode === 'extra' ? theme.amber : theme.green;

  const elapsedLabel = elapsed > 0 ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}` : '';
  const costLabel = Number(cost).toFixed(2);
  const dirtyIndicator = gitDirty ? <text fg={theme.amber}>{' \u00b7 modified'}</text> : null;

  return (
    <box
      width="100%"
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1} paddingRight={1}
      flexShrink={0}
      borderStyle="single"
      border={['top']}
      borderColor={theme.divider}
    >
      <box flexDirection="row" flexShrink={0}>
        {isGenerating ? (
          <>
            <text fg={theme.dim}>·· </text>
            <text fg={theme.green}>{bar}</text>
            <text fg={theme.text}>   esc </text>
            <text fg={theme.dim}>interrupt</text>
          </>
        ) : (
          <>
            <text fg={theme.purple}>{agentMode} </text>
            <text fg={modeColor}>{mode}</text>
            {watching && <text fg={theme.amber}>{'  '}{'\u25c9'} watch</text>}
            {specialMode && <text fg={theme.blue}>{'  '}{'◉'} {specialMode}</text>}
            <text fg={theme.dim}>{'  \u2502  '}</text>
            <text fg={theme.text}>{modelLabel}</text>
            {providers > 0 && (
              <>
                <text fg={theme.dim}>{'  \u2502  '}</text>
                <text fg={theme.green}>{providers}</text>
                <text fg={theme.dim}> providers</text>
              </>
            )}
            {agentsTotal > 0 && (
              <>
                <text fg={theme.dim}>{'  \u2502  '}</text>
                <text fg={theme.green}>{agentsRunning}</text>
                <text fg={theme.dim}>/{agentsTotal} agents</text>
              </>
            )}
            {elapsedLabel && (
              <>
                <text fg={theme.dim}>{'  \u2502  '}</text>
                <text fg={theme.dim}>{elapsedLabel}</text>
              </>
            )}
            {cost > 0 && (
              <>
                <text fg={theme.dim}>{'  \u2502  '}</text>
                <text fg={theme.dim}>${costLabel}</text>
              </>
            )}
            {latency > 0 && (
              <>
                <text fg={theme.dim}>{'  \u2502  '}</text>
                <text fg={theme.latency || theme.dim}>{(latency / 1000).toFixed(1)}s</text>
              </>
            )}
            <text fg={theme.dim}>{'  \u2502  '}</text>
            <text fg={theme.dim}>{String(cwd || '').split('/').pop() || 'project'}</text>
            {branch && <text fg={gitDirty ? theme.amber : theme.green}>:{branch}</text>}
            {dirtyIndicator}
          </>
        )}
      </box>
      <box flexDirection="row" flexShrink={0} alignItems="center">
        {(tokenIn > 0 || tokenOut > 0) ? (
          <>
            <text fg={theme.dim}>tokens: </text>
            <text fg={theme.text}>{fmtTokens(tokenIn)}</text>
            <text fg={theme.dim}> in \u00b7 </text>
            <text fg={theme.text}>{fmtTokens(tokenOut)}</text>
            <text fg={theme.dim}> out</text>
          </>
        ) : (
          <>
            <text fg={theme.dim}>{tokenLabel} </text>
            <text fg={theme.dim}>({percent}%)</text>
          </>
        )}
        <text fg={theme.dim}>{'  \u2502  '}</text>
        <text fg={theme.text}>ctrl+p</text>
        <text fg={theme.dim}> commands</text>
      </box>
    </box>
  );
}
