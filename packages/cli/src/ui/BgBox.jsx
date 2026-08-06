import { TextAttributes } from '@opentui/core';

// OpenTUI's <box> natively supports backgroundColor (unlike Ink, where only
// <text> could carry a background). This is now a thin convenience wrapper so
// existing call sites (width/bg/color/paddingX/paddingY/lines) don't change.
export function padBg(line, width) {
  const len = String(line ?? '').length;
  return len >= width ? line : line + ' '.repeat(width - len);
}

export function BgBox({ width, bg, color, paddingX = 0, paddingY = 0, paddingLeft, paddingRight, paddingTop, paddingBottom, lines = [], bold = false }) {
  const pL = paddingLeft ?? paddingX;
  const pR = paddingRight ?? paddingX;
  const pT = paddingTop ?? paddingY;
  const pB = paddingBottom ?? paddingY;
  return (
    <box flexDirection="column" width={width} backgroundColor={bg} paddingLeft={pL} paddingRight={pR} paddingTop={pT} paddingBottom={pB}>
      {lines.map((r, i) => (
        <text key={i} fg={color} attributes={bold ? TextAttributes.BOLD : 0}>{r}</text>
      ))}
    </box>
  );
}
