import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { CodeBlock } from '../ui/code-block.jsx';
import { Maximize2, Minimize2 } from 'lucide-react';

const SPIN_FRAMES = ['●', '◐', '◑', '◒', '◓', '◐'];
const READ_MAX = 15;
const CMD_MAX = 10;

function breadcrumbs(path) {
  return String(path || '').split('/').join(' › ');
}

function Spinner({ label, color = 'text-mcode-amber' }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % SPIN_FRAMES.length), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.span
      className={`inline-flex items-center gap-1 font-mono text-xs ${color}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        {SPIN_FRAMES[frame]}
      </motion.span>
      {label}
    </motion.span>
  );
}

/** Thought/Thinking block with typing dots — mirrors CLI blocks.jsx */
function ThoughtBlock({ text, live = false }) {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, [live]);

  const lines = (text || '').split('\n').filter(Boolean);
  return (
    <motion.div
      className="ml-8 border-l-2 border-mcode-border pl-3"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="font-mono text-xs text-mcode-amber mb-1">
        {live ? `Thinking${'.'.repeat(dots)}` : 'Thought'}
      </div>
      {lines.length > 0 && (
        <div className="font-mono text-xs text-gray-500 space-y-0.5">
          {lines.map((l, i) => {
            const match = l.match(/^(\s*)([-*]|\d+\.)\s(.*)/);
            const display = match ? `${match[1]}└─► ${match[3]}` : l;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="leading-relaxed"
              >
                {display}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/** Read tool result — file contents with breadcrumbs + syntax highlighting */
function ReadBlock({ msg }) {
  const [expanded, setExpanded] = useState(false);
  const lines = msg.lines || [];
  const truncated = lines.length > READ_MAX;
  const display = expanded ? lines : lines.slice(0, READ_MAX);
  const ext = msg.path?.split('.').pop() || 'js';

  return (
    <motion.div
      className="ml-8 rounded-lg border border-mcode-border bg-mcode-panel overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between border-b border-mcode-border px-3 py-1.5">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-mcode-amber">◯</span>
          <span className="text-gray-500">Read</span>
          <span className="text-gray-400 truncate max-w-xs" title={msg.path}>
            {breadcrumbs(msg.path)}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded p-0.5 text-gray-600 hover:text-gray-300"
        >
          {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
      </div>
      <CodeBlock
        code={display.join('\n')}
        language={ext}
        showLineNumbers={true}
        maxHeight={expanded ? 600 : 320}
      />
      {truncated && (
        <button
          onClick={() => setExpanded(true)}
          className="block w-full border-t border-mcode-border px-3 py-1 font-mono text-[10px] text-gray-600 hover:text-gray-300"
        >
          … {lines.length - READ_MAX} more lines — click to expand
        </button>
      )}
    </motion.div>
  );
}

/** Write/Create tool result — file contents with diff view */
function WriteBlock({ msg }) {
  const [expanded, setExpanded] = useState(false);
  const label = msg.created ? 'Create' : 'Write';
  const labelColor = msg.created ? 'text-mcode-teal' : 'text-mcode-blue';
  const lines = msg.lines || [];
  const truncated = lines.length > READ_MAX;
  const display = expanded ? lines : lines.slice(0, READ_MAX);
  const ext = msg.path?.split('.').pop() || 'js';

  return (
    <motion.div
      className="ml-8 rounded-lg border border-mcode-border bg-mcode-panel overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between border-b border-mcode-border px-3 py-1.5">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className={labelColor}>✏</span>
          <span className={labelColor}>{label}</span>
          <span className="text-gray-400 truncate max-w-xs" title={msg.path}>
            {breadcrumbs(msg.path)}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded p-0.5 text-gray-600 hover:text-gray-300"
        >
          {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
      </div>
      {msg.diffLines && msg.diffLines.length > 0 && (
        <DiffView diffLines={msg.diffLines} path={msg.path} />
      )}
      {lines.length > 0 && (!msg.diffLines?.length || expanded) && (
        <CodeBlock
          code={display.join('\n')}
          language={ext}
          showLineNumbers={true}
          maxHeight={expanded ? 600 : 320}
        />
      )}
      {truncated && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="block w-full border-t border-mcode-border px-3 py-1 font-mono text-[10px] text-gray-600 hover:text-gray-300"
        >
          … {lines.length - READ_MAX} more lines — click to expand
        </button>
      )}
    </motion.div>
  );
}

/** Diff view — green/red colored lines with add/remove counts */
function DiffView({ diffLines, path }) {
  const [expanded, setExpanded] = useState(false);
  const adds = diffLines.filter((l) => l.kind === 'add').length;
  const rms = diffLines.filter((l) => l.kind === 'remove').length;
  const maxRows = 40;
  const truncated = diffLines.length > maxRows;
  const display = expanded ? diffLines : diffLines.slice(0, maxRows);
  const badge = adds > 0 && rms === 0 && diffLines.length === adds ? '[NEW]' : '[EDIT]';

  return (
    <motion.div
      className="border-t border-mcode-border"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between border-b border-mcode-border px-3 py-1">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className={adds > 0 && rms === 0 && diffLines.length === adds ? 'text-mcode-teal' : 'text-mcode-amber'}>
            {badge}
          </span>
          {adds > 0 && <span className="text-mcode-green">+{adds}</span>}
          {rms > 0 && <span className="text-mcode-red">-{rms}</span>}
        </div>
        {truncated && (
          <button onClick={() => setExpanded(!expanded)} className="rounded p-0.5 text-gray-600 hover:text-gray-300">
            {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
        )}
      </div>
      <pre className="overflow-auto font-mono text-xs" style={{ maxHeight: expanded ? 500 : 240 }}>
        <div className="p-2">
          {display.map((line, i) => {
            const isAdd = line.kind === 'add';
            const isRemove = line.kind === 'remove';
            const bg = isAdd ? 'bg-mcode-green/5' : isRemove ? 'bg-mcode-red/5' : '';
            const color = isAdd ? 'text-mcode-green' : isRemove ? 'text-mcode-red' : 'text-gray-600';
            const prefix = isAdd ? '+' : isRemove ? '-' : ' ';
            return (
              <div key={i} className={`leading-tight ${color} ${bg} pl-1`}>
                <span className="opacity-50">{prefix}</span> {line.text || line}
              </div>
            );
          })}
        </div>
      </pre>
      {truncated && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="block w-full border-t border-mcode-border px-3 py-1 font-mono text-[10px] text-gray-600 hover:text-gray-300"
        >
          … {diffLines.length - maxRows} more lines — click to expand
        </button>
      )}
    </motion.div>
  );
}

/** Command output — terminal-style with $ prompt */
function CommandBlock({ msg }) {
  const [expanded, setExpanded] = useState(false);
  const out = String(msg.output || '').split('\n');
  const truncated = out.length > CMD_MAX;
  const display = expanded ? out : out.slice(0, CMD_MAX);

  return (
    <motion.div
      className="ml-8 rounded-lg border border-mcode-border bg-mcode-panel overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="border-b border-mcode-border px-3 py-1.5">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-mcode-purple">▶</span>
          {msg.title && <span className="text-gray-500">{msg.title}</span>}
          {msg.command && (
            <span className="flex items-center gap-1">
              <span className="text-mcode-green">$</span>
              <span className="text-gray-200 break-all">{msg.command}</span>
            </span>
          )}
        </div>
      </div>
      {msg.output && (
        <pre
          className="overflow-auto font-mono text-xs text-gray-400"
          style={{ maxHeight: expanded ? 500 : 200 }}
        >
          <div className="p-2">
            {display.map((line, i) => (
              <div key={i} className="leading-tight">
                {line || ' '}
              </div>
            ))}
          </div>
        </pre>
      )}
      {truncated && (
        <button
          onClick={() => setExpanded(true)}
          className="block w-full border-t border-mcode-border px-3 py-1 font-mono text-[10px] text-gray-600 hover:text-gray-300"
        >
          … {out.length - CMD_MAX} more lines — click to expand
        </button>
      )}
    </motion.div>
  );
}

/** Todo list with progress bar [████····] 50% */
function TodoBlock({ msg }) {
  const items = msg.items || [];
  const total = items.length;
  const done = items.filter((t) => t.status === 'done').length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const filled = Math.round((percent / 100) * 20);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);

  const statusColor = (s) =>
    s === 'done' ? 'text-mcode-green'
    : s === 'running' ? 'text-mcode-amber'
    : s === 'failed' ? 'text-mcode-red'
    : 'text-gray-600';

  const statusIcon = (s) =>
    s === 'done' ? '✓' : s === 'running' ? '●' : s === 'failed' ? '✗' : '○';

  return (
    <motion.div
      className="ml-8 rounded-lg border border-mcode-border bg-mcode-panel p-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="font-mono text-xs">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-mcode-purple">≡</span>
          <span className="text-gray-300 font-bold">Todos</span>
          <span className="text-gray-600"> {done}/{total}</span>
          <span className="text-gray-600">[{bar}] {percent}%</span>
        </div>
        <div className="space-y-0.5 pl-1">
          {items.map((t, i) => (
            <motion.div
              key={t.id || i}
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className={statusColor(t.status)}>{statusIcon(t.status)}</span>
              <span className="text-gray-600">[{t.domain}]</span>
              <span className={t.status === 'done' ? 'text-gray-500' : 'text-gray-200'}>{t.title}</span>
              {t.dependsOn && t.dependsOn.length > 0 && (
                <span className="text-gray-600">(waits: {t.dependsOn.join(', ')})</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/** Permission prompt block */
function PermissionBlock({ msg }) {
  const pending = msg.status === 'running' && msg.permission === 'pending';
  return (
    <motion.div
      className="ml-8 rounded-lg border border-mcode-amber/30 bg-mcode-amber/5 p-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 font-mono text-xs">
        {pending ? (
          <>
            <span className="text-mcode-amber">?</span>
            <span className="text-gray-400">Allow running:</span>
            <span className="text-gray-200 break-all">{msg.command}</span>
          </>
        ) : (
          <>
            <span className={msg.approved ? 'text-mcode-green' : 'text-mcode-red'}>
              {msg.approved ? '✓' : '✗'}
            </span>
            <span className="text-gray-500">{msg.approved ? 'Approved' : 'Denied'}</span>
            <span className="text-gray-400 break-all">{msg.command}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

/** File change summary with totals */
function SummaryBlock({ msg }) {
  const files = msg.files || [];
  const hasFiles = files.length > 0;

  if (!hasFiles && msg.content) {
    return (
      <motion.div
        className="ml-8 rounded-md border border-mcode-green/30 bg-mcode-green/5 px-3 py-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="font-mono text-xs text-mcode-green">✓ {msg.content}</span>
      </motion.div>
    );
  }

  const totalAdded = files.reduce((s, f) => s + (f.added || 0), 0);
  const totalRemoved = files.reduce((s, f) => s + (f.removed || 0), 0);

  return (
    <motion.div
      className="ml-8 rounded-lg border border-mcode-green/30 bg-mcode-green/5 p-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="font-mono text-xs">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-mcode-green">✓</span>
          <span className="text-gray-300">
            Changed {files.length} {files.length === 1 ? 'file' : 'files'}
          </span>
          <span className="text-gray-600">
            Total: +{totalAdded}/-{totalRemoved}
          </span>
        </div>
        <div className="space-y-0.5 pl-1">
          {files.map((f) => (
            <div key={f.path} className="flex items-center justify-between font-mono text-xs">
              <span className="text-gray-400">{f.path}</span>
              {f.created ? (
                <span className="text-mcode-teal">(new)</span>
              ) : (
                <span>
                  <span className="text-mcode-green">+{f.added || 0}</span>
                  <span className="text-gray-600">/</span>
                  <span className="text-mcode-red">-{f.removed || 0}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/** Interrupt indicator */
function InterruptBlock() {
  return (
    <motion.div
      className="ml-8 rounded-md border border-mcode-red/30 bg-mcode-red/5 px-3 py-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="font-mono text-xs text-mcode-red">✗ Interrupted by user</span>
    </motion.div>
  );
}

/** System / ok / err / warn message */
function SystemBlock({ msg }) {
  let color = 'text-gray-600';
  let icon = '●';
  if (msg.kind === 'err') { color = 'text-mcode-red'; icon = '✗'; }
  if (msg.kind === 'warn') { color = 'text-mcode-amber'; icon = '!'; }
  if (msg.kind === 'ok') { color = 'text-mcode-green'; icon = '✓'; }
  return (
    <motion.div
      className={`ml-8 rounded-md border border-mcode-border/30 bg-mcode-panel/20 px-3 py-1 ${color}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="font-mono text-xs">
        <span className="font-bold">{icon}</span> {msg.content || msg.text}
      </span>
    </motion.div>
  );
}

