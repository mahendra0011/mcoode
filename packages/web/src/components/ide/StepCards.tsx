import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCode,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle,
  Terminal,
  FolderSearch,
  Search,
  FileText,
  Pencil
} from 'lucide-react';
import { ToolCallCard, TerminalOutput, WroteFile, DiffBlock } from '../chat/mcodeUX';
import { WebSearchAnimation, WebFetchAnimation } from '../chat/SearchAnimation';
import { SpinnerBlock } from '../chat/SpinnerBlock';
import { useIDEStore } from '../../store/ideStore';
import { reportError } from '../../lib/logger';
import type { ChatMessage, ToolArgs } from '../../types/chat';

export interface StepCardProps {
  msg: ChatMessage;
  undo?: (msg: ChatMessage) => void;
}

const LANG_COLOR: Record<string, string> = {
  js: '#f7df1e',
  javascript: '#f7df1e',
  html: '#e34c26',
  css: '#264de4',
  py: '#3776ab',
  python: '#3776ab',
  rs: '#dea584',
  rust: '#dea584',
  ts: '#3178c6',
  typescript: '#3178c6',
  json: '#eab308',
  md: '#a855f7',
  jsx: '#61dafb',
  tsx: '#3178c6',
  sh: '#4ade80',
  bash: '#4ade80',
  sql: '#f97316',
};

function openInEditor(filePath: string) {
  const clean = filePath.replace(/^[./\\]+/, '').trim();
  useIDEStore.getState().addOpenFile(clean);
  useIDEStore.getState().setActivePath(clean);
  useIDEStore.getState().setWelcomeOpen(false);
}

interface ClaudeFileCardProps {
  tool: 'write_file' | 'edit_file';
  filename: string;
  filePath: string;
  lang: string;
  lines: number;
  added?: number;
  removed?: number;
  fileContent?: string;
  diffLines?: any[];
  status?: string;
  isCreated?: boolean;
}

/**
 * ClaudeFileCard — Claude-style file change card.
 * Shows compact row: [file-icon] [Created/Edited] [filename] [+lines] [-lines] [✓] [open-icon] [chevron]
 * Collapsed by default. Clicking expands line-by-line code with line numbers and diff styling.
 */
