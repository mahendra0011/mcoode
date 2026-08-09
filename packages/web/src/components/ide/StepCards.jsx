import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Pencil, Terminal, FolderTree, GitBranch,
  Search, Globe, Loader2, CheckCircle2, XCircle, ChevronRight, ChevronDown,
  MousePointerClick, Camera, TreePine, AlertCircle, Undo
} from 'lucide-react';

// Diffs viewer using framer-motion stagger
const DiffViewer = ({ diffLines }) => {
  if (!diffLines || !Array.isArray(diffLines)) return null;

  return (
    <div className="mt-3 bg-[#0a0a0a] rounded-lg border border-white/5 overflow-hidden font-mono text-[11px] leading-relaxed">
      <motion.div 
        className="p-3 overflow-x-auto"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.03 } }
        }}
      >
        {diffLines.map((line, i) => {
          let colorClass = 'text-white/60';
          let bgClass = 'bg-transparent';
          let prefix = ' ';
          
          if (line.kind === 'add') {
            colorClass = 'text-emerald-400';
            bgClass = 'bg-emerald-500/10';
            prefix = '+';
          } else if (line.kind === 'remove') {
            colorClass = 'text-red-400 line-through';
            bgClass = 'bg-red-500/10';
            prefix = '-';
          }

          return (
            <motion.div 
              key={i}
              variants={{
                hidden: { opacity: 0, x: -5 },
                visible: { opacity: 1, x: 0 }
              }}
              className={`flex items-start px-2 py-0.5 whitespace-pre ${bgClass} ${colorClass}`}
            >
              <span className="select-none opacity-50 mr-3 w-3 text-right">{prefix}</span>
              <span>{line.text}</span>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

// Terminal viewer
const TerminalViewer = ({ output }) => {
  if (!output) return null;
  const lines = output.split('\n');

  return (
    <div className="mt-3 bg-[#0a0a0a] rounded-lg border border-white/5 overflow-hidden font-mono text-[11px] leading-relaxed">
      <motion.div 
        className="p-3 overflow-x-auto custom-scrollbar max-h-[300px]"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.015 } }
        }}
      >
        {lines.map((line, i) => (
          <motion.div 
            key={i}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 }
            }}
            className="whitespace-pre text-white/70"
          >
            {line || ' '}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

// Accessibility snapshot tree renderer
const SnapshotTree = ({ snapshot }) => {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const [expanded, setExpanded] = useState({});

  const toggle = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const renderNode = (node, depth = 0) => {
    if (!node || typeof node !== 'object') return null;
    const label = node.name || node.role || node.value || 'node';
    const children = node.children || (node.items ? node.items : []);
    const hasChildren = Array.isArray(children) && children.length > 0;
    const key = `${depth}-${label}-${Math.random().toString(36).slice(2, 8)}`;
    const isOpen = expanded[key];

    return (
      <div key={key} style={{ marginLeft: depth * 12 }}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1 cursor-pointer hover:bg-white/5 rounded px-1"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) toggle(key); }}
        >
          {hasChildren ? (
            <span className="text-white/40 w-3 text-center text-[10px]">
              {isOpen ? '▼' : '▶'}
            </span>
          ) : (
            <span className="w-3" />
          )}
          <span className="text-[11px] text-white/70 truncate">{label}</span>
          {node.value && <span className="text-[10px] text-white/40 ml-auto">"{node.value}"</span>}
        </motion.div>
        {hasChildren && (
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                {children.map((child, i) => (
                  <motion.div
                    key={child.name || child.role || i}
                    initial={{ opacity: 0, x: -3 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    {renderNode(child, depth + 1)}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  return (
    <div className="mt-2 bg-[#0a0a0a] rounded-lg border border-white/5 overflow-hidden max-h-[300px] overflow-y-auto p-2 font-mono text-[11px]">
      <div className="text-white/40 mb-1 text-[10px]">Accessibility Tree</div>
      {renderNode(snapshot, 0)}
    </div>
  );
};

// Console error list renderer
const ConsoleErrorList = ({ errors }) => {
  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    return (
      <div className="mt-2 text-[11px] text-emerald-400">No console errors detected.</div>
    );
  }

  return (
    <div className="mt-2 bg-[#0a0a0a] rounded-lg border border-white/5 overflow-hidden font-mono text-[11px]">
      <motion.div
        className="p-2 space-y-1"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
        }}
      >
        {errors.slice(0, 20).map((err, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, x: -5 },
              visible: { opacity: 1, x: 0 }
            }}
            className="p-2 bg-red-500/10 border border-red-500/20 text-red-300 rounded text-[10px] leading-relaxed break-words"
          >
            <span className="text-red-400 font-medium">[{err.type || err.source || 'error'}]</span>
            <span className="ml-1">{err.text || err.message || String(err)}</span>
          </motion.div>
        ))}
        {errors.length > 20 && (
          <div className="text-[10px] text-white/30">
            +{errors.length - 20} more errors truncated.
          </div>
        )}
      </motion.div>
    </div>
  );
};

export function StepCard({ msg, undo }) {
  const [expanded, setExpanded] = useState(msg.status !== 'done');
  const [actionTaken, setActionTaken] = useState(false);
  
  // Keep expanded open while running, auto-collapse when done if desired, but here we just let user control it
  // Re-sync expanded if status changes to done and it was running? (Optional)

  const isRunning = msg.status === 'running';
  const isFailed = msg.status === 'failed';
  const isDone = msg.status === 'done';

  let Icon = FileText;
  let title = 'Working...';
  let color = 'text-white/50';

  // Map tools to icons & titles
  switch (msg.tool) {
    case 'read_file':
      Icon = FileText;
      title = `Read ${msg.path || msg.args}`;
      color = 'text-blue-400';
      break;
    case 'write_file':
      Icon = Pencil;
      title = msg.created ? `Created ${msg.path}` : `Wrote ${msg.path || msg.args}`;
      color = 'text-emerald-400';
      break;
    case 'edit_file':
      Icon = Pencil;
      title = `Edited ${msg.path || msg.args}`;
      color = 'text-emerald-400';
      break;
    case 'run_shell':
      Icon = Terminal;
      title = `Run \`${msg.command || msg.args}\``;
      color = 'text-[#eab308]';
      break;
    case 'run_tests':
      Icon = Terminal;
      title = `Run tests`;
      color = 'text-[#eab308]';
      break;
    case 'list_files':
      Icon = FolderTree;
      title = msg.title || `Explore files`;
      color = 'text-blue-400';
      break;
    case 'search_code':
      Icon = Search;
      title = msg.title || `Search codebase`;
      color = 'text-purple-400';
      break;
    case 'git_status':
      Icon = GitBranch;
      title = msg.title || `Checked Git status`;
      color = 'text-orange-400';
      break;
    case 'web_search':
    case 'web_fetch':
      Icon = Globe;
      title = msg.title || `Web ${msg.tool === 'web_search' ? 'Search' : 'Fetch'}`;
      color = 'text-teal-400';
      break;
    case 'browser_navigate':
      Icon = Globe;
      title = `🌐 Navigate to ${msg.url || msg.path || '...'}`;
      color = 'text-blue-400';
      break;
    case 'browser_click':
    case 'browser_type':
      Icon = MousePointerClick;
      title = msg.tool === 'browser_click'
        ? `🖱️ Click ${msg.output ? `"${msg.output}"` : msg.args || ''}`
        : `⌨️ Type "${msg.output || ''}"`;
      color = 'text-purple-400';
      break;
    case 'browser_screenshot':
      Icon = Camera;
      title = msg.title || '📸 Browser screenshot';
      color = 'text-emerald-400';
      break;
    case 'browser_snapshot':
      Icon = TreePine;
      title = msg.title || '🌳 Accessibility snapshot';
      color = 'text-orange-400';
      break;
    case 'browser_get_console_errors':
      Icon = AlertCircle;
      title = msg.title || 'Console errors';
      color = 'text-red-400';
      break;
    default:
      title = `Tool: ${msg.tool}`;
      break;
  }

  // Determine duration if we have a timestamp
  let durationStr = '';
  if (msg.timestamp && isDone) {
    const s = ((Date.now() - msg.timestamp) / 1000).toFixed(1);
    durationStr = `${s}s`;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full bg-[#151515] rounded-xl border border-white/5 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isRunning ? (
                <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 className={`w-4 h-4 animate-spin ${color}`} />
                </motion.div>
              ) : isFailed ? (
                <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <XCircle className="w-4 h-4 text-red-400" />
                </motion.div>
              ) : (
                <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <CheckCircle2 className={`w-4 h-4 ${color}`} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="text-[13px] font-medium text-white/90">{title}</span>
	        </div>
	        
		        <div className="flex items-center gap-3">
		          {/* Screenshot thumbnail when collapsed */}
		          {!expanded && msg.tool === 'browser_screenshot' && msg.image && (
		            <motion.div
		              layoutId={`screenshot-thumb-${msg.id || ''}`}
		              className="w-12 h-8 rounded overflow-hidden border border-white/5 bg-[#0a0a0a]"
		            >
		              <img src={msg.image} alt="screenshot" className="w-full h-full object-cover" />
		            </motion.div>
		          )}
	          {durationStr && <span className="text-[11px] font-mono text-white/30">{durationStr}</span>}
	          {/* Undo button visible in collapsed header for done edit blocks */}
	          {!expanded && isDone && !actionTaken && (msg.tool === 'write_file' || msg.tool === 'edit_file') && (
	            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
	              onClick={(e) => { e.stopPropagation(); setActionTaken('undone'); undo?.(msg); }}
	              className="p-1 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded transition"
	              title="Undo change"
	            >
	              <Undo className="w-3.5 h-3.5" />
	            </motion.button>
	          )}
	          {expanded ? (
	            <ChevronDown className="w-3.5 h-3.5 text-white/30" />
	          ) : (
	            <ChevronRight className="w-3.5 h-3.5 text-white/30" />
	          )}
		        </div>
	      </motion.div>

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 }
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="border-t border-white/5 bg-[#111111]"
          >
            <div className="p-3">
              {isFailed && (
                <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">
                  {msg.error || 'Unknown error occurred.'}
                </div>
              )}
              
              {/* Write/Edit -> Diff */}
              {(msg.tool === 'write_file' || msg.tool === 'edit_file') && msg.diffLines && (
                <DiffViewer diffLines={msg.diffLines} />
              )}
              
              {/* Read / Web Fetch -> Lines */}
              {(msg.tool === 'read_file' || msg.tool === 'web_fetch') && msg.lines && (
                <TerminalViewer output={msg.lines.join('\n')} />
              )}

              {/* Command / Search -> Output */}
              {(msg.tool === 'run_shell' || msg.tool === 'run_tests' || msg.tool === 'list_files' || msg.tool === 'search_code' || msg.tool === 'web_search' || msg.tool === 'git_status') && msg.output && (
                <TerminalViewer output={msg.output} />
              )}

              {/* Browser screenshot — inline image */}
              {msg.tool === 'browser_screenshot' && msg.image && (
                <div className="mt-2 rounded-lg overflow-hidden border border-white/5 bg-[#0a0a0a]">
                  <motion.img
                    layoutId={`screenshot-thumb-${msg.id || ''}`}
                    src={msg.image}
                    alt="Browser screenshot"
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              )}

              {/* Browser accessibility snapshot — tree view */}
              {msg.tool === 'browser_snapshot' && msg.snapshot && (
                <SnapshotTree snapshot={msg.snapshot} />
              )}

              {/* Browser console errors */}
              {msg.tool === 'browser_get_console_errors' && msg.errors && (
                <ConsoleErrorList errors={msg.errors} />
              )}

              {/* Fallback Args */}
              {!msg.diffLines && !msg.lines && !msg.output && !msg.image && !msg.snapshot && !msg.errors && msg.args && (
                <div className="p-2 bg-white/5 rounded border border-white/5 font-mono text-[11px] text-white/50 break-all">
                  {typeof msg.args === 'string' ? msg.args : JSON.stringify(msg.args, null, 2)}
                </div>
              )}

              {/* Action Bar for Edits */}
              {isDone && !actionTaken && (msg.tool === 'write_file' || msg.tool === 'edit_file') && (
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/5 pt-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
                    onClick={(e) => { e.stopPropagation(); setActionTaken('undone'); undo?.(msg); }}
                    className="px-3 py-1.5 text-[11px] font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded transition"
                  >
                    ✕ Undo
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
                    onClick={(e) => { e.stopPropagation(); setActionTaken('kept'); }}
                    className="px-3 py-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition"
                  >
                    ✓ Keep
                  </motion.button>
                </div>
              )}
              {actionTaken === 'undone' && (
                <div className="mt-3 pt-2 text-center text-[10px] font-medium text-red-400 border-t border-white/5">
                  Change reverted.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
