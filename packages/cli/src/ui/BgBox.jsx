import { TextAttributes } from '@opentui/core';

// OpenTUI's <box> natively supports backgroundColor (unlike Ink, where only
// <text> could carry a background). This is now a thin convenience wrapper so
// existing call sites (width/bg/color/paddingX/paddingY/lines) don't change.
export function padBg(line, width) {
  const len = String(line ?? '').length;
  return len >= width ? line : line + ' '.repeat(width - len);
}

export function BgBox({ width, bg, color, paddingX = 0, paddingY = 0, lines = [], bold = false }) {
  return (
    <box flexDirection="column" width={width} backgroundColor={bg} paddingLeft={paddingX} paddingRight={paddingX} paddingTop={paddingY} paddingBottom={paddingY}>
      {lines.map((r, i) => (
        <text key={i} fg={color} attributes={bold ? TextAttributes.BOLD : 0}>{r}</text>
      ))}
    </box>
  );
}
