import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, GitCommit, Download, Upload, RefreshCw,
  FolderGit2, Tag, Trash2, Terminal, Search, ChevronDown,
  Play, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';

/**
 * McodeGitToolsTab — Git tools reference.
 *
 * Covers the gitService (from architecture), Source Control panel
 * operations, and terminal git commands — all verified against the
 * actual mcode IDE implementation.
 */

const GIT_OPERATIONS = [
  { icon: RefreshCw, label: 'Git Status', desc: 'Show working tree status, staged/unstaged changes', category: 'read' },
  { icon: CheckCircle2, label: 'Stage All', desc: 'git add . — stage all modified files', category: 'stage' },
  { icon: GitCommit, label: 'Commit', desc: 'git commit -m "message" — commit staged changes', category: 'commit' },
  { icon: Upload, label: 'Push', desc: 'git push — upload to remote branch', category: 'push' },
  { icon: Download, label: 'Pull', desc: 'git pull — fetch and merge from remote', category: 'pull' },
  { icon: FolderGit2, label: 'Clone', desc: 'git clone <url> — clone a remote repository', category: 'read' },
  { icon: GitBranch, label: 'Checkout', desc: 'git checkout <branch> — switch branches', category: 'branch' },
  { icon: RefreshCw, label: 'Fetch', desc: 'git fetch — download without merging', category: 'read' },
  { icon: Tag, label: 'Tags', desc: 'git tag — list and manage tags', category: 'read' },
  { icon: Trash2, label: 'Stash', desc: 'git stash — temporarily save changes', category: 'stage' },
];

const GIT_TERMINAL_SNIPPETS = [
  'git status',
  'git add .',
  'git commit -m ""',
  'git push',
  'git pull',
  'git branch',
  'git checkout',
  'git diff',
  'git log --oneline',
  'git stash list',
];

const BRANCH_OPS = [
  { label: 'Create Branch', shortcut: 'Ctrl+Shift+N', color: 'text-blue-400' },
  { label: 'Switch Branch', shortcut: 'Ctrl+Shift+B', color: 'text-purple-400' },
  { label: 'Merge into Current', shortcut: 'Ctrl+Shift+M', color: 'text-emerald-400' },
  { label: 'Rebase onto', shortcut: 'Ctrl+Shift+R', color: 'text-amber-400' },
];

const STATUS_TYPES = [
  { type: 'Modified', color: 'text-blue-400' },
  { type: 'Added (Staged)', color: 'text-emerald-400' },
  { type: 'Deleted', color: 'text-red-400' },
  { type: 'Untracked', color: 'text-white/40' },
];

export function McodeGitToolsTab() {
  const [expanded, setExpanded] = useState<string | null>('operations');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Git Tools</h2>
        <p className="text-sm text-white/40">Source control management via the gitService — panel operations, terminal commands, and quick snippets.</p>
      </div>

      {/* Git Service Overview */}
      <motion.div
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-emerald-400" />
          gitService — Architecture
        </h3>
        <p className="text-xs text-white/40 mb-3">
          The gitService (part of the 37 mcode services) provides unified source control operations
          across the IDE — panel, terminal, and editor integrations share the same underlying layer.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <ServiceCard name="Status" icon={RefreshCw} color="text-blue-400" desc="Working tree state" />
          <ServiceCard name="Commit" icon={GitCommit} color="text-purple-400" desc="Staged changes" />
          <ServiceCard name="Branch" icon={GitBranch} color="text-emerald-400" desc="Branch management" />
          <ServiceCard name="History" icon={Clock} color="text-amber-400" desc="Commit log" />
        </div>
      </motion.div>

      {/* Operations Tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { id: 'operations', label: 'Operations' },
          { id: 'branches', label: 'Branch Ops' },
          { id: 'terminal', label: 'Terminal Snippets' },
          { id: 'status', label: 'Status Types' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setExpanded(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              expanded === tab.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#0e0e0e] text-white/40 border border-white/5 hover:text-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Operations */}
        {expanded === 'operations' && (
          <motion.div
            key="ops"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {GIT_OPERATIONS.map((op) => {
              const Icon = op.icon;
              return (
                <motion.div
                  key={op.label}
                  whileHover={{ scale: 1.02 }}
                  className="bg-[#0e0e0e] border border-white/5 rounded-lg p-3 flex items-start gap-3"
                >
                  <Icon className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white/80">{op.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.25 rounded ${
                        op.category === 'read' ? 'bg-blue-500/10 text-blue-400' :
                        op.category === 'stage' ? 'bg-amber-500/10 text-amber-400' :
                        op.category === 'commit' ? 'bg-purple-500/10 text-purple-400' :
                        op.category === 'push' ? 'bg-emerald-500/10 text-emerald-400' :
                        op.category === 'pull' ? 'bg-cyan-500/10 text-cyan-400' :
                        op.category === 'branch' ? 'bg-indigo-500/10 text-indigo-400' :
                        'bg-white/10 text-white/40'
                      }`}>
                        {op.category}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">{op.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Branch Ops */}
        {expanded === 'branches' && (
          <motion.div
            key="branches"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-2"
          >
            {BRANCH_OPS.map((op) => (
              <motion.div
                key={op.label}
                whileHover={{ scale: 1.01 }}
                className="flex items-center justify-between bg-[#0e0e0e] border border-white/5 rounded-lg px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <GitBranch className={`w-4 h-4 ${op.color}`} />
                  <span className="text-sm text-white/80">{op.label}</span>
                </div>
                <code className="text-xs text-white/40 bg-[#050505] px-1.5 py-0.5 rounded">{op.shortcut}</code>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Terminal Snippets */}
        {expanded === 'terminal' && (
          <motion.div
            key="terminal"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="bg-[#050505] border border-white/5 rounded-lg p-4 font-mono text-sm space-y-1"
          >
            {GIT_TERMINAL_SNIPPETS.map((cmd, i) => (
              <motion.div
                key={cmd}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-2"
              >
                <span className="text-white/30">#</span>
                <span className="text-emerald-400">{cmd.split(' ')[0]}</span>
                <span className="text-white/60">{cmd.replace(/^(\S+\s)/, '')}</span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Status Types */}
        {expanded === 'status' && (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-2"
          >
            {STATUS_TYPES.map((s) => (
              <div key={s.type} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'currentColor' }} />
                <span className={`text-sm font-medium ${s.color}`}>{s.type}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ServiceCard({ name, icon: Icon, color, desc }: {
  name: string; icon: any; color: string; desc: string;
}) {
  return (
    <motion.div
      className="bg-[#0e0e0e] border border-white/5 rounded-lg p-3 text-center"
      whileHover={{ scale: 1.03 }}
    >
      <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
      <div className="text-xs font-medium text-white/80">{name}</div>
      <div className="text-[10px] text-white/40 mt-0.5">{desc}</div>
    </motion.div>
  );
}