/** Running tool call card for right sidebar */
export function ToolCallCard({ call }) {
  return (
    <motion.div
      className="rounded-md border border-mcode-border bg-mcode-panel/40 p-2"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
    >
      <div className="flex items-center gap-1.5 font-mono text-xs">
        <Spinner label="" color="text-mcode-green" />
        <span className="text-mcode-green">{call.tool || 'tool'}</span>
        <span className="text-gray-500">running…</span>
      </div>
    </motion.div>
  );
}

/** Render a single message into the appropriate block component */
function renderMessage(msg) {
  const { role, kind, block, status, error } = msg;
  const key = msg.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ── Tool messages ──
  if (kind === 'tool') {
    if (status === 'running' && !block) {
      return (
        <motion.div
          key={key}
          className="ml-8 border-l-2 border-mcode-green/30 pl-3"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
        >
          <Spinner label={`${msg.tool || 'tool'} running…`} color="text-mcode-green" />
        </motion.div>
      );
    }

    if (status === 'running' && block === 'permission') {
      return <PermissionBlock key={key} msg={msg} />;
    }

    if (block) {
      return (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {block === 'read' && <ReadBlock msg={msg} />}
          {block === 'write' && <WriteBlock msg={msg} />}
          {block === 'edit' && <WriteBlock msg={{ ...msg, created: false }} />}
          {block === 'command' && <CommandBlock msg={msg} />}
          {block === 'permission' && <PermissionBlock msg={msg} />}
          {block === 'summary' && <SummaryBlock msg={msg} />}
          {block === 'tool' && <SystemBlock msg={msg} />}
        </motion.div>
      );
    }

    if (status === 'failed' || error) {
      return (
        <motion.div
          key={key}
          className="ml-8 rounded-lg border border-mcode-red/30 bg-mcode-red/5 p-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="font-mono text-xs text-mcode-red">
            ✗ {msg.tool || 'tool'} failed: {error || 'unknown error'}
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={key}
        className="ml-8 rounded-lg border border-mcode-border bg-mcode-panel p-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="font-mono text-xs text-gray-400">
          {msg.tool}: {msg.output || msg.title || 'ok'}
        </div>
      </motion.div>
    );
  }

  // ── Stream / thinking ──
  if (kind === 'stream' && (msg.text || msg.content)) {
    return (
      <motion.div
        key={key}
        className="ml-8 border-l-2 border-mcode-border pl-3"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="font-mono text-xs text-gray-300 whitespace-pre-wrap break-words">
          {msg.text || msg.content}
          {msg.streaming && (
            <motion.span
              className="inline-block w-2 bg-mcode-green"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
            >
              |
            </motion.span>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Thinking narration ──
  if (kind === 'system' && msg.text && msg.text.toLowerCase().includes('think')) {
    return <ThoughtBlock key={key} text={msg.text || msg.content} live={msg.streaming} />;
  }

  // ── System / ok / err / warn / interrupt / summary ──
  if (['system', 'ok', 'err', 'warn', 'interrupt', 'summary'].includes(kind)) {
    if (kind === 'summary') return <SummaryBlock key={key} msg={msg} />;
    if (kind === 'interrupt') return <InterruptBlock key={key} />;
    return <SystemBlock key={key} msg={msg} />;
  }

  // ── Assistant text ──
  if (role === 'assistant') {
    return (
      <motion.div
        key={key}
        className="flex items-start gap-2.5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="text-mcode-green shrink-0 mt-0.5">mcode</span>
        <div className="font-mono text-sm text-gray-300 whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  // ── User message ──
  if (role === 'user') {
    return (
      <motion.div
        key={key}
        className="flex items-start gap-2.5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="text-gray-500 shrink-0 mt-0.5">you</span>
        <div className="font-mono text-sm text-gray-200 whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  // ── Todo list ──
  if (kind === 'todo') {
    return <TodoBlock key={key} msg={msg} />;
  }

  return null;
}

export function MessageList({ mode, isGenerating, maxHeight }) {
  const messages = useSelector((s) => s.chat.messages || []);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6" ref={containerRef} style={maxHeight ? { maxHeight } : {}}>
        <div className="flex h-full items-center justify-center">
          <p className="font-mono text-sm text-gray-600">
            {mode === 'chat'
              ? 'Start a conversation with mcode.'
              : 'Start a conversation or type /help for available commands.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" ref={containerRef} style={maxHeight ? { maxHeight } : {}}>
      <div className="mx-auto max-w-3xl">
        <AnimatePresence>
          {messages.map((msg) => renderMessage(msg))}
        </AnimatePresence>
        {isGenerating && (
          <motion.div
            className="ml-8 font-mono text-xs text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Spinner label="thinking" color="text-mcode-green" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
