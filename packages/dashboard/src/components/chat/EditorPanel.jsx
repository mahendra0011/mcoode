import { CodeBlock } from '../ui/code-block.jsx';
import { FileText } from 'lucide-react';

/**
 * Right-side or center panel showing the currently selected file's content.
 * In agent mode this sits between the file tree and the tool strip.
 */
export function EditorPanel({ activeFile, onClose }) {
  if (!activeFile) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex h-full items-center justify-center">
          <p className="font-mono text-sm text-gray-600">
            Select a file from the tree to view it here
          </p>
        </div>
      </div>
    );
  }

  const lang = activeFile.path?.split('.').pop() || 'text';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between border-b border-mcode-border bg-mcode-panel/40 px-3 py-1.5">
        <div className="flex items-center gap-2 font-mono text-xs">
          <FileText className="h-3 w-3 text-mcode-green" />
          <span className="text-gray-400 truncate">{activeFile.path}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="font-mono text-xs text-gray-600 hover:text-gray-300"
          >
            close
          </button>
        )}
      </div>
      <div className="p-3">
        <CodeBlock
          code={activeFile.content || ''}
          language={lang}
          showLineNumbers={true}
          maxHeight={600}
        />
      </div>
    </div>
  );
}
