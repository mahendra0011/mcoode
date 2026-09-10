"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Play,
  RotateCw,
  Trash2,
  MoreHorizontal,
  Check,
  AlertCircle,
  FileCode,
  CornerDownLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Bug,
  Eye,
  Layers,
  Circle,
  Square,
} from "lucide-react";
import { useIDEStore, BreakpointItem } from "../../store/ideStore";
import api from "../../lib/axios";
import { toast } from "sonner";
import { getSocket } from "../../hooks/useChatSocket";

export type RunMode = "run" | "debug-console";

export interface LogEntry {
  type: "log" | "error" | "warn" | "input" | "result";
  text: string;
  time: string;
}

export interface LaunchConfigItem {
  type: string;
  request: string;
  name: string;
  program: string;
  [key: string]: any;
}

export interface LaunchJsonFormat {
  version: string;
  configurations: LaunchConfigItem[];
}

export const DEFAULT_LAUNCH_JSON: LaunchJsonFormat = {
  version: "0.2.0",
  configurations: [
    {
      type: "node",
      request: "launch",
      name: "Run current file",
      program: "${file}",
    },
  ],
};

/**
 * Inserts `debugger;` statements into code at given line numbers so that
 * when executed with DevTools open, execution pauses at those lines.
 */
export function insertBreakpoints(code: string, lineNumbers: number[]): string {
  const lines = code.split("\n");
  const sorted = [...lineNumbers].sort((a, b) => b - a);
  for (const lineNum of sorted) {
    if (lineNum >= 1 && lineNum <= lines.length + 1) {
      lines.splice(lineNum - 1, 0, "debugger;");
    }
  }
  return lines.join("\n");
}

export interface RunDebugPanelProps {
  activeFile?: string | null;
  activeFileContent?: string;
  workspaceId?: string | null;
}

