import { useEffect, useState } from 'react';

export function TerminalWindow({ title = 'mcode', lines = [], height = 260, delay = 120 }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= lines.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), delay);
    return () => clearTimeout(t);
  }, [visible, lines.length, delay]);

  return (
    <div className="terminal-card overflow-hidden font-mono text-xs shadow-2xl shadow-mcode-green/5">
      <div className="flex items-center gap-2 border-b border-mcode-border px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-gray-500">{title}</span>
      </div>
      <div className="p-4" style={{ height, overflow: 'hidden' }}>
        {lines.slice(0, visible).map((line, i) => (
          <div key={i} className={line.color || 'text-gray-300'}>
            <span className="select-none text-gray-700">{String(i + 1).padStart(2, '0')}</span>{' '}
            {line.text}
          </div>
        ))}
        {visible < lines.length && (
          <span className="inline-block h-4 w-2 animate-pulse bg-mcode-green align-middle" />
        )}
      </div>
    </div>
  );
}
