import { TextAttributes } from '@opentui/core';
import { theme } from './theme.js';

function fmtTime(secs) {
  const s = Math.round(Number(secs) || 0);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

function fmtTokens(n) {
  if (!n) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

export function BuildSummaryCard({ projectName = '', data = {}, marginTop = 1 }) {
  const { done = 0, total = 0, failed = 0, needsReview = 0, elapsedSecs = 0, files = 0, tokensIn = 0, tokensOut = 0, cost = 0, models = [], integration = {} } = data;
  const allOk = total > 0 && done === total && failed === 0;

  return (
    <box flexDirection="column" marginTop={marginTop} flexShrink={0} paddingLeft={1}>
      <box flexDirection="column" borderStyle="round" border borderColor={allOk ? theme.green : theme.amber} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} backgroundColor={theme.surface}>
        <box flexDirection="row">
          <text fg={allOk ? theme.diffGreen : theme.amber}>{allOk ? '\u2713' : '\u26a0'} </text>
          <text fg={theme.textBright} attributes={TextAttributes.BOLD}>
            Build {allOk ? 'complete' : 'finished with issues'} — {projectName || 'project'}
          </text>
        </box>

        <box flexDirection="row" marginTop={1}>
          <text fg={theme.dim}>{done}/{total} todos </text>
          <text fg={theme.muted}>{'\u00b7'} </text>
          <text fg={theme.text}>{files} files </text>
          <text fg={theme.muted}>{'\u00b7'} </text>
          <text fg={theme.text}>{fmtTime(elapsedSecs)} </text>
          <text fg={theme.muted}>{'\u00b7'} </text>
          <text fg={theme.green}>est. ${Number(cost).toFixed(2)}</text>
        </box>
        {failed > 0 && (
          <box flexDirection="row" marginTop={0}>
            <text fg={theme.red}>{failed} failed</text>
            {needsReview > 0 && <text fg={theme.amber}>{' '}\u00b7 {needsReview} need review</text>}
          </box>
        )}

        {models.length > 0 && (
          <box flexDirection="column" marginTop={1} paddingLeft={1}>
            {models.map((m, i) => (
              <text key={i} fg={theme.dim}>
                <span fg={theme.text}>{m.domain}</span>
                <span fg={theme.dim}>{'  \u2192  '}</span>
                <span fg={theme.green}>{String(m.model).split(':').pop()}</span>
                <span fg={theme.muted}>{`  (${m.count} todo${m.count === 1 ? '' : 's'})`}</span>
              </text>
            ))}
          </box>
        )}

        {(tokensIn > 0 || tokensOut > 0) && (
          <box flexDirection="row" marginTop={1}>
            <text fg={theme.muted}>{`tokens: ${fmtTokens(tokensIn)} in \u00b7 ${fmtTokens(tokensOut)} out`}</text>
          </box>
        )}

        <box flexDirection="row" marginTop={1}>
          <text fg={theme.dim}>integration: </text>
          <text fg={integration?.status === 'passed' ? theme.green : integration?.status === 'failed' ? theme.red : theme.dim}>
            {integration?.status || 'skipped'}
            {integration?.rounds ? ` (round ${integration.rounds})` : ''}
          </text>
        </box>
      </box>
    </box>
  );
}
