"use client";
import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  FileJson,
  FileType2,
  FileText,
  Folder,
  File,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@radix-ui/react-context-menu";
import { useIDEStore } from "../../store/ideStore";
import api from "../../lib/axios";

interface FlatFile {
  path: string;
  name: string;
}

interface TreeNodeData {
  name: string;
  path: string;
  children?: TreeNodeData[];
}

interface FileTreeProps {
  workspaceId: string | null | undefined;
}

interface CreatingItem {
  type: "file" | "folder";
  parentPath: string; // "" for root, or "folder/subfolder"
}

interface FileTreeContextType {
  workspaceId: string;
  creatingItem: CreatingItem | null;
  startCreate: (type: "file" | "folder", parentPath?: string) => void;
  cancelCreate: () => void;
  submitCreate: (name: string) => Promise<void>;
  renamingPath: string | null;
  startRename: (path: string) => void;
  cancelRename: () => void;
  submitRename: (oldPath: string, newName: string) => Promise<void>;
  setItemToDelete: (item: { path: string; name: string } | null) => void;
  onRefresh?: () => void;
}

const FileTreeContext = createContext<FileTreeContextType>({} as FileTreeContextType);

const getFileIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.endsWith(".jsx") || lower.endsWith(".tsx") || lower.endsWith(".js") || lower.endsWith(".ts"))
    return <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
  if (lower.endsWith(".json")) return <FileJson className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />;
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return <FileText className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
  if (lower.endsWith(".css") || lower.endsWith(".scss") || lower.endsWith(".html")) return <FileType2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />;
  if (lower.endsWith(".py")) return <FileCode className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />;
  if (lower.endsWith(".svg") || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif"))
    return <FileType2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />;
  return <File className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />;
};

const sortNodes = (a: TreeNodeData, b: TreeNodeData) => {
  const aDir = Boolean(a.children?.length);
  const bDir = Boolean(b.children?.length);
  if (aDir === bDir) return a.name.localeCompare(b.name);
  return aDir ? -1 : 1; // folders first
};

const copyPath = async (path: string) => {
  try {
    await navigator.clipboard.writeText(path);
    toast.success("Path copied", { description: path });
  } catch {
    toast.error("Could not copy path");
  }
};

/**
 * VS Code style inline input for creating a new file or folder directly in the tree
 */
function InlineCreateRow({
  type,
  level,
  onCancel,
  onSubmit,
}: {
  type: "file" | "folder";
  parentPath: string;
  level: number;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    if (val.trim()) {
      onSubmit(val.trim());
    } else {
      onCancel();
    }
  };

  return (
    <div
      className="flex items-center gap-1.5 py-0.5 px-2 select-none bg-[#094771]/30 border border-[#0078d4] rounded-sm my-0.5 mr-2"
      style={{ paddingLeft: `${level * 14 + 10}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {type === "folder" ? (
        <>
          <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
          <Folder className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
        </>
      ) : (
        getFileIcon(val || "file")
      )}
      <input
        ref={inputRef}
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            committedRef.current = true;
            onCancel();
          }
        }}
        onBlur={commit}
        placeholder={type === "folder" ? "folder_name" : "file_name.ts"}
        className="bg-transparent text-white text-[12px] outline-none w-full font-mono py-0 px-1 border-none focus:ring-0"
        spellCheck={false}
      />
    </div>
  );
}

/**
 * VS Code style inline input for renaming an existing file or folder in place
 */
function InlineRenameRow({
  node,
  isDir,
  level,
  onCancel,
  onSubmit,
}: {
  node: TreeNodeData;
  isDir: boolean;
  level: number;
  onCancel: () => void;
  onSubmit: (newName: string) => void;
}) {
  const [val, setVal] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      const dotIdx = node.name.lastIndexOf(".");
      if (!isDir && dotIdx > 0) {
        inputRef.current.setSelectionRange(0, dotIdx);
      } else {
        inputRef.current.select();
      }
    }
  }, [isDir, node.name]);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    if (val.trim() && val.trim() !== node.name) {
      onSubmit(val.trim());
    } else {
      onCancel();
    }
  };

  return (
    <div
      className="flex items-center gap-1.5 py-0.5 px-2 select-none bg-[#094771]/30 border border-[#0078d4] rounded-sm my-0.5 mr-2"
      style={{ paddingLeft: `${level * 14 + 10}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {isDir ? (
        <Folder className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
      ) : (
        getFileIcon(val)
      )}
      <input
        ref={inputRef}
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            committedRef.current = true;
            onCancel();
          }
        }}
        onBlur={commit}
        className="bg-transparent text-white text-[12px] outline-none w-full font-mono py-0 px-1 border-none focus:ring-0"
        spellCheck={false}
      />
    </div>
  );
}

