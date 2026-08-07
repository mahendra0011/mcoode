import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Left sidebar in agent mode — recursive file tree with real-time tool
 * call highlights. Files changed by the agent are highlighted green.
 * Includes a search bar to filter files by name.
 */
export function FileTreeSidebar({ files, activeFile, onFileClick }) {
  const [collapsed, setCollapsed] = useState({});
  const [search, setSearch] = useState('');

  // Filter files by search query
  const filtered = useMemo(() => {
    if (!search) return files || [];
    const q = search.toLowerCase();
    return (files || []).filter((f) => f.name?.toLowerCase().includes(q) || f.path?.toLowerCase().includes(q));
  }, [files, search]);

  // Build tree from flat file list
  const tree = useMemo(() => {
    const root = { name: '', path: '', children: {} };
    for (const f of filtered) {
      const parts = f.path.split('/');
      let node = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        if (!node.children[part]) {
          node.children[part] = {
            name: part,
            path: parts.slice(0, i + 1).join('/'),
            children: {},
            isFile: isLast
          };
        }
        node = node.children[part];
      }
    }
    return root;
  }, [filtered]);

  const toggle = (path) => {
    setCollapsed((c) => ({ ...c, [path]: !c[path] }));
  };

  const clearSearch = () => setSearch('');

  return (
    <aside className="w-64 shrink-0 border-r border-mcode-border bg-mcode-panel/20 overflow-y-auto flex flex-col">
      {/* Search bar */}
      <div className="p-2 border-b border-mcode-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full rounded-md border border-mcode-border bg-mcode-bg pl-7 pr-2 py-1 font-mono text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-mcode-green"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-600"
            >
            </button>
          )}
        </div>
        {search && (
          <div className="mt-1 font-mono text-[10px] text-gray-600">
            {filtered.length} file{filtered.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* Header */}
      <div className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-600 border-b border-mcode-border">
        WORKSPACE FILES
      </div>

      <div className="flex-1 overflow-y-auto">
        <TreeItem
          node={tree}
          collapsed={collapsed}
          toggle={toggle}
          activeFile={activeFile}
          onFileClick={onFileClick}
          searchMode={!!search}
        />
      </div>
    </aside>
  );
}

function TreeItem({ node, collapsed, toggle, activeFile, onFileClick, searchMode }) {
  const entries = Object.values(node.children || {});
  if (!entries.length) return null;

  return entries.map((child) => {
    const isDir = !child.isFile;
    const isOpen = !collapsed[child.path];
    const isActive = activeFile?.path === child.path;
    const depth = child.path.split('/').length - 1;

    if (isDir) {
      return (
        <motion.div
          key={child.path}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div
            onClick={() => toggle(child.path)}
            className={`flex items-center gap-1 cursor-pointer rounded-sm px-2 py-1 font-mono text-xs transition-colors ${
              searchMode
                ? 'border-l-2 border-mcode-green/40 bg-mcode-green/5'
                : 'border-l-2 border-transparent'
            } ${
              isActive
                ? 'bg-mcode-green/10 text-mcode-green'
                : 'text-gray-400 hover:bg-mcode-bg hover:text-gray-300'
            }`}
            style={{ paddingLeft: 6 + depth * 8 }}
          >
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="open"
                  initial={{ rotate: -90 }}
                  animate={{ rotate: 0 }}
                  exit={{ rotate: -90 }}
                  transition={{ duration: 0.15 }}
                >
                  <ChevronDown className="h-3 w-3" />
                </motion.div>
              ) : (
                <motion.div
                  key="closed"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 0 }}
                  exit={{ rotate: -90 }}
                  transition={{ duration: 0.15 }}
                >
                  <ChevronRight className="h-3 w-3" />
                </motion.div>
              )}
            </AnimatePresence>
            {isOpen ? <FolderOpen className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
            <span className="truncate">{child.name}</span>
          </div>
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                key={`children-${child.path}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <TreeItem
                  node={child}
                  collapsed={collapsed}
                  toggle={toggle}
                  activeFile={activeFile}
                  onFileClick={onFileClick}
                  searchMode={searchMode}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    }

    // File
    return (
      <motion.div
        key={child.path}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div
          onClick={() => onFileClick(child)}
          className={`flex items-center gap-1 cursor-pointer rounded-sm px-2 py-1 font-mono text-xs transition-all ${
            searchMode
              ? 'border-l-2 border-mcode-green/40 hover:bg-mcode-green/10'
              : 'border-l-2 border-transparent hover:border-l-2 hover:border-mcode-green/20'
          } ${
            isActive
              ? 'bg-mcode-green/15 text-mcode-green'
              : 'text-gray-500 hover:bg-mcode-bg hover:text-gray-300'
          }`}
          style={{ paddingLeft: 6 + depth * 8 }}
          title={child.path}
        >
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate">{child.name}</span>
        </div>
      </motion.div>
    );
  });
}
