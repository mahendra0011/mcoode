import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FileCode, FileJson, FileType2, File as FileIcon } from 'lucide-react';

const getFileIcon = (name) => {
  if (name.endsWith('.jsx') || name.endsWith('.tsx')) return <FileType2 className="w-4 h-4 text-cyan-400" />;
  if (name.endsWith('.js') || name.endsWith('.ts')) return <FileCode className="w-4 h-4 text-blue-400" />;
  if (name.endsWith('.json')) return <FileJson className="w-4 h-4 text-yellow-400" />;
  if (name.endsWith('.html')) return <FileCode className="w-4 h-4 text-orange-400" />;
  return <FileIcon className="w-4 h-4 text-white/50" />;
};

const TreeNode = ({ node, level, onSelect, activePath }) => {
  const [expanded, setExpanded] = useState(false);
  const isFolder = node.children && Object.keys(node.children).length > 0;
  
  if (!isFolder) {
    const isActive = activePath === node.path;
    return (
      <div 
        onClick={() => onSelect(node.path)}
        className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer ${isActive ? 'bg-white/10 text-white font-medium' : 'hover:bg-white/5'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {getFileIcon(node.name)} {node.name}
      </div>
    );
  }

  return (
    <div>
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Folder className={`w-4 h-4 ${expanded ? 'text-blue-400' : 'text-white/40'}`} fill="currentColor"/> {node.name}
      </div>
      {expanded && (
        <div>
          {Object.values(node.children).map((child) => (
            <TreeNode key={child.name} node={child} level={level + 1} onSelect={onSelect} activePath={activePath} />
          ))}
        </div>
      )}
    </div>
  );
};

export function FileTree({ workspaceId, onFileSelect, activePath, triggerRefresh }) {
  const [tree, setTree] = useState({ name: 'root', children: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetch(`/api/v1/workspaces/${workspaceId}/files`)
      .then(res => res.json())
      .then(data => {
        if (!data.files) return;
        
        // Build nested tree from flat paths
        const root = { name: 'root', children: {} };
        data.files.forEach(file => {
          const parts = file.path.split('/');
          let curr = root;
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
              curr.children[part] = { name: part, path: file.path };
            } else {
              if (!curr.children[part]) curr.children[part] = { name: part, children: {} };
              curr = curr.children[part];
            }
          }
        });
        setTree(root);
      })
      .finally(() => setLoading(false));
  }, [workspaceId, triggerRefresh]);

  if (!workspaceId) {
    return <div className="p-4 text-sm text-white/50 text-center">No workspace selected</div>;
  }

  if (loading && Object.keys(tree.children).length === 0) {
    return <div className="p-4 text-sm text-white/50 text-center">Loading files...</div>;
  }

  return (
    <div className="p-2 overflow-y-auto custom-scrollbar text-sm text-white/70 h-full">
      {Object.values(tree.children).map(child => (
        <TreeNode key={child.name} node={child} level={0} onSelect={onFileSelect} activePath={activePath} />
      ))}
    </div>
  );
}
