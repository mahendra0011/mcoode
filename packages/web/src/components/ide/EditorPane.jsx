import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { FileType2, FileCode, FileJson, File as FileIcon } from 'lucide-react';

const getFileIcon = (name) => {
  if (name.endsWith('.jsx') || name.endsWith('.tsx')) return <FileType2 className="w-4 h-4 text-cyan-400" />;
  if (name.endsWith('.js') || name.endsWith('.ts')) return <FileCode className="w-4 h-4 text-blue-400" />;
  if (name.endsWith('.json')) return <FileJson className="w-4 h-4 text-yellow-400" />;
  if (name.endsWith('.html')) return <FileCode className="w-4 h-4 text-orange-400" />;
  return <FileIcon className="w-4 h-4 text-white/50" />;
};

const getLanguage = (path) => {
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.md')) return 'markdown';
  return 'plaintext';
};

export function EditorPane({ workspaceId, openFiles, activePath, setActivePath, closeFile }) {
  const [fileContents, setFileContents] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch content when a new file is opened
  useEffect(() => {
    if (!workspaceId || !activePath) return;
    if (fileContents[activePath] !== undefined) return; // already loaded

    setLoading(true);
    fetch(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(activePath)}`)
      .then(res => res.json())
      .then(data => {
        if (data.content !== undefined) {
          setFileContents(prev => ({ ...prev, [activePath]: data.content }));
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId, activePath, fileContents]);

  const handleEditorChange = useCallback((value) => {
    if (!activePath) return;
    setFileContents(prev => ({ ...prev, [activePath]: value }));
  }, [activePath]);

  // Handle Save (Cmd+S)
  const handleSave = useCallback(() => {
    if (!workspaceId || !activePath) return;
    const content = fileContents[activePath];
    
    fetch(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(activePath)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    }).catch(console.error);
  }, [workspaceId, activePath, fileContents]);

  // Listen for file:changed events from the agent (write/edit tool completions)
  // so that open editors auto-refresh when the agent modifies a file they're viewing.
  useEffect(() => {
    const handleFileChanged = (e) => {
      const changedPath = e.detail?.path;
      if (!changedPath || !openFiles.includes(changedPath)) return;
      // Clear cached content so the useEffect above re-fetches
      setFileContents(prev => {
        const next = { ...prev };
        delete next[changedPath];
        return next;
      });
    };
    document.addEventListener('file:changed', handleFileChanged);
    return () => document.removeEventListener('file:changed', handleFileChanged);
  }, [openFiles]);

  // Bind Cmd+S globally when Editor has focus
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  if (openFiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0e0e0e] text-white/30 text-sm">
        Select a file from the explorer to open
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0e0e0e] h-full">
      {/* Editor Tabs */}
      <div className="flex items-center border-b border-white/5 bg-[#151515] overflow-x-auto custom-scrollbar flex-shrink-0">
        {openFiles.map(path => {
          const name = path.split('/').pop();
          const isActive = activePath === path;
          return (
            <div 
              key={path}
              onClick={() => setActivePath(path)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'bg-[#0e0e0e] border-t-2 border-blue-500 font-medium text-white' 
                  : 'text-white/50 hover:bg-white/5 border-t-2 border-transparent'
              }`}
            >
              {getFileIcon(name)} {name}
              <span 
                className="text-white/30 ml-2 hover:text-white cursor-pointer px-1 rounded hover:bg-white/10"
                onClick={(e) => { e.stopPropagation(); closeFile(path); }}
              >
                ×
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-1 relative">
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-[#0e0e0e]/50 z-10 text-white/50 text-sm">Loading...</div>}
        {activePath && (
          <Editor
            height="100%"
            theme="vs-dark"
            path={activePath}
            language={getLanguage(activePath)}
            value={fileContents[activePath] || ''}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              renderLineHighlight: 'all'
            }}
          />
        )}
      </div>
    </div>
  );
}