export function ClaudeFileCard({
  tool,
  filename,
  filePath,
  lang,
  lines,
  added = 0,
  removed = 0,
  fileContent = '',
  diffLines = [],
  status = 'done',
  isCreated = true,
}: ClaudeFileCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isRunning = status === 'running';
  const isFailed = status === 'failed';
  const isDone = status === 'done';

  const actionText = tool === 'write_file'
    ? (isCreated ? 'Created' : 'Updated')
    : 'Edited';

  const rawLines = useMemo(() => {
    if (diffLines && diffLines.length > 0) {
      return diffLines.map((l: any) => {
        if (typeof l === 'string') {
          return {
            type: l.startsWith('+') ? 'add' : l.startsWith('-') ? 'del' : 'same',
            text: l.replace(/^[+-]/, ''),
          };
        }
        return {
          type: l?.kind === 'add' ? 'add' : l?.kind === 'remove' ? 'del' : 'same',
          text: l?.text ?? String(l ?? ''),
        };
      });
    }
    if (fileContent) {
      return fileContent.split('\n').map((line) => ({
        type: 'same',
        text: line,
      }));
    }
    return [];
  }, [fileContent, diffLines]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = fileContent || rawLines.map((l) => l.text).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleOpenInEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    openInEditor(filePath || filename);
  };

  const extColor = LANG_COLOR[lang] || '#34d399';
  const lineCount = lines > 0 ? lines : rawLines.length;

  return (
    <div className="w-full my-1.5 font-mono select-none">
      {/* Claude-style Collapsed Header Card */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen((prev) => !prev);
        }}
        className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
          open
            ? 'bg-[#181820] border-white/20 shadow-md'
            : 'bg-[#121217]/90 hover:bg-[#181820] border-white/10 hover:border-white/20'
        }`}
      >
        {/* Left: Icon, Action, File Name, Badges */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${extColor}15`, border: `1px solid ${extColor}30` }}
          >
            <FileCode size={13} style={{ color: extColor }} />
          </div>

          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            {actionText}
          </span>

          <span
            className="text-[12.5px] font-medium text-white truncate max-w-[220px]"
            title={filePath || filename}
          >
            {filename}
          </span>

          {/* Line Badges like Claude */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {tool === 'write_file' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                +{lineCount}
              </span>
            )}
            {tool === 'edit_file' && (
              <>
                {added > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    +{added}
                  </span>
                )}
                {removed > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                    -{removed}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Status, Editor Link, Chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isRunning && (
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <Loader2 size={13} className="animate-spin text-emerald-400" />
              <span className="hidden sm:inline text-[11px]">Writing…</span>
            </div>
          )}
          {isDone && !isFailed && (
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Check size={11} className="text-emerald-400" />
            </div>
          )}
          {isFailed && (
            <div className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertCircle size={11} className="text-rose-400" />
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenInEditor}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Open in editor"
          >
            <ExternalLink size={12} />
          </button>

          <ChevronRight
            size={13}
            className={`text-white/40 group-hover:text-white transition-transform duration-200 ${
              open ? 'rotate-90' : ''
            }`}
          />
        </div>
      </div>

      {/* Expanded Line-by-Line Code View */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 rounded-xl border border-white/10 bg-[#0d0d12] shadow-2xl overflow-hidden">
              {/* Code View Top Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#14141a] border-b border-white/[0.08] text-[11px] text-white/50">
                <span className="truncate font-mono">{filePath || filename}</span>
                <div className="flex items-center gap-2">
                  <span>{rawLines.length || lineCount} lines</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check size={11} className="text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Line-by-line render */}
              <div className="p-2 overflow-x-auto max-h-[380px] font-mono text-[12px] leading-relaxed custom-scrollbar select-text">
                {rawLines.length === 0 ? (
                  <div className="text-white/30 italic py-2 px-3">File created. Content preview ready in editor.</div>
                ) : (
                  rawLines.map((line, idx) => {
                    const isAdd = line.type === 'add';
                    const isDel = line.type === 'del';
                    return (
                      <div
                        key={idx}
                        className={`flex items-start hover:bg-white/[0.03] py-[1px] px-1 rounded ${
                          isAdd
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : isDel
                            ? 'bg-rose-500/10 text-rose-300 line-through'
                            : 'text-neutral-200'
                        }`}
                      >
                        {tool === 'edit_file' && (
                          <span
                            className={`w-4 select-none font-bold text-center shrink-0 ${
                              isAdd ? 'text-emerald-400' : isDel ? 'text-rose-400' : 'opacity-0'
                            }`}
                          >
                            {isAdd ? '+' : isDel ? '-' : ' '}
                          </span>
                        )}
                        <span className="w-9 text-right pr-3 select-none text-[11px] text-white/20 font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <span className="whitespace-pre overflow-x-visible flex-1">
                          {line.text || ' '}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StepCard({ msg, undo }: StepCardProps) {
  const isRunning = msg.status === 'running';
  const isFailed = msg.status === 'failed';
  const isDone = msg.status === 'done';

  if (msg.tool === 'web_search') {
    return (
      <div className="w-full max-w-lg mt-2 relative before:absolute before:inset-0 before:-left-[24px] before:w-[2px] before:bg-border/40 before:h-[calc(100%+16px)] before:-top-2">
        <WebSearchAnimation
          query={msg.searchResults?.query || msg.args?.query || msg.title || ''}
          status={isRunning ? 'searching' : 'done'}
          sources={msg.searchResults?.results || []}
        />
      </div>
    );
  }

  if (msg.tool === 'web_fetch') {
    return (
      <div className="w-full max-w-lg mt-2 relative before:absolute before:inset-0 before:-left-[24px] before:w-[2px] before:bg-border/40 before:h-[calc(100%+16px)] before:-top-2">
        <WebFetchAnimation msg={msg} status={isRunning ? 'fetching' : 'done'} />
      </div>
    );
  }

  function getCleanFilePath(m: ChatMessage): string {
    let raw = '';
    const rawArgs = m.args as any;
    if (typeof m.path === 'string' && m.path) {
      raw = m.path;
    } else if (typeof rawArgs === 'string') {
      const trimmed = rawArgs.trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          raw = parsed.path || parsed.file || '';
        } catch {
          const match = /"path"\s*:\s*"([^"]+)"/.exec(trimmed);
          if (match) raw = match[1];
        }
      } else {
        raw = rawArgs;
      }
    } else if (rawArgs && typeof rawArgs === 'object') {
      raw = rawArgs.path || rawArgs.file || '';
    }
    if (!raw && typeof m.title === 'string') {
      raw = m.title;
    }
    return raw.replace(/\\/g, '/');
  }

  function getDisplayFilename(filePath: string): string {
    if (!filePath) return 'file';
    const parts = filePath.split('/');
    return parts[parts.length - 1] || filePath;
  }

  function getFileLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || 'txt';
    return ext;
  }

  function getLineCount(m: ChatMessage): number {
    const rawArgs = m.args as any;
    if (Array.isArray(m.lines) && m.lines.length > 0) return m.lines.length;
    if (Array.isArray(m.diffLines) && m.diffLines.length > 0) return m.diffLines.length;
    if (typeof m.output === 'string' && m.output.trim() && !m.output.startsWith('{')) {
      return m.output.split('\n').length;
    }
    if (rawArgs && typeof rawArgs === 'object' && typeof rawArgs.content === 'string') {
      return rawArgs.content.split('\n').length;
    }
    if (typeof rawArgs === 'string' && rawArgs.includes('"content"')) {
      try {
        const p = JSON.parse(rawArgs);
        if (typeof p.content === 'string') return p.content.split('\n').length;
      } catch {
        return Math.max(1, Math.ceil(rawArgs.length / 80));
      }
    }
    return 0;
  }

  let type = 'explored';
  let label = 'Working...';
  let summary: string | ToolArgs = '';
  let content = null;

  switch (msg.tool) {
    case 'write_file': {
      type = 'wrote';
      label = msg.created ? 'Created' : 'Wrote';
      const filePath = getCleanFilePath(msg) || 'file';
      const displayFilename = getDisplayFilename(filePath);
      summary = displayFilename;
      const lang = getFileLanguage(displayFilename);
      const lines = getLineCount(msg);

      let fileContent = '';
      const rawArgs = msg.args as any;
      if (Array.isArray(msg.lines) && msg.lines.length > 0) {
        fileContent = msg.lines.join('\n');
      } else if (typeof rawArgs?.content === 'string') {
        fileContent = rawArgs.content;
      } else if (typeof msg.output === 'string' && msg.output && !msg.output.trim().startsWith('{')) {
        fileContent = msg.output;
      } else if (typeof rawArgs === 'string' && rawArgs.includes('"content"')) {
        try {
          const p = JSON.parse(rawArgs);
          if (typeof p.content === 'string') fileContent = p.content;
        } catch (err) { reportError('StepCard JSON parse', err, { userVisible: false }); }
      }

      return (
        <div className="w-full max-w-lg my-1 relative before:absolute before:inset-0 before:-left-[24px] before:w-[2px] before:bg-white/10 before:h-[calc(100%+12px)] before:-top-2">
          <ClaudeFileCard
            tool="write_file"
            filename={displayFilename}
            filePath={filePath}
            lang={lang}
            lines={lines || (fileContent ? fileContent.split('\n').length : 1)}
            fileContent={fileContent}
            status={msg.status}
            isCreated={Boolean(msg.created !== false)}
          />
        </div>
      );
    }
    case 'edit_file': {
      type = 'updated';
      label = 'Edited';
      const filePath = getCleanFilePath(msg) || 'file';
      const displayFilename = getDisplayFilename(filePath);
      summary = displayFilename;
      const lang = getFileLanguage(displayFilename);
      const added = msg.diffLines?.filter((l: any) => l?.kind === 'add')?.length || msg.diffLines?.length || 1;
      const removed = msg.diffLines?.filter((l: any) => l?.kind === 'remove')?.length || 0;

      let fileContent = '';
      const rawArgs = msg.args as any;
      if (typeof rawArgs?.new === 'string') {
        fileContent = rawArgs.new;
      }

      return (
        <div className="w-full max-w-lg my-1 relative before:absolute before:inset-0 before:-left-[24px] before:w-[2px] before:bg-white/10 before:h-[calc(100%+12px)] before:-top-2">
          <ClaudeFileCard
            tool="edit_file"
            filename={displayFilename}
            filePath={filePath}
            lang={lang}
            lines={added + removed}
            added={added}
            removed={removed}
            diffLines={msg.diffLines as any[]}
            fileContent={fileContent}
            status={msg.status}
          />
        </div>
      );
    }
    case 'read_file': {
      type = 'explored';
      label = 'Read file';
      const filePath = getCleanFilePath(msg) || 'file';
      const displayFilename = getDisplayFilename(filePath);
      summary = displayFilename;
      content = msg.output ? <TerminalOutput command={`cat ${displayFilename}`} output={msg.output} /> : null;
      break;
    }
    case 'run_shell':
    case 'run_tests': {
      type = 'ran';
      label = 'Ran';
      let cmd = '';
      if (typeof msg.command === 'string' && msg.command) {
        cmd = msg.command;
      } else if (typeof msg.args === 'string') {
        cmd = msg.args;
      } else if (msg.args && typeof msg.args === 'object') {
        cmd = (msg.args as any).command || '';
      }
      summary = cmd || 'command';
      content = <TerminalOutput command={cmd || 'command'} output={msg.output || (isDone ? 'Success' : '...')} />;
      break;
    }
    case 'list_files':
    case 'search_code': {
      type = 'searched';
      label = 'Explore';
      const lineCount = msg.output ? msg.output.split('\n').filter(Boolean).length : 0;
      const noun = msg.tool === 'list_files' ? 'list' : 'file';
      summary = lineCount > 0 ? `${lineCount} ${noun}${lineCount === 1 ? '' : 's'}` : (msg.title || 'codebase');
      content = msg.output ? <TerminalOutput command={`search ${msg.title || summary}`} output={msg.output} /> : null;
      break;
    }
    case 'web_search':
    case 'web_fetch': {
      type = 'searched';
      label = msg.tool === 'web_search' ? 'Web Search' : 'Web Fetch';
      let q = '';
      if (typeof msg.title === 'string' && msg.title) q = msg.title;
      else if (typeof msg.args === 'string') q = msg.args;
      else if (msg.args && typeof msg.args === 'object') q = (msg.args as any).query || (msg.args as any).url || '';
      summary = q || 'web';
      content = msg.output ? <TerminalOutput command={`fetch ${summary}`} output={msg.output} /> : null;
      break;
    }
    default:
      type = 'explored';
      label = `Tool: ${msg.tool}`;
      if (typeof msg.args === 'string') {
        summary = msg.args.trim() === '{}' ? '' : msg.args;
      } else if (msg.args && typeof msg.args === 'object' && Object.keys(msg.args).length > 0) {
        summary = JSON.stringify(msg.args);
      } else {
        summary = '';
      }
      content = msg.output ? <TerminalOutput command={msg.tool} output={msg.output} /> : null;
      break;
  }

  if (isFailed) {
    summary = summary ? `${summary} (Failed)` : '(Failed)';
  }

  return (
    <div className="w-full max-w-lg mt-1.5 relative before:absolute before:inset-0 before:-left-[24px] before:w-[2px] before:bg-white/10 before:h-[calc(100%+12px)] before:-top-2">
      <ToolCallCard
        type={type}
        label={label}
        summary={typeof summary === 'string' ? summary : (summary ? JSON.stringify(summary) : '')}
        active={isRunning}
        defaultOpen={isFailed}
      >
        {content || (
          isFailed && msg.error ? (
            <div className="text-red-400 font-mono text-xs whitespace-pre-wrap break-words bg-red-950/20 border border-red-500/20 rounded-lg p-2.5 my-1">
              {msg.error}
            </div>
          ) : isRunning ? (
            <div className="flex items-center gap-2 text-neutral-300 text-xs">
              <SpinnerBlock active={true} color="white" label="Running…" />
              <span>Waiting for output…</span>
            </div>
          ) : (
            <div className="text-neutral-400 italic text-xs">No output.</div>
          )
        )}
      </ToolCallCard>
    </div>
  );
}
