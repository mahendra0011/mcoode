import { Box, Text } from 'ink';

// Ink's <Box backgroundColor> is a no-op (Box has no such prop; only <Text> supports
// backgroundColor via chalk). To render a solid background block we pad every line
// with spaces to the target width and color each line as a <Text>.
export function padBg(line, width) {
  const len = String(line ?? '').length;
  return len >= width ? line : line + ' '.repeat(width - len);
}

export function BgBox({ width, bg, color, paddingX = 0, paddingY = 0, lines = [], bold = false }) {
  const blank = ' '.repeat(Math.max(0, width));
  const rows = [];
  for (let i = 0; i < paddingY; i++) rows.push(blank);
  for (const l of lines) rows.push(padBg(' '.repeat(paddingX) + l, width));
  for (let i = 0; i < paddingY; i++) rows.push(blank);
  return (
    <Box flexDirection="column">
      {rows.map((r, i) => (
        <Text key={i} backgroundColor={bg} color={color} bold={bold}>{r}</Text>
      ))}
    </Box>
  );
}
