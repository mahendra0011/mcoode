import React, { useState, useEffect } from 'react';
import { Search, FileText, Pencil, Terminal, GitBranch, Globe, Check, X, Loader2, ChevronDown, ChevronRight, FolderTree } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TOOL_ICONS = {
  read_file: FileText,
  write_file: Pencil,
  edit_file: Pencil,
  run_shell: Terminal,
  run_tests: Terminal,
  list_files: FolderTree,
  search_code: Search,
  git_status: GitBranch,
  web_search: Globe,
  web_fetch: Globe
};

const DiffViewer = ({ diffLines }) => {
  if (!diffLines || !diffLines.length) return null;
  return (
    <div className="mt-2 text-[13px] font-mono bg-black/40 p-3 rounded-lg border border-white/5 overflow-x-auto custom-scrollbar">
      {diffLines.map((line, idx) => {
        let lineClass = 'text-white/60';
        let prefix = ' ';
        if (line.kind === 'add') {
          lineClass = 'text-green-400 bg-green-500/10 px-1 -mx-1';
          prefix = '+';
        } else if (line.kind === 'remove') {
          lineClass = 'text-red-400 bg-red-500/10 px-1 -mx-1 line-through opacity-80';
          prefix = '-';
        }
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.02 }}
            className={`whitespace-pre ${lineClass}`}
          >
            <span className="opacity-40 select-none mr-2">{prefix}</span>
            {line.text}
          </motion.div>
        );
      })}
    </div>
  );
};

const TerminalViewer = ({ output }) => {
  if (!output) return null;
  return (
    <div className="mt-2 text-[13px] font-mono bg-black/50 p-3 rounded-lg border border-white/5 overflow-x-auto custom-scrollbar max-h-64">
      {output.split('\n').map((line, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: Math.min(idx * 0.015, 1) }}
          className="whitespace-pre text-white/80"
        >
          {line}
        </motion.div>
      ))}
    </div>
  );
};

export const StepCard = ({ msg, undo }) => {
  const [expanded, setExpanded] = useState(msg.status === 'failed' || msg.status === 'running');
  const [actionTaken, setActionTaken] = useState(false);
  const [duration, setDuration] = useState('');

  // Automatically update duration while running
  useEffect(() => {
    if (msg.status === 'running' && msg.timestamp) {
      const interval = setInterval(() => {
        setDuration(((Date.now() - msg.timestamp) / 1000).toFixed(1) + 's');
      }, 100);
      return () => clearInterval(interval);
    } else if (msg.timestamp) {
      // Calculate final duration if done
      setDuration(((Date.now() - msg.timestamp) / 1000).toFixed(1) + 's');
    }
  }, [msg.status, msg.timestamp]);

  const Icon = TOOL_ICONS[msg.tool] || Terminal;
  
  let title = msg.title || msg.tool;
  if (msg.tool === 'read_file') title = `Read ${msg.path || msg.args}`;
  if (msg.tool === 'write_file') title = msg.created ? `Created ${msg.path || msg.args}` : `Edited ${msg.path || msg.args}`;
  if (msg.tool === 'edit_file') title = `Edited ${msg.path || msg.args}`;
  if (msg.tool === 'run_shell' || msg.tool === 'run_tests') title = `Run ${msg.command || msg.args}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`border rounded-xl flex flex-col overflow-hidden backdrop-blur-sm transition-colors ${msg.status === 'failed' ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-white/5'}`}
    >
      <div 
        className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center text-white/50 bg-white/5 w-6 h-6 rounded-md flex-shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[13px] font-medium text-white/90 truncate flex-1">{title}</span>
        </div>
        
        <div className="flex items-center gap-3 pl-4 flex-shrink-0">
          {duration && <span className="text-[10px] text-white/40 font-mono">{duration}</span>}
          
          <AnimatePresence mode="wait">
            {msg.status === 'running' && (
              <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              </motion.div>
            )}
            {msg.status === 'done' && (
              <motion.div key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check className="w-4 h-4 text-green-400" />
              </motion.div>
            )}
            {msg.status === 'failed' && (
              <motion.div key="failed" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <X className="w-4 h-4 text-red-400" />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="text-white/30 ml-1">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              {msg.error && (
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 mb-2 whitespace-pre-wrap">
                  {msg.error}
                </div>
              )}
              
              {/* Specialized Renderers */}
              {(msg.tool === 'edit_file' || msg.tool === 'write_file') && <DiffViewer diffLines={msg.diffLines} />}
              {(msg.tool === 'run_shell' || msg.tool === 'run_tests' || msg.tool === 'list_files' || msg.tool === 'search_code' || msg.tool === 'git_status' || msg.tool === 'web_search') && <TerminalViewer output={msg.output} />}
              {(msg.tool === 'read_file' || msg.tool === 'web_fetch') && (
                <div className="mt-2 text-[12px] font-mono bg-black/30 p-3 rounded-lg border border-white/5 max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-wrap text-white/60">
                  {msg.lines ? msg.lines.join('\n') : msg.output}
                </div>
              )}

              {/* Action Bar for Edits — Undo / Keep buttons (matching IDE StepCards pattern) */}
              {msg.status === 'done' && !actionTaken && (msg.tool === 'write_file' || msg.tool === 'edit_file') && (
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/5 pt-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActionTaken('undone'); undo?.(msg); }}
                    className="px-3 py-1.5 text-[11px] font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded transition"
                  >
                    ✕ Undo
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActionTaken('kept'); }}
                    className="px-3 py-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition"
                  >
                    ✓ Keep
                  </button>
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
};
