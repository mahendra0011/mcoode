import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { DOMAIN_CHALK, STATUS_GLYPH, theme } from './theme.js';
import Spinner from 'ink-spinner';

function AgentCard({ agent, leaving }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - (agent.startedAt || Date.now())) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const statusColor =
    agent.status === 'done' ? theme.green :
    agent.status === 'failed' ? theme.red :
    agent.status === 'needs_review' ? theme.amber : theme.greenBright;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={leaving ? theme.gray : statusColor}
      paddingX={1}
      opacity={leaving ? 0.4 : 1}
      width="100%"
    >
      <Box>
        <Text color={statusColor}>{STATUS_GLYPH[agent.status] || '\u25cf'} </Text>
        <Text bold color={theme.text}>{agent.todoId}</Text>
        <Text color={DOMAIN_CHALK[agent.domain] || theme.gray}> [{agent.domain}]</Text>
      </Box>
      <Box>
        <Text color={theme.dim}>{agent.model}</Text>
        <Text color={theme.gray}> · {elapsed}s</Text>
      </Box>
      <Box>
        {agent.status === 'running' ? (
          <>
            <Text color={theme.greenBright}><Spinner type="dots" /></Text>
            <Text color={theme.dim}> {agent.message}</Text>
          </>
        ) : (
          <Text color={theme.dim}>{agent.status === 'done' ? 'DONE' : agent.message}</Text>
        )}
      </Box>
    </Box>
  );
}

/** Left-side Agents panel — slides in while work is happening, auto-dismisses. */
export function Sidebar({ agents, width, plan }) {
  const leaving = agents.filter((a) => a.status === 'done' || a.status === 'failed' || a.status === 'needs_review');
  const active = agents.filter((a) => a.status === 'running' || a.status === 'pending');

  if (width <= 0) return null;

  return (
    <Box width={width} flexDirection="column" overflowY="hidden" borderStyle="single" borderColor="#1f2937" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color={theme.greenBright}>AGENTS</Text>
        <Text color={theme.gray}>  {active.length} running</Text>
      </Box>
      {plan && (
        <Box marginBottom={1} flexDirection="column">
          <Text color={theme.gray}>plan: </Text>
          <Text color={theme.dim} wrap="truncate-end">{plan.summary}</Text>
          <Text color={theme.gray}>{plan.todos.filter((t) => t.status === 'done').length}/{plan.todos.length} todos done</Text>
        </Box>
      )}
      {agents.length === 0 && <Text color={theme.gray}>no active work</Text>}
      {active.map((agent) => (
        <Box key={agent.todoId} marginBottom={1}><AgentCard agent={agent} /></Box>
      ))}
      {leaving.map((agent) => (
        <Box key={`${agent.todoId}-leaving`} marginBottom={1}><AgentCard agent={agent} leaving /></Box>
      ))}
    </Box>
  );
}
