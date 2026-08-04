
/** Lightweight syntax-highlighted code block (regex-based, zero deps). */
const TOKEN_RE = [
  [/"((?:[^"\\]|\\.)*)"|'(?:[^'\\]|\\.)*'/g, 'text-mcode-amber'],
  [/\b(const|let|var|function|return|import|export|from|await|async|if|else|for|while|class|new|try|catch|throw|switch|case|default)\b/g, 'text-mcode-purple'],
  [/\/\/[^\n]*|#.*$/gm, 'text-gray-600'],
  [/\b\d+(\.\d+)?\b/g, 'text-mcode-teal'],
  [/\b(undefined|null|true|false)\b/g, 'text-mcode-blue'],
  [/[{}[\]();,.]/g, 'text-gray-500']
];

function highlightLine(line) {
  const out = [];
  const findNext = (from) => {
    let best = null;
    for (const [re, color] of TOKEN_RE) {
      re.lastIndex = from;
      const m = re.exec(line);
      if (m && (!best || m.index < best.index)) {
        best = { index: m.index, match: m[0], re: new RegExp(re.source, 'g'), color };
      }
    }
    return best;
  };
  let next = findNext(0);
  let i = 0;
  while (next && i < line.length) {
    if (next.index > i) {
      out.push(<span key={`t${i}`}>{line.slice(i, next.index)}</span>);
      i = next.index;
    }
    out.push(
      <span key={`h${i}`} className={next.color}>
        {next.match}
      </span>
    );
    i += next.match.length;
    next = findNext(i);
  }
  if (i < line.length) out.push(<span key={`e${i}`}>{line.slice(i)}</span>);
  return out;
}

export function CodeBlock({ code = '', language = 'js', showLineNumbers = true, maxHeight = 320 }) {
  const lines = String(code).split('\n');
  return (
    <div
      className="overflow-auto rounded-lg border border-mcode-border bg-[#070b0c] font-mono text-xs"
      style={{ maxHeight }}
    >
      <div className="flex items-center justify-between border-b border-mcode-border px-3 py-1.5">
        <span className="text-gray-500">{language}</span>
        <span className="text-gray-600">{lines.length} lines</span>
      </div>
      <pre className="p-3">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            {showLineNumbers && (
              <span className="w-8 shrink-0 select-none text-right pr-3 text-gray-700">{i + 1}</span>
            )}
            <span className="text-gray-300">{highlightLine(line) || '\u00a0'}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
