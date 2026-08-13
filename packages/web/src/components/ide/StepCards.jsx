import React from 'react';
import { ToolCallCard, TerminalOutput, WroteFile, DiffBlock } from '../chat/ZCodeUX';

export function StepCard({ msg, undo }) {
  const isRunning = msg.status === 'running';
  const isFailed = msg.status === 'failed';
  const isDone = msg.status === 'done';

  let type = 'explored';
  let label = 'Working...';
  let summary = '';
  let content = null;

  switch (msg.tool) {
    case 'read_file':
      type = 'explored';
      label = 'Read file';
      summary = msg.path || msg.args || '';
      content = msg.output ? <TerminalOutput command={`cat ${summary}`} output={msg.output} /> : null;
      break;
    case 'write_file':
      type = 'wrote';
      label = msg.created ? 'Created' : 'Wrote';
      summary = msg.path || msg.args || '';
      const lang = typeof summary === 'string' ? summary.split('.').pop() || 'js' : 'js';
      content = <WroteFile filename={summary} lang={lang} lines={msg.output?.split('\\n')?.length || 0} />;
      break;
    case 'edit_file':
      type = 'updated';
      label = 'Updated';
      summary = msg.path || msg.args || '';
      content = <DiffBlock filename={summary} added={msg.diffLines?.length || 1} removed={1} />;
      break;
    case 'run_shell':
    case 'run_tests':
      type = 'ran';
      label = 'Ran command';
      summary = msg.command || msg.args || '';
      content = <TerminalOutput command={summary} output={msg.output || (isDone ? 'Success' : '...')} />;
      break;
    case 'list_files':
    case 'search_code':
      type = 'searched';
      label = 'Searched';
      summary = msg.title || 'codebase';
      content = msg.output ? <TerminalOutput command={`search ${summary}`} output={msg.output} /> : null;
      break;
    case 'web_search':
    case 'web_fetch':
      type = 'searched';
      label = msg.tool === 'web_search' ? 'Web Search' : 'Web Fetch';
      summary = msg.title || msg.args || '';
      content = msg.output ? <TerminalOutput command={`fetch ${summary}`} output={msg.output} /> : null;
      break;
    default:
      type = 'explored';
      label = `Tool: ${msg.tool}`;
      summary = 'Executing...';
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
          ) : (
            <div className="text-white/40 italic text-xs">
              {isRunning ? 'Waiting for output...' : 'No output.'}
            </div>
          )
        )}
      </ToolCallCard>
    </div>
  );
}
