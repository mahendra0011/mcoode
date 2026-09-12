import React, { useState } from 'react';
import { ToolCallCard, TerminalOutput, WroteFile, DiffBlock } from '../chat/mcodeUX';
import { WebSearchAnimation, WebFetchAnimation } from '../chat/SearchAnimation';
import { SpinnerBlock } from '../chat/SpinnerBlock';
import { ReactionBurst } from '../chat/ReactionBurst';
import type { ChatMessage, ToolArgs } from '../../types/chat';

export interface StepCardProps {
  msg: ChatMessage;
  undo?: (msg: ChatMessage) => void;
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
      } catch {}
    }
    return 0;
  }

  let type = 'explored';
  let label = 'Working...';
  let summary: string | ToolArgs = '';
  let content = null;

  switch (msg.tool) {
    case 'read_file': {
      type = 'explored';
      label = 'Read file';
      const filePath = getCleanFilePath(msg) || 'file';
      const displayFilename = getDisplayFilename(filePath);
      summary = displayFilename;
      content = msg.output ? <TerminalOutput command={`cat ${displayFilename}`} output={msg.output} /> : null;
      break;
    }
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
        } catch {}
      }

      content = (
        <div className="flex flex-col gap-2">
          <WroteFile filename={displayFilename} lang={lang} lines={lines} />
          {fileContent ? (
            <div className="mt-1 rounded-lg border border-white/10 bg-black/50 p-2.5 overflow-x-auto max-h-56 text-[11.5px] font-mono text-white/80 shadow-inner">
              <pre className="whitespace-pre overflow-x-auto">
                <code>{fileContent.slice(0, 2000)}{fileContent.length > 2000 ? '\n… [truncated for preview]' : ''}</code>
              </pre>
            </div>
          ) : null}
        </div>
      );
      break;
    }
    case 'edit_file': {
      type = 'updated';
      label = 'Edited';
      const filePath = getCleanFilePath(msg) || 'file';
      const displayFilename = getDisplayFilename(filePath);
      summary = displayFilename;
      const added = msg.diffLines?.filter((l: any) => l?.kind === 'add')?.length || msg.diffLines?.length || 1;
      const removed = msg.diffLines?.filter((l: any) => l?.kind === 'remove')?.length || 0;
      content = <DiffBlock filename={displayFilename} added={added} removed={removed} />;
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
      summary = typeof msg.args === 'string' ? msg.args : 'Executing...';
      content = msg.output ? <TerminalOutput command={msg.tool} output={msg.output} /> : null;
      break;
  }

  if (isFailed) {
    summary += ' (Failed)';
  }

  return (
    <div className="w-full max-w-lg mt-2 relative before:absolute before:inset-0 before:-left-[24px] before:w-[2px] before:bg-border/40 before:h-[calc(100%+16px)] before:-top-2">
      <ToolCallCard 
        type={type} 
        label={label} 
        summary={typeof summary === 'string' ? summary : JSON.stringify(summary)} 
        active={isRunning}
        defaultOpen={isFailed || (!isDone && !!content) || msg.tool === 'write_file' || msg.tool === 'edit_file'}
      >
          {content || (
            isFailed && msg.error ? (
              <div className="text-red-400/80 text-xs whitespace-pre-wrap break-words">
                {msg.error}
              </div>
            ) : isRunning ? (
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <SpinnerBlock active={true} label="Running…" />
                <span>Waiting for output…</span>
              </div>
            ) : (
              <div className="text-white/40 italic text-xs">No output.</div>
            )
          )}

          {/* Reaction burst on successful tool completion */}
          {isDone && !isFailed && (
            <div className="mt-1">
              <ReactionBurst emoji="✓" show={true} />
            </div>
          )}
          {isFailed && (
            <div className="mt-1">
              <ReactionBurst emoji="✗" show={true} />
            </div>
          )}
      </ToolCallCard>
    </div>
  );
}
