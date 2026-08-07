import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode, FileJson, FileType2, FileText, Folder, File } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getFileIcon = (name) => {
  if (name.endsWith('.jsx') || name.endsWith('.tsx') || name.endsWith('.js') || name.endsWith('.ts')) return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
  if (name.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-yellow-400" />;
  if (name.endsWith('.md')) return <FileText className="w-3.5 h-3.5 text-emerald-400" />;
  if (name.endsWith('.css') || name.endsWith('.html')) return <FileType2 className="w-3.5 h-3.5 text-orange-400" />;
  return <File className="w-3.5 h-3.5 text-white/50" />;
};

const TreeNode = ({ node, level = 0, onSelectFile, activePath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDir = !!node.children;

  if (!isDir) {
    const isActive = activePath === node.path;
    return (
      <div 
        className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer transition select-none hover:bg-white/10 ${isActive ? 'bg-white/10 text-white' : 'text-white/70'}`}
        style={{ paddingLeft: `${level * 12 + 16}px` }}
        onClick={() => onSelectFile(node.path)}
      >
        {getFileIcon(node.name)}
        <span className="text-[13px] truncate">{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <div 
        className="flex items-center gap-1 py-1 px-2 cursor-pointer text-white/80 hover:bg-white/5 transition select-none"
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-white/40">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
        <Folder className="w-3.5 h-3.5 text-blue-300" />
        <span className="text-[13px]">{node.name}</span>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            {Object.values(node.children).sort((a, b) => {
              if (!!a.children === !!b.children) return a.name.localeCompare(b.name);
              return !!a.children ? -1 : 1; // folders first
            }).map(child => (
              <TreeNode key={child.path || child.name} node={child} level={level + 1} onSelectFile={onSelectFile} activePath={activePath} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FileTree = ({ files = [], onSelectFile, activePath }) => {
  // Convert flat array [{path, name}] to nested tree
  const tree = { name: 'root', children: {} };
  
  for (const file of files) {
    const parts = file.path.split('/');
    let current = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // file
        if (!current.children) current.children = {};
        current.children[part] = { name: part, path: file.path };
      } else {
        // folder
        if (!current.children) current.children = {};
        if (!current.children[part]) {
          current.children[part] = { name: part, path: parts.slice(0, i + 1).join('/'), children: {} };
        }
        current = current.children[part];
      }
    }
  }

  const rootNodes = Object.values(tree.children || {}).sort((a, b) => {
    if (!!a.children === !!b.children) return a.name.localeCompare(b.name);
    return !!a.children ? -1 : 1;
  });

  if (files.length === 0) {
    return <div className="p-4 text-xs text-white/40 italic">No files in workspace. Upload a ZIP or Clone a repo to begin.</div>;
  }

  return (
    <div className="flex flex-col py-2 overflow-y-auto custom-scrollbar h-full">
      {rootNodes.map(node => (
        <TreeNode key={node.path || node.name} node={node} onSelectFile={onSelectFile} activePath={activePath} />
      ))}
    </div>
  );
};