const TreeNode = ({ node, level = 0 }: { node: TreeNodeData; level?: number }) => {
  const {
    workspaceId,
    creatingItem,
    startCreate,
    cancelCreate,
    submitCreate,
    renamingPath,
    startRename,
    cancelRename,
    submitRename,
    setItemToDelete,
  } = useContext(FileTreeContext);

  const [isOpen, setIsOpen] = useState(level === 0);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const activePath = useIDEStore((s) => s.activePath);
  const setActivePath = useIDEStore((s) => s.setActivePath);
  const setEditorLayout = useIDEStore((s) => s.setEditorLayout);
  const compareLeft = useIDEStore((s) => s.compareLeft);
  const setCompareLeft = useIDEStore((s) => s.setCompareLeft);
  const setDiffPair = useIDEStore((s) => s.setDiffPair);
  const setActiveActivityBar = useIDEStore((s) => s.setActiveActivityBar);
  const setSearchQuery = useIDEStore((s) => s.setSearchQuery);
  const setTimelineFile = useIDEStore((s) => s.setTimelineFile);
  const expandedPaths = useIDEStore((s) => s.expandedPaths);
  const expandPathAncestors = useIDEStore((s) => s.expandPathAncestors);
  const isDir = !!node.children?.length;

  useEffect(() => {
    if (expandedPaths[node.path]) {
      setIsOpen(true);
    }
  }, [expandedPaths, node.path]);

  // Auto-expand if a new file or folder is being created inside this folder
  useEffect(() => {
    if (creatingItem && creatingItem.parentPath === node.path) {
      setIsOpen(true);
    }
  }, [creatingItem, node.path]);

  useEffect(() => {
    const handleCollapse = () => setIsOpen(false);
    document.addEventListener("filetree:collapse-all", handleCollapse);
    return () => document.removeEventListener("filetree:collapse-all", handleCollapse);
  }, []);

  const handleRename = () => {
    startRename(node.path);
  };

  const handleDelete = () => {
    setItemToDelete({ path: node.path, name: node.name });
  };

  const fileContextMenu = (
    <ContextMenuContent className="min-w-[240px] bg-[#1e1e1e] border border-white/10 rounded-md shadow-2xl p-1 text-xs text-white/90 z-50 select-none animate-in fade-in-80 duration-100">
      {isDir && (
        <>
          <ContextMenuItem
            className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
            onSelect={() => {
              setIsOpen(true);
              startCreate("file", node.path);
            }}
          >
            <span>New File...</span>
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
            onSelect={() => {
              setIsOpen(true);
              startCreate("folder", node.path);
            }}
          >
            <span>New Folder...</span>
          </ContextMenuItem>
          <ContextMenuSeparator className="h-px bg-white/10 my-1 -mx-1" />
        </>
      )}

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={() => addOpenFile(node.path)}
      >
        <span>Open Preview</span>
        <span className="text-[10px] text-white/40 font-mono tracking-tighter">Ctrl+Shift+V</span>
      </ContextMenuItem>

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={() => {
          setEditorLayout("split-right");
          addOpenFile(node.path);
          setActivePath(node.path);
        }}
      >
        <span>Open to the Side</span>
        <span className="text-[10px] text-white/40 font-mono tracking-tighter">Ctrl+Enter</span>
      </ContextMenuItem>

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={() => addOpenFile(node.path)}
      >
        <span>Open With...</span>
      </ContextMenuItem>

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={() => {
          expandPathAncestors(node.path);
          setTimeout(() => {
            const el = document.querySelector(`[data-tree-path="${CSS.escape(node.path)}"]`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("ring-2", "ring-cyan-500");
              setTimeout(() => el.classList.remove("ring-2", "ring-cyan-500"), 2000);
            }
          }, 100);
        }}
      >
        <span>Reveal in File Explorer</span>
        <span className="text-[10px] text-white/40 font-mono tracking-tighter">Shift+Alt+R</span>
      </ContextMenuItem>

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={() => {
          const dir = node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : ".";
          document.dispatchEvent(new CustomEvent("terminal:write", { detail: `cd ${dir}\r\n` }));
          toast.info(`Opened in terminal: ${dir}`);
        }}
      >
        <span>Open in Integrated Terminal</span>
      </ContextMenuItem>

      <ContextMenuSeparator className="h-px bg-white/10 my-1 -mx-1" />

      <ContextMenuSub>
        <ContextMenuSubTrigger className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors">
          <span>Share</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/40" />
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="min-w-[160px] bg-[#1e1e1e] border border-white/10 rounded-md shadow-2xl p-1 text-xs text-white/90 z-50 select-none">
          <ContextMenuItem
            className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
            onSelect={() => {
              const link = `${window.location.origin}/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(node.path)}`;
              navigator.clipboard.writeText(link);
              toast.success("File link copied to clipboard");
            }}
          >
            <span>Copy Link</span>
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
            onSelect={() => {
              const link = `${window.location.origin}/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(node.path)}`;
              if (navigator.share) {
                navigator.share({ title: node.name, url: link }).catch(() => {});
              } else {
                navigator.clipboard.writeText(link);
                toast.success("File link copied to clipboard");
              }
            }}
          >
            <span>Share File</span>
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSeparator className="h-px bg-white/10 my-1 -mx-1" />

      {compareLeft && compareLeft !== node.path ? (
        <ContextMenuItem
          className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
          onSelect={() => {
            setDiffPair({ original: compareLeft, modified: node.path });
            setEditorLayout("split-right");
            addOpenFile(compareLeft);
            addOpenFile(node.path);
            setActivePath(node.path);
            setCompareLeft(null);
          }}
        >
          <span>Compare with Selected ({compareLeft.split("/").pop()})</span>
        </ContextMenuItem>
      ) : (
        <ContextMenuItem
          className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
          onSelect={() => {
            setCompareLeft(node.path);
            toast.info(`Selected ${node.name} for compare`);
          }}
        >
          <span>Select for Compare</span>
        </ContextMenuItem>
      )}

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={() => {
          setActiveActivityBar("search");
          setSearchQuery(node.name);
        }}
      >
        <span>Find File References</span>
      </ContextMenuItem>

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={() => {
          setActiveActivityBar("explorer");
          setActivePath(node.path);
          setTimelineFile(node.path);
          toast.info(`Timeline opened for ${node.name}`);
        }}
      >
        <span>Open Timeline</span>
      </ContextMenuItem>

      <ContextMenuSeparator className="h-px bg-white/10 my-1 -mx-1" />

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={() => {
          navigator.clipboard.writeText(node.path);
          toast.info(`Cut ${node.name}`);
        }}
      >
        <span>Cut</span>
        <span className="text-[10px] text-white/40 font-mono tracking-tighter">Ctrl+X</span>
      </ContextMenuItem>

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={() => {
          navigator.clipboard.writeText(node.path);
          toast.success(`Copied ${node.name}`);
        }}
      >
        <span>Copy</span>
        <span className="text-[10px] text-white/40 font-mono tracking-tighter">Ctrl+C</span>
      </ContextMenuItem>

      <ContextMenuSeparator className="h-px bg-white/10 my-1 -mx-1" />

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={() => copyPath(node.path)}
      >
        <span>Copy Path</span>
        <span className="text-[10px] text-white/40 font-mono tracking-tighter">Shift+Alt+C</span>
      </ContextMenuItem>

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={() => copyPath(node.path)}
      >
        <span>Copy Relative Path</span>
        <span className="text-[10px] text-white/40 font-mono tracking-tighter">Ctrl+K Ctrl+Shift+C</span>
      </ContextMenuItem>

      <ContextMenuSeparator className="h-px bg-white/10 my-1 -mx-1" />

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
        onSelect={handleRename}
      >
        <span>Rename...</span>
        <span className="text-[10px] text-white/40 font-mono tracking-tighter">F2</span>
      </ContextMenuItem>

      <ContextMenuItem
        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-rose-900/60 hover:text-rose-200 text-rose-300 cursor-pointer outline-none transition-colors"
        onSelect={handleDelete}
      >
        <span>Delete</span>
        <span className="text-[10px] text-rose-400/60 font-mono tracking-tighter">Delete</span>
      </ContextMenuItem>
    </ContextMenuContent>
  );

  // In-place rename mode
  if (renamingPath === node.path) {
    return (
      <InlineRenameRow
        node={node}
        isDir={isDir}
        level={level}
        onCancel={cancelRename}
        onSubmit={(newName) => submitRename(node.path, newName)}
      />
    );
  }

  if (!isDir) {
    const isActive = activePath === node.path;
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            data-tree-path={node.path}
            className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer transition select-none hover:bg-white/10 ${
              isActive ? "bg-white/10 text-white font-medium" : "text-white/70"
            }`}
            style={{ paddingLeft: `${level * 14 + 10}px` }}
            onClick={() => addOpenFile(node.path)}
          >
            {getFileIcon(node.name)}
            <span className="text-[13px] truncate">{node.name}</span>
          </div>
        </ContextMenuTrigger>
        {fileContextMenu}
      </ContextMenu>
    );
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            data-tree-path={node.path}
            className="flex items-center gap-1 py-1 px-2 cursor-pointer text-white/80 hover:bg-white/5 transition select-none"
            style={{ paddingLeft: `${level * 14 + 10}px` }}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="text-white/40">
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
            <Folder className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
            <span className="text-[13px] truncate">{node.name}</span>
          </div>
        </ContextMenuTrigger>
        {fileContextMenu}
      </ContextMenu>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {/* Inline creation input inside this directory */}
            {creatingItem && creatingItem.parentPath === node.path && (
              <InlineCreateRow
                type={creatingItem.type}
                parentPath={node.path}
                level={level + 1}
                onCancel={cancelCreate}
                onSubmit={submitCreate}
              />
            )}
            {node.children!.sort(sortNodes).map((child) => (
              <TreeNode
                key={child.path || child.name}
                node={child}
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * FileTree — recursive workspace file explorer (React Query data layer)
 * with VS Code style inline file/folder creation, inline rename, and custom delete modal.
 */
export function FileTree({ workspaceId }: FileTreeProps) {
  const triggerRefresh = useIDEStore((s) => s.triggerRefresh);
  const bumpRefresh = useIDEStore((s) => s.bumpRefresh);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const setActivePath = useIDEStore((s) => s.setActivePath);
  const closeFile = useIDEStore((s) => s.closeFile);

  const [creatingItem, setCreatingItem] = useState<CreatingItem | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ path: string; name: string } | null>(null);

  const {
    data: files = [],
    isLoading: loading,
    refetch,
  } = useQuery<FlatFile[]>({
    queryKey: ["workspaceFiles", workspaceId, triggerRefresh],
    queryFn: () =>
      api
        .get(`/api/v1/workspaces/${workspaceId}/files`, { timeout: 5000 })
        .then((res) => res.data.files || []),
    enabled: !!workspaceId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Listen to file change events from AI tools or external changes
  useEffect(() => {
    const handleFileChanged = () => {
      refetch();
    };
    document.addEventListener("file:changed", handleFileChanged);
    return () => {
      document.removeEventListener("file:changed", handleFileChanged);
    };
  }, [refetch]);

  // Listen to custom events for VS Code style inline new file / folder creation
  useEffect(() => {
    const handleNewFile = (e: Event) => {
      const detail = (e as CustomEvent<{ parentPath?: string }>).detail;
      const parentPath = detail?.parentPath ?? "";
      setCreatingItem({ type: "file", parentPath });
      if (parentPath) {
        useIDEStore.getState().expandPathAncestors(parentPath);
        useIDEStore.getState().setPathExpanded(parentPath, true);
      }
    };

    const handleNewFolder = (e: Event) => {
      const detail = (e as CustomEvent<{ parentPath?: string }>).detail;
      const parentPath = detail?.parentPath ?? "";
      setCreatingItem({ type: "folder", parentPath });
      if (parentPath) {
        useIDEStore.getState().expandPathAncestors(parentPath);
        useIDEStore.getState().setPathExpanded(parentPath, true);
      }
    };

    document.addEventListener("filetree:new-file", handleNewFile);
    document.addEventListener("filetree:new-folder", handleNewFolder);
    return () => {
      document.removeEventListener("filetree:new-file", handleNewFile);
      document.removeEventListener("filetree:new-folder", handleNewFolder);
    };
  }, []);

  const startCreate = (type: "file" | "folder", parentPath = "") => {
    setCreatingItem({ type, parentPath });
    if (parentPath) {
      useIDEStore.getState().expandPathAncestors(parentPath);
      useIDEStore.getState().setPathExpanded(parentPath, true);
    }
  };

  const cancelCreate = () => {
    setCreatingItem(null);
  };

  const submitCreate = async (name: string) => {
    if (!creatingItem || !workspaceId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setCreatingItem(null);
      return;
    }

    const targetPath = creatingItem.parentPath
      ? `${creatingItem.parentPath}/${trimmed}`.replace(/\\/g, "/").replace(/\/+/g, "/")
      : trimmed.replace(/\\/g, "/").replace(/\/+/g, "/");

    const isFolder = creatingItem.type === "folder";
    setCreatingItem(null);

    try {
      if (isFolder) {
        await api.post(`/api/v1/workspaces/${workspaceId}/folder`, { path: targetPath });
        toast.success(`Created folder "${targetPath}"`);
        useIDEStore.getState().expandPathAncestors(targetPath);
        useIDEStore.getState().setPathExpanded(targetPath, true);
      } else {
        await api.post(`/api/v1/workspaces/${workspaceId}/file`, { path: targetPath, content: "" });
        toast.success(`Created file "${targetPath}"`);
        useIDEStore.getState().expandPathAncestors(targetPath);
        addOpenFile(targetPath);
        setActivePath(targetPath);
      }
      bumpRefresh();
      refetch();
    } catch (err: any) {
      toast.error(`Creation failed: ${err?.response?.data?.error?.message || err.message}`);
    }
  };

  const startRename = (path: string) => {
    setRenamingPath(path);
  };

  const cancelRename = () => {
    setRenamingPath(null);
  };

  const submitRename = async (oldPath: string, newName: string) => {
    if (!workspaceId) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldPath.split("/").pop()) {
      setRenamingPath(null);
      return;
    }

    const parent = oldPath.includes("/") ? oldPath.substring(0, oldPath.lastIndexOf("/")) : "";
    const newPath = parent ? `${parent}/${trimmed}` : trimmed;
    setRenamingPath(null);

    try {
      await api.post(`/api/v1/workspaces/${workspaceId}/rename-file`, {
        oldPath,
        newPath,
      });
      toast.success(`Renamed to "${trimmed}"`);

      // Update open files state in store
      const openFiles = useIDEStore.getState().openFiles;
      const activePath = useIDEStore.getState().activePath;
      if (openFiles.includes(oldPath)) {
        useIDEStore.setState({
          openFiles: openFiles.map((p) => (p === oldPath ? newPath : p)),
          activePath: activePath === oldPath ? newPath : activePath,
        });
      }
      bumpRefresh();
      refetch();
    } catch (err: any) {
      toast.error(`Rename failed: ${err?.response?.data?.error?.message || err.message}`);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !workspaceId) return;
    const { path, name } = itemToDelete;
    setItemToDelete(null);

    try {
      await api.delete(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(path)}`);
      closeFile(path);
      toast.success(`Deleted "${name}"`);
      bumpRefresh();
      refetch();
    } catch (err: any) {
      toast.error(`Delete failed: ${err?.response?.data?.error?.message || err.message}`);
    }
  };

  // Convert flat array [{path, name}] to a nested tree (folders first).
  const tree: TreeNodeData = { name: "root", path: "", children: [] };
  for (const file of files) {
    const normPath = (file.path || "").replace(/\\/g, "/");
    const parts = normPath.split("/");
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const path = parts.slice(0, i + 1).join("/");
      const isLeaf = i === parts.length - 1;
      let child = current.children!.find((c) => c.path === path);
      if (!child) {
        child = { name: part, path, children: isLeaf ? undefined : [] };
        current.children!.push(child);
      }
      if (!isLeaf && !child.children) child.children = [];
      current = child;
    }
  }
  const rootNodes = tree.children!.sort(sortNodes);

  if (!workspaceId) {
    return <div className="p-4 text-xs text-white/40 italic">Select or create a workspace to begin.</div>;
  }

  const contextValue: FileTreeContextType = {
    workspaceId,
    creatingItem,
    startCreate,
    cancelCreate,
    submitCreate,
    renamingPath,
    startRename,
    cancelRename,
    submitRename,
    setItemToDelete,
    onRefresh: () => refetch(),
  };

  return (
    <FileTreeContext.Provider value={contextValue}>
      <div className="flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto relative custom-scrollbar py-1">
          {/* Inline creation at root level */}
          {creatingItem && creatingItem.parentPath === "" && (
            <InlineCreateRow
              type={creatingItem.type}
              parentPath=""
              level={0}
              onCancel={cancelCreate}
              onSubmit={submitCreate}
            />
          )}

          {loading ? (
            <div className="p-4 text-xs text-white/40">Loading files…</div>
          ) : files.length === 0 && (!creatingItem || creatingItem.parentPath !== "") ? (
            <div
              className="p-4 text-xs text-white/40 italic cursor-pointer hover:text-white/60 transition"
              onClick={() => startCreate("file", "")}
              title="Click to create a new file"
            >
              No files in workspace yet. Click here or use "New File" above to begin.
            </div>
          ) : (
            rootNodes.map((node) => (
              <TreeNode
                key={node.path || node.name}
                node={node}
                level={0}
              />
            ))
          )}

          {/* Empty space context menu */}
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                className="min-h-[60px] cursor-default"
                onClick={() => {
                  cancelCreate();
                  cancelRename();
                }}
              />
            </ContextMenuTrigger>
            <ContextMenuContent className="min-w-[180px] bg-[#1e1e1e] border border-white/10 rounded-md shadow-2xl p-1 text-xs text-white/90 z-50 select-none animate-in fade-in-80 duration-100">
              <ContextMenuItem
                className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                onSelect={() => startCreate("file", "")}
              >
                <span>New File...</span>
              </ContextMenuItem>
              <ContextMenuItem
                className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                onSelect={() => startCreate("folder", "")}
              >
                <span>New Folder...</span>
              </ContextMenuItem>
              <ContextMenuSeparator className="h-px bg-white/10 my-1 -mx-1" />
              <ContextMenuItem
                className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                onSelect={() => {
                  bumpRefresh();
                  refetch();
                }}
              >
                <span>Refresh Explorer</span>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>

        {/* Custom in-app Delete Confirmation Modal (replacing window.confirm) */}
        {itemToDelete && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setItemToDelete(null)}
          >
            <div
              className="bg-[#1e1e1e] border border-white/15 rounded-xl shadow-2xl p-5 w-full max-w-sm text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-white">Delete Item</h3>
              </div>
              <p className="text-xs text-white/70 mb-4 leading-relaxed">
                Are you sure you want to delete <span className="text-white font-medium">"{itemToDelete.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="px-3 py-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-medium transition cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FileTreeContext.Provider>
  );
}
