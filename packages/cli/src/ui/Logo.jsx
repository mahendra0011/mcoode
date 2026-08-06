import { useState, useEffect } from 'react';
import { theme } from './theme.js';
import { MCODE_GLYPH } from './logo.js';

const RAW_COLORS = [
  '#1a3a2a',
  '#2a5a3a',
  theme.green,
  theme.greenBright,
  theme.green,
  '#2a5a3a',
  '#1a3a2a',
];

export function Logo({ compact = false }) {
  const [tick, setTick] = useState(0);
  const [palette, setPalette] = useState([]);

  useEffect(() => {
    setPalette(ramp(RAW_COLORS)(24)); // 24 smooth steps
    const timer = setInterval(() => setTick((t) => t + 1), 60); // ~16fps smooth animation
    return () => clearInterval(timer);
  }, []);

  const ACCENT_LINE = '━';

  return (
    <box flexDirection="column" alignItems="center" marginBottom={compact ? 0 : 1}>
      {/* Top accent line */}
      {!compact && (
        <box marginBottom={1}>
          <text fg="#1a3a2a">{ACCENT_LINE.repeat(4)}</text>
          <text fg="#2a5a3a">{ACCENT_LINE.repeat(6)}</text>
          <text fg={tick % 24 < 12 ? theme.greenBright : '#2a5a3a'}>{'  ◆  '}</text>
          <text fg="#2a5a3a">{ACCENT_LINE.repeat(6)}</text>
          <text fg="#1a3a2a">{ACCENT_LINE.repeat(4)}</text>
        </box>
      )}

      {/* Logo glyph with animated per-row gradient */}
      {MCODE_GLYPH.map((line, i) => {
        // Shift color over time, creating a wave
        const color = palette.length ? palette[(i * 2 + tick) % palette.length] : theme.green;
        return (
          <text key={i} fg={color}>
            {line}
          </text>
        );
      })}

      {/* Bottom accent line */}
      {!compact && (
        <box marginTop={1}>
          <text fg="#1a3a2a">{ACCENT_LINE.repeat(4)}</text>
          <text fg="#2a5a3a">{ACCENT_LINE.repeat(6)}</text>
          <text fg={tick % 24 > 12 ? theme.greenBright : '#2a5a3a'}>{'  ◆  '}</text>
          <text fg="#2a5a3a">{ACCENT_LINE.repeat(6)}</text>
          <text fg="#1a3a2a">{ACCENT_LINE.repeat(4)}</text>
        </box>
      )}
    </box>
  );
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function ramp(colors) {
  // Piecewise-linear interpolation across a color list → one color per index.
  const stops = colors.map(hexToRgb);
  return (count) => {
    const out = [];
    for (let i = 0; i < count; i++) {
      const pos = stops.length === 1 ? 0 : (i * (stops.length - 1)) / Math.max(1, count - 1);
      const lo = Math.min(stops.length - 2, Math.floor(pos));
      const hi = lo + 1;
      const t = pos - lo;
      out.push(
        rgbToHex([
          lerp(stops[lo][0], stops[hi][0], t),
          lerp(stops[lo][1], stops[hi][1], t),
          lerp(stops[lo][2], stops[hi][2], t)
        ])
      );
    }
    return out;
  };
}