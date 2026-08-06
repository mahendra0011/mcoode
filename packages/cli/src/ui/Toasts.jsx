import { useEffect, useState } from 'react';
import { theme } from './theme.js';

const TOAST_TTL_MS = 5000;

const KIND_CONFIG = {
  ok:   { icon: '\u2713', color: theme.green },
  warn: { icon: '\u26a0', color: theme.amber },
  err:  { icon: '\u2717', color: theme.red },
};

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
    <box flexDirection="column" width="100%">
      {visible.map((t, i) => {
        const fading = dying.includes(t.text);
        const cfg = KIND_CONFIG[t.kind] || { icon: '\u2022', color: theme.dim };
        return (
          <box key={`${t.text}-${i}`} flexDirection="row" paddingLeft={2}>
            <text fg={fading ? theme.muted : cfg.color}>{fading ? '\u25e6' : cfg.icon} </text>
            <text fg={fading ? theme.muted : theme.text}>{t.text}</text>
          </box>
        );
      })}
    </box>
  );
}
