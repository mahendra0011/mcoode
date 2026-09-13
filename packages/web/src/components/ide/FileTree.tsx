"use client";
import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  FileJson,
  FileType2,
  FileText,
  Folder,
  File,
  Upload,
  RefreshCw,
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

interface TreeNodeProps {
  node: TreeNodeData;
  level?: number;
  workspaceId?: string | null;
  onRefresh?: () => void;
}

const getFileIcon = (name: string) => {
  if (name.endsWith(".jsx") || name.endsWith(".tsx") || name.endsWith(".js") || name.endsWith(".ts"))
    return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
  if (name.endsWith(".json")) return <FileJson className="w-3.5 h-3.5 text-yellow-400" />;
  if (name.endsWith(".md")) return <FileText className="w-3.5 h-3.5 text-emerald-400" />;
  if (name.endsWith(".css") || name.endsWith(".html")) return <FileType2 className="w-3.5 h-3.5 text-orange-400" />;
  return <File className="w-3.5 h-3.5 text-white/50" />;
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

const TreeNode = ({ node, level = 0, workspaceId, onRefresh }: TreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(level === 0);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const closeFile = useIDEStore((s) => s.closeFile);
  const bumpRefresh = useIDEStore((s) => s.bumpRefresh);
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

  useEffect(() => {
    const handleCollapse = () => setIsOpen(false);
    document.addEventListener("filetree:collapse-all", handleCollapse);
    return () => document.removeEventListener("filetree:collapse-all", handleCollapse);
  }, []);

  const handleRename = async () => {
    const newName = window.prompt(`Rename "${node.name}" to:`, node.name);
    if (!newName || newName.trim() === "" || newName.trim() === node.name) return;
    const trimmed = newName.trim();
    const parent = node.path.includes("/") ? node.path.substring(0, node.path.lastIndexOf("/")) : "";
    const newPath = parent ? `${parent}/${trimmed}` : trimmed;

    try {
      await api.post(`/api/v1/workspaces/${workspaceId}/rename-file`, {
        oldPath: node.path,
        newPath,
      });
      toast.success(`Renamed to "${trimmed}"`);
      bumpRefresh();
      onRefresh?.();
    } catch (err: any) {
      toast.error(`Rename failed: ${err?.response?.data?.error?.message || err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${node.name}"?`)) return;
    try {
      await api.delete(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(node.path)}`);
      closeFile(node.path);
      toast.success(`Deleted "${node.name}"`);
      bumpRefresh();
      onRefresh?.();
    } catch (err: any) {
      toast.error(`Delete failed: ${err?.response?.data?.error?.message || err.message}`);
    }
  };

  const fileContextMenu = (
    <ContextMenuContent className="min-w-[240px] bg-[#1e1e1e] border border-white/10 rounded-md shadow-2xl p-1 text-xs text-white/90 z-50 select-none animate-in fade-in-80 duration-100">
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

  if (!isDir) {
    const isActive = activePath === node.path;
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            data-tree-path={node.path}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer transition select-none hover:bg-white/10 ${
              isActive ? "bg-white/10 text-white" : "text-white/70"
            }`}
            style={{ paddingLeft: `${level * 14 + 10}px` }}
            onClick={() => addOpenFile(node.path)}
          >
            {getFileIcon(node.name)}
            <span className="text-[13px] truncate">{node.name}</span>
          </motion.div>
        </ContextMenuTrigger>
        {fileContextMenu}
      </ContextMenu>
    );
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            data-tree-path={node.path}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1 py-1 px-2 cursor-pointer text-white/80 hover:bg-white/5 transition select-none"
            style={{ paddingLeft: `${level * 14 + 10}px` }}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="text-white/40">
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
            <Folder className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-[13px]">{node.name}</span>
          </motion.div>
        </ContextMenuTrigger>
        {fileContextMenu}
      </ContextMenu>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {node.children!.sort(sortNodes).map((child) => (
              <TreeNode
                key={child.path || child.name}
                node={child}
                level={level + 1}
                workspaceId={workspaceId}
                onRefresh={onRefresh}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * FileTree — recursive workspace file explorer (React Query data layer).
 *
 * Open-files state (`activePath`, `openFiles`, `triggerRefresh`) lives in the
 * Zustand `useIDEStore`. FileTree listens to `triggerRefresh` and `file:changed`
 * events dispatched when AI tools write/edit files, and refreshes immediately.
 */
export function FileTree({ workspaceId }: FileTreeProps) {
  const triggerRefresh = useIDEStore((s) => s.triggerRefresh);
  const bumpRefresh = useIDEStore((s) => s.bumpRefresh);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const setFileContent = useIDEStore((s) => s.setFileContent);

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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = (reader.result as string) || "";
        const path = file.name;
        setFileContent(path, content);
        addOpenFile(path);
        toast.success(`Uploaded ${file.name}`);
        bumpRefresh();
        refetch();
      };
      reader.readAsText(file);
    });
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto relative custom-scrollbar py-1">
        {loading ? (
          <div className="p-4 text-xs text-white/40">Loading files…</div>
        ) : files.length === 0 ? (
          <div className="p-4 text-xs text-white/40 italic">
            No files in workspace yet. Ask AI to generate code or upload above.
          </div>
        ) : (
          rootNodes.map((node) => (
            <TreeNode
              key={node.path || node.name}
              node={node}
              workspaceId={workspaceId}
              onRefresh={() => refetch()}
            />
          ))
        )}
      </div>
    </div>
  );
}
