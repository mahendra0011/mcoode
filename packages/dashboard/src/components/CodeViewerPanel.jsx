import { motion } from 'framer-motion';
import { useState } from 'react';
import { X, FileCode2 } from 'lucide-react';
import { CodeBlock } from './ui/code-block.jsx';

/** Slide-over panel showing every file a subagent wrote, clickable per file. */
export function CodeViewerPanel({ agent, onClose }) {
  const files = agent.filesChanged || [];
  const [activeFile, setActiveFile] = useState(files[0]?.file || null);
  const current = files.find((f) => f.file === activeFile) || files[0];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="flex h-full w-full max-w-[640px] flex-col border-l border-mcode-border bg-mcode-bg"
        initial={{ x: 640 }}
        animate={{ x: 0 }}
        exit={{ x: 640 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-mcode-border px-5 py-4">
          <div>
            <h3 className="font-mono text-sm font-bold text-mcode-green">{agent.todoId}</h3>
            <p className="text-xs text-gray-500">{agent.model} · {agent.domain}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-mcode-panel hover:text-white"
            aria-label="close code viewer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {files.length > 1 && (
          <div className="flex gap-1 overflow-x-auto border-b border-mcode-border px-3 py-2">
            {files.map((f) => (
              <button
                key={f.file}
                onClick={() => setActiveFile(f.file)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 font-mono text-[11px] transition-colors ${
                  activeFile === f.file
                    ? 'bg-mcode-green/10 text-mcode-green'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <FileCode2 className="h-3 w-3" /> {f.file.split('/').pop()}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {current ? (
            <CodeBlock
              code={current.content}
              language={current.language}
              showLineNumbers
              maxHeight={9999}
            />
          ) : (
            <p className="font-mono text-xs text-gray-600">No files written yet — waiting for agent…</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}