export function RunDebugPanel({
  activeFile: propActiveFile,
  activeFileContent: propActiveFileContent,
  workspaceId,
}: RunDebugPanelProps = {}) {
  const [mode, setMode] = useState<RunMode>("run");
  const [menuOpen, setMenuOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [replInput, setReplInput] = useState("");
  const [replHistory, setReplHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Collapsible sub-sections
  const [openSections, setOpenSections] = useState({
    variables: false,
    watch: false,
    callStack: false,
    breakpoints: true,
    console: true,
  });

  // Watch expressions
  const [watchExpressions, setWatchExpressions] = useState<Array<{ expr: string; result: string }>>([
    { expr: "typeof window", result: "" },
  ]);
  const [newWatchInput, setNewWatchInput] = useState("");
  const [isAddingWatch, setIsAddingWatch] = useState(false);

  // New breakpoint input
  const [newBpLine, setNewBpLine] = useState("");
  const [isAddingBp, setIsAddingBp] = useState(false);

  // Store bindings
  const storeActivePath = useIDEStore((s) => s.activePath);
  const fileContentsCache = useIDEStore((s) => s.fileContentsCache);
  const setFileContent = useIDEStore((s) => s.setFileContent);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const setActivePath = useIDEStore((s) => s.setActivePath);
  const setTargetJump = useIDEStore((s) => s.setTargetJump);
  const breakpoints = useIDEStore((s) => s.breakpoints);
  const toggleBreakpoint = useIDEStore((s) => s.toggleBreakpoint);
  const setBreakpointEnabled = useIDEStore((s) => s.setBreakpointEnabled);
  const removeBreakpoint = useIDEStore((s) => s.removeBreakpoint);
  const clearAllBreakpoints = useIDEStore((s) => s.clearAllBreakpoints);

  const activePath = propActiveFile !== undefined ? propActiveFile : storeActivePath;
  const activeContent =
    propActiveFileContent !== undefined
      ? propActiveFileContent
      : activePath
      ? fileContentsCache[activePath] || ""
      : "";

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Parse .vscode/launch.json if present
  const launchConfig = useMemo<LaunchJsonFormat | null>(() => {
    for (const [path, content] of Object.entries(fileContentsCache)) {
      if (path.endsWith("launch.json")) {
        try {
          return JSON.parse(content);
        } catch {
          return null;
        }
      }
    }
    return null;
  }, [fileContentsCache]);

  const hasLaunchConfig = !!launchConfig && (launchConfig.configurations?.length || 0) > 0;
  const [selectedConfigIndex, setSelectedConfigIndex] = useState(0);

  // Auto-scroll logs
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Evaluate watch expressions in sandbox
  const evaluateWatch = useCallback(() => {
    if (watchExpressions.length === 0) return;
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.sandbox.add("allow-scripts");
      document.body.appendChild(iframe);
      const win = iframe.contentWindow as any;

      setWatchExpressions((prev) =>
        prev.map((item) => {
          try {
            const val = win.eval(item.expr);
            return {
              ...item,
              result: typeof val === "object" ? JSON.stringify(val) : String(val),
            };
          } catch (e: any) {
            return { ...item, result: `<error: ${e.message}>` };
          }
        })
      );
      document.body.removeChild(iframe);
    } catch {
      // ignore
    }
  }, [watchExpressions]);

  useEffect(() => {
    if (hasStarted) {
      evaluateWatch();
    }
  }, [hasStarted, evaluateWatch]);

  /**
   * Sandboxed execution via an isolated iframe.
   * Captures console.log, console.warn, console.error, and win.onerror.
   */
  function runCode(
    code: string,
    onLog: (msg: string) => void,
    onError: (msg: string) => void,
    onWarn?: (msg: string) => void,
    onResult?: (msg: string) => void
  ) {
    if (typeof window === "undefined") return;

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.sandbox.add("allow-scripts");
    document.body.appendChild(iframe);

    const win = iframe.contentWindow as any;
    if (!win) {
      onError("Sandboxed runtime environment is unavailable.");
      return;
    }

    win.console.log = (...args: any[]) =>
      onLog(args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" "));

    win.console.warn = (...args: any[]) => {
      const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" ");
      if (onWarn) onWarn(msg);
      else onLog(msg);
    };

    win.console.error = (...args: any[]) =>
      onError(args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" "));

    win.onerror = (msg: string) => {
      onError(String(msg));
      return true;
    };

    try {
      const result = win.eval(code);
      if (result !== undefined && onResult) {
        onResult(typeof result === "object" ? JSON.stringify(result, null, 2) : String(result));
      }
    } catch (err: any) {
      onError(err.message || String(err));
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 50);
    }
  }

  // Socket listener for Piston single-file run & Docker project run results
  useEffect(() => {
    const socket = getSocket();
    const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const handleRunResult = (result: any) => {
      setIsRunning(false);
      if (result.error) {
        setLogs((prev) => [...prev, { type: "error", text: result.error, time: now() }]);
        return;
      }
      if (result.compileOutput) {
        setLogs((prev) => [...prev, { type: "warn", text: `[Compilation Output]\n${result.compileOutput}`, time: now() }]);
      }
      if (result.stdout) {
        setLogs((prev) => [...prev, { type: "log", text: result.stdout, time: now() }]);
      }
      if (result.stderr) {
        setLogs((prev) => [...prev, { type: "error", text: result.stderr, time: now() }]);
      }
      if (result.exitCode !== undefined && result.exitCode !== null) {
        setLogs((prev) => [...prev, { type: "log", text: `[Process exited with code ${result.exitCode}]`, time: now() }]);
      }
    };

    const handleProjectRunReady = (payload: any) => {
      setIsRunning(false);
      setLogs((prev) => [
        ...prev,
        { type: "log", text: `[Project container ready! Preview: ${payload.previewUrl || "active"}]`, time: now() },
      ]);
      if (payload.previewUrl) {
        toast.success(`Project running at ${payload.previewUrl}`);
      }
    };

    const handleProjectRunError = (payload: any) => {
      setIsRunning(false);
      setLogs((prev) => [...prev, { type: "error", text: `[Docker Error] ${payload.error}`, time: now() }]);
      toast.error(`Docker error: ${payload.error}`);
    };

    socket.on("code:run-result", handleRunResult);
    socket.on("project:run-ready", handleProjectRunReady);
    socket.on("project:run-error", handleProjectRunError);

    return () => {
      socket.off("code:run-result", handleRunResult);
      socket.off("project:run-ready", handleProjectRunReady);
      socket.off("project:run-error", handleProjectRunError);
    };
  }, []);

  function handleRunProject() {
    const socket = getSocket();
    if (!socket || socket.disconnected) {
      toast.error("Socket connection unavailable.");
      return;
    }
    setHasStarted(true);
    setLogs([]);
    setIsRunning(true);
    const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs((prev) => [
      ...prev,
      { type: "log", text: "[Starting full project run in Docker container...]", time: now() },
    ]);
    socket.emit("project:run");
  }

  function handleRun() {
    let targetFilePath = activePath;
    let targetCode = activeContent;

    // If launch.json specifies a pinned entry point, resolve it
    if (hasLaunchConfig && launchConfig?.configurations?.[selectedConfigIndex]) {
      const cfg = launchConfig.configurations[selectedConfigIndex];
      if (cfg.program && cfg.program !== "${file}") {
        targetFilePath = cfg.program;
        targetCode = fileContentsCache[cfg.program] || "";
        if (!targetCode) {
          toast.error(`Program file "${cfg.program}" not found in workspace cache.`);
          return;
        }
      }
    }

    if (!targetFilePath || !targetCode.trim()) {
      toast.error("Open a file which can be debugged or run.");
      return;
    }

    setHasStarted(true);
    setLogs([]);
    setIsRunning(true);

    const now = () =>
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // Apply active breakpoints by inserting debugger; statements
    const activeBpLines = breakpoints
      .filter((b) => b.path === targetFilePath && b.enabled)
      .map((b) => b.line);

    const codeToExecute =
      activeBpLines.length > 0 ? insertBreakpoints(targetCode, activeBpLines) : targetCode;

    const filename = targetFilePath.split("/").pop() || targetFilePath;
    setLogs((prev) => [
      ...prev,
      {
        type: "log",
        text: `[Running ${filename}...]`,
        time: now(),
      },
    ]);

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("code:run-file", { filename, code: codeToExecute });
    } else {
      runCode(
        codeToExecute,
        (msg) => setLogs((l) => [...l, { type: "log", text: msg, time: now() }]),
        (msg) => setLogs((l) => [...l, { type: "error", text: msg, time: now() }]),
        (msg) => setLogs((l) => [...l, { type: "warn", text: msg, time: now() }]),
        (msg) => {
          if (mode === "debug-console") {
            setLogs((l) => [...l, { type: "result", text: msg, time: now() }]);
          }
        }
      );
      setIsRunning(false);
    }

    evaluateWatch();
  }

  function handleReplSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!replInput.trim()) return;

    const code = replInput.trim();
    setReplHistory((prev) => [code, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);

    const now = () =>
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    setLogs((prev) => [...prev, { type: "input", text: code, time: now() }]);
    setReplInput("");

    runCode(
      code,
      (msg) => setLogs((l) => [...l, { type: "log", text: msg, time: now() }]),
      (msg) => setLogs((l) => [...l, { type: "error", text: msg, time: now() }]),
      (msg) => setLogs((l) => [...l, { type: "warn", text: msg, time: now() }]),
      (msg) => setLogs((l) => [...l, { type: "result", text: msg, time: now() }])
    );
  }

  function handleReplKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (replHistory.length > 0) {
        const nextIndex = Math.min(historyIndex + 1, replHistory.length - 1);
        setHistoryIndex(nextIndex);
        setReplInput(replHistory[nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setReplInput(replHistory[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setReplInput("");
      }
    }
  }

  function createLaunchJson(e: React.MouseEvent) {
    e.preventDefault();
    const path = ".vscode/launch.json";
    const content = JSON.stringify(DEFAULT_LAUNCH_JSON, null, 2);
    setFileContent(path, content);
    addOpenFile(path);
    setActivePath(path);
    setHasStarted(true);

    if (workspaceId) {
      api.put(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(path)}`, content).catch(() => {});
    }
    toast.success("Created .vscode/launch.json");
  }

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchInput.trim()) return;
    setWatchExpressions((prev) => [...prev, { expr: newWatchInput.trim(), result: "" }]);
    setNewWatchInput("");
    setIsAddingWatch(false);
    evaluateWatch();
  };

  const handleAddBreakpoint = (e: React.FormEvent) => {
    e.preventDefault();
    const line = parseInt(newBpLine.trim(), 10);
    if (!activePath || isNaN(line) || line < 1) return;
    toggleBreakpoint(activePath, line);
    setNewBpLine("");
    setIsAddingBp(false);
  };

  // When no run has occurred, no file is open, and no launch.json exists -> match empty-state screenshot exactly
  const showEmptyState = !hasStarted && !hasLaunchConfig && !activePath;

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white/80 select-none text-xs w-full min-w-0 overflow-hidden">
      {/* Top Header: RUN AND DEBUG: {RUN | DEBUG CONSOLE} with "⋯" dropdown */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between relative bg-[#181818]/80">
        <span className="font-semibold uppercase tracking-wider text-white/60 text-[11px] truncate">
          RUN AND DEBUG: {mode === "run" ? "RUN" : "DEBUG CONSOLE"}
        </span>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
            title="More Actions..."
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl py-1 z-50 text-xs flex flex-col"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setMode("debug-console");
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left text-white/80 hover:text-white transition"
              >
                <span className="w-3.5 flex items-center justify-center font-bold text-blue-400">
                  {mode === "debug-console" && "✓"}
                </span>
                <span>Debug Console</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("run");
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left text-white/80 hover:text-white transition"
              >
                <span className="w-3.5 flex items-center justify-center font-bold text-blue-400">
                  {mode === "run" && "✓"}
                </span>
                <span>Run</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showEmptyState ? (
        /* Empty-State Screen (Matches Screenshot Exactly) */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-white/70 text-xs mb-4 max-w-[220px] leading-relaxed">
            Open a file which can be debugged or run.
          </p>

          <button
            type="button"
            onClick={handleRun}
            className="w-full max-w-[200px] py-2 px-4 rounded font-medium bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs transition shadow-md flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run and Debug</span>
          </button>

          <p className="text-white/40 text-[11px] mt-6 max-w-[240px] leading-relaxed">
            To customize Run and Debug, create a{" "}
            <a
              href="#"
              onClick={createLaunchJson}
              className="text-[#3794ff] hover:underline cursor-pointer"
            >
              launch.json
            </a>{" "}
            file.
          </p>
        </div>
      ) : (
        /* Active Run and Debug UI (Collapsible Sub-sections + Console / REPL) */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Top Control Bar with Configuration Picker & Play/Restart/Clear */}
          <div className="px-3 py-2 border-b border-white/5 bg-[#181818] flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {hasLaunchConfig && (launchConfig?.configurations?.length || 0) > 1 ? (
                <select
                  value={selectedConfigIndex}
                  onChange={(e) => setSelectedConfigIndex(Number(e.target.value))}
                  className="bg-[#252526] text-white/90 text-[11px] px-2 py-1 rounded border border-white/10 outline-none max-w-[130px] truncate"
                >
                  {launchConfig!.configurations.map((cfg, idx) => (
                    <option key={idx} value={idx}>
                      {cfg.name || `Config ${idx + 1}`}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-3 py-1 rounded font-medium bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs disabled:opacity-40 transition shadow-sm"
                  title="Run Single File (Piston Sandbox)"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run File</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRunProject}
                disabled={isRunning}
                className="flex items-center gap-1 px-2.5 py-1 rounded font-medium bg-[#238636] hover:bg-[#2ea043] text-white text-xs disabled:opacity-40 transition shadow-sm"
                title="Run full project in Docker container"
              >
                <Layers className="w-3 h-3" />
                <span>Run Project</span>
              </button>

              {hasLaunchConfig && (
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="p-1 rounded bg-[#0e639c] hover:bg-[#1177bb] text-white disabled:opacity-40 transition shadow-sm"
                  title="Start Debugging"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              )}

              <button
                type="button"
                onClick={handleRun}
                className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition"
                title="Restart (Ctrl+Shift+F5)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setLogs([])}
                className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition"
                title="Clear Console"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              className="flex items-center gap-1 text-[11px] text-white/40 truncate max-w-[130px]"
              title={activePath || "No active file"}
            >
              <FileCode className="w-3 h-3 text-blue-400 flex-shrink-0" />
              <span className="truncate">
                {activePath ? activePath.split("/").pop() : "No file"}
              </span>
            </div>
          </div>

          {/* Sub-sections: Variables, Watch, Call Stack, Breakpoints */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {/* 1. VARIABLES */}
            <div className="border-b border-white/5">
              <div
                onClick={() => toggleSection("variables")}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold text-white/60 uppercase tracking-wider"
              >
                {openSections.variables ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                )}
                <span>Variables</span>
              </div>
              {openSections.variables && (
                <div className="px-5 py-2 text-[11px] font-mono text-white/50 space-y-1 bg-black/20">
                  <div className="flex justify-between">
                    <span className="text-blue-400">Scope:</span>
                    <span>Local / Sandbox</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-400">activeFile:</span>
                    <span className="truncate max-w-[130px]">{activePath || "null"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-400">mode:</span>
                    <span>{mode}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. WATCH */}
            <div className="border-b border-white/5">
              <div className="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 text-[11px] font-bold text-white/60 uppercase tracking-wider">
                <div
                  onClick={() => toggleSection("watch")}
                  className="flex items-center gap-1.5 flex-1 cursor-pointer"
                >
                  {openSections.watch ? (
                    <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                  )}
                  <span>Watch</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingWatch(!isAddingWatch)}
                  className="p-0.5 rounded text-white/40 hover:text-white transition"
                  title="Add Expression"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {openSections.watch && (
                <div className="px-4 py-1.5 text-[11px] font-mono space-y-1 bg-black/20">
                  {isAddingWatch && (
                    <form onSubmit={handleAddWatch} className="flex items-center gap-1 mb-1.5">
                      <input
                        type="text"
                        value={newWatchInput}
                        onChange={(e) => setNewWatchInput(e.target.value)}
                        placeholder="Expression..."
                        autoFocus
                        className="flex-1 bg-[#1e1e1e] border border-white/20 rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
                      />
                      <button
                        type="submit"
                        className="px-1.5 py-0.5 bg-blue-600 rounded text-white text-[10px]"
                      >
                        Add
                      </button>
                    </form>
                  )}
                  {watchExpressions.length === 0 ? (
                    <div className="text-white/30 italic text-[10px]">No watch expressions</div>
                  ) : (
                    watchExpressions.map((w, idx) => (
                      <div key={idx} className="flex items-center justify-between group py-0.5">
                        <span className="text-purple-300 truncate max-w-[110px]" title={w.expr}>
                          {w.expr}:
                        </span>
                        <span className="text-white/70 truncate max-w-[90px]">{w.result || "—"}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setWatchExpressions((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-white/40 hover:text-red-400 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 3. CALL STACK */}
            <div className="border-b border-white/5">
              <div
                onClick={() => toggleSection("callStack")}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold text-white/60 uppercase tracking-wider"
              >
                {openSections.callStack ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                )}
                <span>Call Stack</span>
              </div>
              {openSections.callStack && (
                <div className="px-5 py-2 text-[11px] font-mono text-white/40 space-y-1 bg-black/20">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    <span>Thread 1: Main (Sandbox)</span>
                  </div>
                  <div className="pl-3.5 text-[10px] text-white/30 italic">
                    {isRunning ? "Running..." : "Idle / Stopped"}
                  </div>
                </div>
              )}
            </div>

            {/* 4. BREAKPOINTS */}
            <div className="border-b border-white/5">
              <div className="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 text-[11px] font-bold text-white/60 uppercase tracking-wider">
                <div
                  onClick={() => toggleSection("breakpoints")}
                  className="flex items-center gap-1.5 flex-1 cursor-pointer"
                >
                  {openSections.breakpoints ? (
                    <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                  )}
                  <span>Breakpoints</span>
                  {breakpoints.length > 0 && (
                    <span className="text-[10px] text-white/30">({breakpoints.length})</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingBp(!isAddingBp)}
                    className="p-0.5 rounded text-white/40 hover:text-white transition"
                    title="Add Line Breakpoint"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  {breakpoints.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllBreakpoints}
                      className="p-0.5 rounded text-white/40 hover:text-red-400 transition"
                      title="Remove All Breakpoints"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {openSections.breakpoints && (
                <div className="px-4 py-1.5 text-[11px] space-y-1 bg-black/20">
                  {isAddingBp && (
                    <form onSubmit={handleAddBreakpoint} className="flex items-center gap-1 mb-1.5">
                      <input
                        type="number"
                        value={newBpLine}
                        onChange={(e) => setNewBpLine(e.target.value)}
                        placeholder="Line number..."
                        autoFocus
                        className="flex-1 bg-[#1e1e1e] border border-white/20 rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
                      />
                      <button
                        type="submit"
                        className="px-1.5 py-0.5 bg-blue-600 rounded text-white text-[10px]"
                      >
                        Add
                      </button>
                    </form>
                  )}

                  {breakpoints.length === 0 ? (
                    <div className="text-white/30 italic text-[10px] py-1">
                      Click gutter in editor or + to add breakpoints
                    </div>
                  ) : (
                    breakpoints.map((bp) => {
                      const fileName = bp.path.split("/").pop() || bp.path;
                      return (
                        <div
                          key={bp.id}
                          className="flex items-center justify-between group py-0.5 hover:bg-white/5 px-1 rounded"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={bp.enabled}
                              onChange={(e) => setBreakpointEnabled(bp.id, e.target.checked)}
                              className="w-3 h-3 rounded accent-blue-500 cursor-pointer"
                            />
                            <div
                              onClick={() => setTargetJump({ path: bp.path, line: bp.line })}
                              className="flex items-center gap-1 truncate cursor-pointer hover:text-blue-400"
                              title={`Jump to ${bp.path}:${bp.line}`}
                            >
                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                              <span className="text-white/70 font-mono text-[10px] truncate">
                                {fileName}:{bp.line}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeBreakpoint(bp.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-white/40 hover:text-red-400 transition"
                            title="Remove Breakpoint"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 5. CONSOLE / RUN OUTPUT */}
            <div className="flex-1 flex flex-col min-h-[140px] border-t border-white/5">
              <div
                onClick={() => toggleSection("console")}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[11px] font-bold text-white/60 uppercase tracking-wider bg-[#181818]"
              >
                {openSections.console ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                )}
                <span>{mode === "debug-console" ? "Debug Console" : "Run Output"}</span>
                {logs.length > 0 && (
                  <span className="text-[10px] text-white/30">({logs.length})</span>
                )}
              </div>

              {openSections.console && (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 font-mono text-[11px] flex flex-col gap-1 bg-[#0e0e0e]">
                  {logs.length === 0 ? (
                    <div className="text-white/30 text-center py-6 italic">
                      {mode === "debug-console"
                        ? "Debug Console ready. Click Run or evaluate expressions below."
                        : "Output will appear here after clicking Run."}
                    </div>
                  ) : (
                    logs.map((l, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 py-0.5 px-1.5 rounded ${
                          l.type === "error"
                            ? "bg-red-500/10 text-[#ff6b6b]"
                            : l.type === "warn"
                            ? "bg-yellow-500/10 text-[#e5c07b]"
                            : l.type === "input"
                            ? "text-blue-300 font-semibold bg-blue-500/5"
                            : l.type === "result"
                            ? "text-[#c678dd] italic"
                            : "text-[#cccccc] hover:bg-white/5"
                        }`}
                      >
                        <span className="text-white/30 text-[10px] w-14 flex-shrink-0 font-sans">
                          {l.time}
                        </span>
                        {l.type === "error" && (
                          <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        {l.type === "input" && (
                          <span className="text-blue-400 font-bold">&gt;</span>
                        )}
                        <span className="break-all whitespace-pre-wrap flex-1">{l.text}</span>
                      </div>
                    ))
                  )}
                  <div ref={consoleEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Interactive REPL Input for Debug Console Mode */}
          {mode === "debug-console" && (
            <form
              onSubmit={handleReplSubmit}
              className="p-2 border-t border-white/10 bg-[#161616] flex items-center gap-1.5 flex-shrink-0"
            >
              <span className="text-blue-400 font-mono font-bold text-xs pl-1">&gt;</span>
              <input
                type="text"
                value={replInput}
                onChange={(e) => setReplInput(e.target.value)}
                onKeyDown={handleReplKeyDown}
                placeholder="Evaluate expression (e.g. 2 + 2, Math.PI)..."
                className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-white placeholder-white/20"
              />
              <button
                type="submit"
                disabled={!replInput.trim()}
                className="p-1 rounded text-white/40 hover:text-white disabled:opacity-30 transition"
                title="Send Expression (Enter)"
              >
                <CornerDownLeft className="w-3 h-3" />
              </button>
            </form>
          )}

          {/* Bottom Footer Info */}
          <div className="px-3 py-1 border-t border-white/5 bg-white/[0.01] text-[10px] text-white/30 flex items-center justify-between flex-shrink-0">
            <span>
              {hasLaunchConfig ? "Using .vscode/launch.json" : "Sandboxed iframe runner"}
            </span>
            {!hasLaunchConfig && (
              <a
                href="#"
                onClick={createLaunchJson}
                className="text-[#3794ff] hover:underline cursor-pointer"
              >
                create launch.json
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RunDebugPanel;
