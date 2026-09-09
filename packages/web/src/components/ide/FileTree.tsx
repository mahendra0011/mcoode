"use client";
import { useState } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
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

const TreeNode = ({ node, level = 0 }: TreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const activePath = useIDEStore((s) => s.activePath);
  const isDir = !!node.children?.length;

  if (!isDir) {
    const isActive = activePath === node.path;
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer transition select-none hover:bg-white/10 ${
              isActive ? "bg-white/10 text-white" : "text-white/70"
            }`}
            style={{ paddingLeft: `${level * 16 + 48}px` }}
            onClick={() => addOpenFile(node.path)}
          >
            {getFileIcon(node.name)}
            <span className="text-[13px] truncate">{node.name}</span>
          </motion.div>
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-[180px] bg-[#1e1e1e] border border-white/10 text-xs text-white/80 p-1">
          <ContextMenuItem
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer"
            onSelect={() => addOpenFile(node.path)}
          >
            Open
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer"
            onSelect={() => copyPath(node.path)}
          >
            Copy path
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1 py-1 px-2 cursor-pointer text-white/80 hover:bg-white/5 transition select-none"
            style={{ paddingLeft: `${level * 16 + 48}px` }}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="text-white/40">
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
            <Folder className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-[13px]">{node.name}</span>
          </motion.div>
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-[180px] bg-[#1e1e1e] border border-white/10 text-xs text-white/80 p-1">
          <ContextMenuItem
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer"
            onSelect={() => copyPath(node.path)}
          >
            Copy path
          </ContextMenuItem>
        </ContextMenuContent>
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
              <TreeNode key={child.path || child.name} node={child} level={level + 1} />
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
 * Open-files state (`activePath`, `openFiles`, `triggerRefresh`) now lives in the
 * Zustand `useIDEStore` (see ideStore.ts), so this component reads its highlight
 * + re-fetch signal from the store rather than via props threaded from the page.
 *
 * Props:
 *  - workspaceId: drives the /files fetch (via React Query, disabled until set).
 *
 * Each node is wrapped in a Radix ContextMenu so right-click exposes
 * Open / Copy path (files). Rename/Delete/New are intentionally omitted:
 * the backend currently exposes no such workspace-file endpoints.
 */
export function FileTree({ workspaceId }: FileTreeProps) {
  const triggerRefresh = useIDEStore((s) => s.triggerRefresh);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const setFileContent = useIDEStore((s) => s.setFileContent);

  const { data: files = [], isLoading: loading } = useQuery<FlatFile[]>({
    queryKey: ["workspaceFiles", workspaceId, triggerRefresh],
    queryFn: () =>
      api
        .get(`/api/v1/workspaces/${workspaceId}/files`, { timeout: 5000 })
        .then((res) => res.data.files || []),
    enabled: !!workspaceId,
    staleTime: 15_000,
  });

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
      };
      reader.readAsText(file);
    });
  };

  // Convert flat array [{path, name}] to a nested tree (folders first).
  const tree: TreeNodeData = { name: "root", path: "", children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
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
  if (loading) {
    return <div className="p-4 text-xs text-white/40">Loading files…</div>;
  }
  if (files.length === 0) {
    return (
      <div className="p-4 text-xs text-white/40 italic">
        No files in workspace. Upload a ZIP or Clone a repo to begin.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-white/[0.02]">
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Workspace</span>
        <label htmlFor="file-tree-upload" className="cursor-pointer text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition">
          <Upload className="w-3 h-3" /> Upload
          <input
            id="file-tree-upload"
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {rootNodes.map((node) => (
          <TreeNode key={node.path || node.name} node={node} />
        ))}
      </div>
    </div>
  );
}
