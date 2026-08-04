import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { theme } from './theme.js';

const TOAST_TTL_MS = 5000;

export function Toasts({ toasts }) {
  const [visible, setVisible] = useState([]);
  const [dying, setDying] = useState([]);

  useEffect(() => {
    setVisible(toasts.slice(-3));
  }, [toasts]);

  useEffect(() => {
    if (visible.length === 0) return;
    const timers = visible.map((t, i) =>
      setTimeout(() => {
        setDying((d) => [...d, t.text]);
        setTimeout(() => setDying((d) => d.filter((x) => x !== t.text)), 400);
      }, TOAST_TTL_MS - i * 300)
    );
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  return (
    <Box flexDirection="column" width="100%">
      {visible.map((t, i) => {
        const fading = dying.includes(t.text);
        return (
          <Text key={`${t.text}-${i}`} color={fading ? theme.gray : t.kind === 'ok' ? theme.green : t.kind === 'warn' ? theme.amber : theme.dim}>
            {fading ? '\u25e6' : t.kind === 'ok' ? '\u2713' : '\u2022'} {t.text}
          </Text>
        );
      })}
    </Box>
  );
}
