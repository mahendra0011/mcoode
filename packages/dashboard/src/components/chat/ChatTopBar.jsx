import { useState } from 'react';
import { ChevronDown, Settings, Plus } from 'lucide-react';
import { ModelSelectorModal } from './ModelSelectorModal.jsx';

export function ChatTopBar({ mode, setMode, workspace, workspaces, onSelectWorkspace, onOpenWorkspaceModal, hasKeys }) {
  const [showModelModal, setShowModelModal] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-mcode-border bg-mcode-panel/60 px-3 h-12">
        {/* Left: mode toggle */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 rounded-lg border border-mcode-border bg-mcode-bg p-1 font-mono text-xs">
            <button
              onClick={() => setMode('chat')}
              className={`rounded px-3 py-1 transition-colors ${
                mode === 'chat'
                  ? 'bg-mcode-green/15 text-mcode-green'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setMode('agent')}
              className={`rounded px-3 py-1 transition-colors ${
                mode === 'agent'
                  ? 'bg-mcode-green/15 text-mcode-green'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              AI Agent
            </button>
          </div>
        </div>

        {/* Center: workspace selector */}
        <div className="relative">
          <button
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
            className="flex items-center gap-1.5 rounded-md border border-mcode-border bg-mcode-bg px-3 py-1.5 font-mono text-sm text-gray-300 hover:border-mcode-green/50 hover:text-white"
          >
            <span>{workspace?.name || 'select workspace'}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {showWorkspaceDropdown && (
            <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-md border border-mcode-border bg-mcode-panel shadow-lg">
              {workspaces.map((ws) => (
                <button
                  key={ws._id}
                  onClick={() => {
                    onSelectWorkspace(ws);
                    setShowWorkspaceDropdown(false);
                  }}
                  className="block w-full rounded-md px-3 py-2 font-mono text-left text-sm text-gray-300 hover:bg-mcode-bg hover:text-white"
                >
                  {ws.name}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowWorkspaceDropdown(false);
                  onOpenWorkspaceModal();
                }}
                className="flex w-full items-center gap-1.5 rounded-md px-3 py-2 font-mono text-left text-sm text-mcode-green hover:bg-mcode-bg"
              >
                <Plus className="h-3 w-3" />
                New workspace...
              </button>
            </div>
          )}
        </div>

        {/* Right: model selector + settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModelModal(true)}
            className={`rounded-md border border-mcode-border bg-mcode-bg px-3 py-1.5 font-mono text-xs transition-colors ${
              hasKeys
                ? 'text-gray-300 hover:border-mcode-green/50 hover:text-white'
                : 'border-mcode-red/40 text-mcode-red'
            }`}
          >
            {hasKeys ? 'Model: click to change' : 'No API keys — click to add'}
          </button>
          <Settings className="h-4 w-4 text-gray-600" />
        </div>
      </div>

      <ModelSelectorModal
        open={showModelModal}
        onClose={() => setShowModelModal(false)}
        hasKeys={hasKeys}
      />
    </>
  );
}
