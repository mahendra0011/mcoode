import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ChevronDown,
  SplitSquareHorizontal,
  Trash2,
  X,
  Maximize2,
  Minimize2,
  AlertCircle,
  AlertTriangle,
  Info,
  Filter,
  Copy,
  Terminal as TerminalIcon,
  Globe,
  Check,
  MoreHorizontal,
  ChevronRight,
  Bug,
  FileText,
  Play,
  CornerDownLeft,
  Folder,
  Settings,
  Eye,
} from 'lucide-react';
import {
  MultiTerminalPanel,
  type MultiTerminalPanelHandle,
  type TerminalSessionMeta,
} from './MultiTerminalPanel';
import type { ChatMessage } from '../../types/chat';
import { useIDEStore, type PanelTab } from '../../store/ideStore';
import { useAppSelector } from '../../store';
import { WatchActivityFeed } from './WatchActivityFeed';
import { getSocket } from '../../hooks/useChatSocket';
import api from '../../lib/axios';
import { toast } from 'sonner';

/**
 * Full VS Code bottom panel — the container that holds Problems / Output /
 * Debug Console / Terminal / Ports as tabs, exactly like real VS Code's
 * panel row. Terminal tab itself renders MultiTerminalPanel's tab bar +
 * content, PLUS the right-side terminal instance list panel (screenshot's
 * "node / node" list) and all VS Code overflow / profile menus.
 */

export interface ProblemEntry {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  column?: number;
  col?: number;
  source?: string;
  ruleId?: string;
}

export interface OutputChannel {
  id: string;
  name: string;
  lines: string[];
}

export interface ForwardedPort {
  port: number;
  label?: string;
  visibility: 'private' | 'public';
  process?: string;
  localUrl: string;
}

export interface BottomPanelProps {
  workspaceId?: string | null;
  messages: ChatMessage[];
  onCommand?: (cmd: string) => void;
  onInterrupt?: () => void;
  onClose?: () => void;
  problems?: ProblemEntry[];
  outputChannels?: OutputChannel[];
  ports?: ForwardedPort[];
  defaultTab?: PanelTab;
  className?: string;
}

const ALL_TABS: { id: PanelTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'problems', label: 'Problems', icon: AlertCircle },
  { id: 'output', label: 'Output', icon: FileText },
  { id: 'debugConsole', label: 'Debug Console', icon: Bug },
  { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
  { id: 'ports', label: 'Ports', icon: Globe },
  { id: 'watch', label: 'Watch Activity', icon: Eye },
];

const SHELL_TYPES: { id: TerminalSessionMeta['shellType']; label: string }[] = [
  { id: 'bash', label: 'bash' },
  { id: 'zsh', label: 'zsh' },
  { id: 'powershell', label: 'PowerShell' },
  { id: 'node', label: 'Node.js' },
];

const DEFAULT_OUTPUT_CHANNELS: OutputChannel[] = [
  {
    id: 'code-runner',
    name: 'Code Runner',
    lines: ['[Code Runner] Ready. Click the "Run" button on the top-right of the editor to execute files.'],
  },
  {
    id: 'tasks',
    name: 'Tasks',
    lines: [
      '[mcode] Build system ready.',
      '[mcode] TypeScript language server running.',
      '[mcode] Watching workspace changes...',
    ],
  },
  {
    id: 'git',
    name: 'Git',
    lines: [
      'git status --porcelain',
      'On branch main',
      'Your branch is up to date with origin/main.',
    ],
  },
  {
    id: 'extensions',
    name: 'Extensions',
    lines: [
      '[Extension Host] Loaded extensions successfully.',
      '[Extension Host] ESLint language diagnostics active.',
    ],
  },
];

const DEFAULT_PORTS: ForwardedPort[] = [
  {
    port: 3000,
    label: 'web',
    visibility: 'private',
    process: 'next dev',
    localUrl: 'http://localhost:3000',
  },
];

export function BottomPanel({
  workspaceId,
  messages,
  onCommand,
  onInterrupt,
  onClose,
  problems = [],
  outputChannels = DEFAULT_OUTPUT_CHANNELS,
  ports = DEFAULT_PORTS,
  defaultTab = 'terminal',
  className = '',
}: BottomPanelProps) {
  const storeActiveTab = useIDEStore((s) => s.activePanelTab);
  const setStoreActiveTab = useIDEStore((s) => s.setActivePanelTab);
  const setTerminalOpen = useIDEStore((s) => s.setTerminalOpen);
  const activePath = useIDEStore((s) => s.activePath);
  const activeEditor = useIDEStore((s) => s.activeEditor);
  const setTasksOpen = useIDEStore((s) => s.setTasksOpen);
  const openSettings = useIDEStore((s) => s.openSettings);

  const activeTab: PanelTab = storeActiveTab || defaultTab || 'terminal';
  const setActiveTab = (tab: PanelTab) => {
    setStoreActiveTab(tab);
  };
  const watch = useAppSelector((s) => s.chat.watch);

  const [isMaximized, setIsMaximized] = useState(false);
  const [terminalListOpen, setTerminalListOpen] = useState(false);
  const [terminals, setTerminals] = useState<TerminalSessionMeta[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  // Menu states
  const [shellProfileMenuOpen, setShellProfileMenuOpen] = useState(false);
  const [terminalMenuOpen, setTerminalMenuOpen] = useState(false);
  const [panelMenuOpen, setPanelMenuOpen] = useState(false);

  // Recent command / directory popups
  const [recentDirsModalOpen, setRecentDirsModalOpen] = useState(false);
  const [recentCommandsModalOpen, setRecentCommandsModalOpen] = useState(false);

  // Visible tabs state (controlled via panel overflow menu)
  const [visibleTabs, setVisibleTabs] = useState<Record<PanelTab, boolean>>({
    problems: true,
    output: true,
    debugConsole: true,
    terminal: true,
    ports: true,
    watch: true,
  });
  const [showIcons, setShowIcons] = useState(true);

  // Channels state for Output tab
  const [channelsList, setChannelsList] = useState<OutputChannel[]>(outputChannels);
  const [activeChannelId, setActiveChannelId] = useState<string>(outputChannels[0]?.id || 'tasks');

  // Ports state
  const [portList, setPortList] = useState<ForwardedPort[]>(ports);
  const [isAddingPort, setIsAddingPort] = useState(false);
  const [newPortNumber, setNewPortNumber] = useState('');
  const [newPortLabel, setNewPortLabel] = useState('');

  // Ref to MultiTerminalPanel handle for external control
  const terminalPanelRef = useRef<MultiTerminalPanelHandle | null>(null);

  const problemCounts = {
    error: problems.filter((p) => p.severity === 'error').length,
    warning: problems.filter((p) => p.severity === 'warning').length,
    info: problems.filter((p) => p.severity === 'info').length,
  };

  const handleSessionsChange = useCallback(
    (list: TerminalSessionMeta[], activeId: string) => {
      setTerminals((prev) => {
        if (
          prev.length === list.length &&
          prev.every((p, idx) => p.id === list[idx].id && p.name === list[idx].name)
        ) {
          return prev;
        }
        return list;
      });
      setActiveTerminalId((prev) => (prev === activeId ? prev : activeId));
    },
    []
  );

  // Listen to Piston single-file run results and Docker project run events
  useEffect(() => {
    const socket = getSocket();

    const handleRunResult = (payload: any) => {
      const now = new Date().toLocaleTimeString();
      const newLines: string[] = [];

      if (payload.error) {
        newLines.push(`[${now}] [Error]: ${payload.error}`);
        toast.error(`Code execution error: ${payload.error}`);
      } else {
        newLines.push(`[${now}] === Execution Result (Exit Code: ${payload.exitCode ?? 0}) ===`);
        if (payload.compileOutput) {
          newLines.push(`[Compile Output]:\n${payload.compileOutput}`);
        }
        if (payload.stdout) {
          newLines.push(`[stdout]:\n${payload.stdout}`);
        }
        if (payload.stderr) {
          newLines.push(`[stderr]:\n${payload.stderr}`);
        }
        toast.success(`Execution completed (exit code: ${payload.exitCode ?? 0})`);
      }

      setChannelsList((prev) => {
        const found = prev.find((c) => c.id === 'code-runner');
        if (found) {
          return prev.map((c) =>
            c.id === 'code-runner' ? { ...c, lines: [...c.lines, ...newLines] } : c
          );
        }
        return [{ id: 'code-runner', name: 'Code Runner', lines: newLines }, ...prev];
      });
      setActiveChannelId('code-runner');
      setStoreActiveTab('output');
    };

    const handleProjectReady = (payload: any) => {
      if (payload.previewUrl) {
        toast.success(`Project running in Docker container: ${payload.previewUrl}`, {
          action: {
            label: 'Open Preview',
            onClick: () =>
              window.open(`/preview?url=${encodeURIComponent(payload.previewUrl)}`, '_blank'),
          },
        });
      }
    };

    const handleProjectError = (payload: any) => {
      toast.error(`Docker error: ${payload.error}`);
    };

    socket.on('code:run-result', handleRunResult);
    socket.on('project:run-ready', handleProjectReady);
    socket.on('project:run-error', handleProjectError);

    return () => {
      socket.off('code:run-result', handleRunResult);
      socket.off('project:run-ready', handleProjectReady);
      socket.off('project:run-error', handleProjectError);
    };
  }, [setStoreActiveTab]);

  const onHidePanel = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setTerminalOpen(false);
    }
  }, [onClose, setTerminalOpen]);

  const onNewTerminal = useCallback((shellType?: TerminalSessionMeta['shellType']) => {
    terminalPanelRef.current?.newTerminal(shellType);
    setShellProfileMenuOpen(false);
  }, []);

  const onSplitTerminal = useCallback(() => {
    terminalPanelRef.current?.splitTerminal();
    setShellProfileMenuOpen(false);
  }, []);

  const onKillTerminal = useCallback(() => {
    terminalPanelRef.current?.killActiveTerminal();
  }, []);

  const onClearTerminal = useCallback(() => {
    terminalPanelRef.current?.clearActiveTerminal();
    setTerminalMenuOpen(false);
  }, []);

  const onScrollPrevCommand = useCallback(() => {
    terminalPanelRef.current?.scrollActiveTerminal('prev');
    setTerminalMenuOpen(false);
  }, []);

  const onScrollNextCommand = useCallback(() => {
    terminalPanelRef.current?.scrollActiveTerminal('next');
    setTerminalMenuOpen(false);
  }, []);

  const onRunActiveFile = useCallback(() => {
    setTerminalMenuOpen(false);
    if (!activePath) {
      toast.info('No active file is open');
      return;
    }
    const ext = activePath.split('.').pop()?.toLowerCase();
    let runner = '';
    if (ext === 'js' || ext === 'ts' || ext === 'mjs') runner = 'node';
    else if (ext === 'py') runner = 'python';
    else if (ext === 'sh') runner = 'bash';
    else runner = 'cat';

    const cmd = `${runner} "${activePath}"`;
    terminalPanelRef.current?.runInActiveTerminal(cmd);
    toast.success(`Running ${activePath}`);
  }, [activePath]);

  const onRunSelectedText = useCallback(() => {
    setTerminalMenuOpen(false);
    try {
      const selection = activeEditor?.getSelection();
      const model = activeEditor?.getModel();
      const selectedText = model?.getValueInRange(selection);
      if (!selectedText || !selectedText.trim()) {
        toast.info('No text selected in active editor');
        return;
      }
      terminalPanelRef.current?.runInActiveTerminal(selectedText.trim());
      toast.success('Dispatched selected text to terminal');
    } catch {
      toast.info('Could not read editor selection');
    }
  }, [activeEditor]);

  const onGoToRecentDirectory = useCallback(() => {
    setTerminalMenuOpen(false);
    setRecentDirsModalOpen(true);
  }, []);

  const onRunRecentCommand = useCallback(() => {
    setTerminalMenuOpen(false);
    setRecentCommandsModalOpen(true);
  }, []);

  const onRunTask = useCallback(() => {
    setShellProfileMenuOpen(false);
    setTasksOpen(true);
  }, [setTasksOpen]);

  const handleCopyProblems = useCallback(() => {
    if (problems.length === 0) {
      toast.info('No problems to copy');
      return;
    }
    const text = problems
      .map(
        (p) =>
          `[${p.severity.toUpperCase()}] ${p.file}:${p.line}:${p.column ?? p.col ?? 1} - ${p.message} (${p.source || 'linter'})`
      )
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied problems to clipboard');
    });
  }, [problems]);

  const handleClearOutput = useCallback(() => {
    setChannelsList((prev) =>
      prev.map((c) => (c.id === activeChannelId ? { ...c, lines: [] } : c))
    );
  }, [activeChannelId]);

  const handleForwardPort = useCallback(async () => {
    const portNum = parseInt(newPortNumber, 10);
    if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
      toast.error('Please enter a valid port number (1-65535)');
      return;
    }

    let isListening = true;
    if (workspaceId) {
      try {
        const res = await api.get(`/api/v1/workspaces/${workspaceId}/ports/${portNum}/check`);
        isListening = res.data?.listening ?? true;
      } catch {
        // Continue gracefully
      }
    }

    const newPort: ForwardedPort = {
      port: portNum,
      label: newPortLabel.trim() || `port-${portNum}`,
      visibility: 'private',
      process: isListening ? 'active' : 'idle',
      localUrl: `http://localhost:${portNum}`,
    };
    setPortList((prev) => [...prev.filter((p) => p.port !== portNum), newPort]);
    setNewPortNumber('');
    setNewPortLabel('');
    setIsAddingPort(false);
    if (isListening) {
      toast.success(`Port ${portNum} forwarded and active`);
    } else {
      toast.info(`Port ${portNum} forwarded (no process listening yet)`);
    }
  }, [newPortNumber, newPortLabel, workspaceId]);

  const [panelHeight, setPanelHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mcode_bottom_panel_height');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 100) return val;
      }
    }
    return 240;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startY = e.clientY;
      const startHeight = panelHeight;

      const onMouseMove = (ev: MouseEvent) => {
        const deltaY = startY - ev.clientY;
        const maxHeight = window.innerHeight - 140;
        const next = Math.max(100, Math.min(maxHeight, startHeight + deltaY));
        setPanelHeight(next);
        setIsMaximized(false);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        setPanelHeight((h) => {
          try {
            localStorage.setItem('mcode_bottom_panel_height', String(h));
          } catch {}
          return h;
        });
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [panelHeight]
  );

  // Filter tabs according to visibleTabs configuration
  const renderedTabs = ALL_TABS.filter((tab) => visibleTabs[tab.id]);

  return (
    <motion.div
      style={{ height: isMaximized ? 'calc(100vh - 120px)' : `${panelHeight}px` }}
      className={`border-t border-white/5 bg-[#0e0e0e] flex flex-col flex-shrink-0 select-none relative z-10 min-h-[100px] ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top drag resize handle (VS Code style) */}
      <div
        onMouseDown={startResize}
        onDoubleClick={() => setIsMaximized((v) => !v)}
        className={`h-1.5 w-full cursor-ns-resize transition-colors relative z-30 group flex items-center justify-center -mb-1 select-none ${
          isResizing ? 'bg-[#0078d4]' : 'hover:bg-[#0078d4]/70'
        }`}
        title="Drag to resize panel, double-click to toggle maximize"
      >
        <div
          className={`w-12 h-1 rounded-full transition-colors ${
            isResizing ? 'bg-white' : 'bg-white/20 group-hover:bg-white/80'
          }`}
        />
      </div>
      {/* Top tab row (Problems / Output / Debug Console / Terminal / Ports) */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#121212] px-2 flex-shrink-0 h-9">
        <div className="flex items-center h-full overflow-x-auto no-scrollbar">
          {renderedTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 h-full text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id ? 'text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {showIcons && <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />}
                <span>{tab.label}</span>
                {tab.id === 'problems' && (problemCounts.error > 0 || problemCounts.warning > 0) && (
                  <span className="ml-1 inline-flex items-center gap-1 text-[10px]">
                    {problemCounts.error > 0 && (
                      <span className="text-red-400 bg-red-500/20 px-1 rounded-full font-mono">
                        {problemCounts.error}
                      </span>
                    )}
                    {problemCounts.warning > 0 && (
                      <span className="text-yellow-400 bg-yellow-500/20 px-1 rounded-full font-mono">
                        {problemCounts.warning}
                      </span>
                    )}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="panel-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0078d4]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right-side toolbar — changes slightly based on active tab, matches VS Code */}
        <div className="flex items-center gap-1 py-1 relative">
          {activeTab === 'terminal' && (
            <>
              {/* "+" New Terminal — click = instant new terminal, ▾ = full profile menu (image 2) */}
              <div className="relative">
                <div className="flex items-center text-white/50 hover:text-white transition p-1">
                  <button
                    onClick={() => onNewTerminal?.('bash')}
                    title="New Terminal (Ctrl+Shift+`)"
                    className="hover:text-white transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShellProfileMenuOpen((v) => !v)}
                    title="Launch Profile..."
                    className="hover:text-white transition ml-0.5"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                {shellProfileMenuOpen && (
                  <NewTerminalProfileMenu
                    onClose={() => setShellProfileMenuOpen(false)}
                    onNewTerminal={onNewTerminal}
                    onSplitTerminal={onSplitTerminal}
                    onRunTask={onRunTask}
                    onOpenSettings={() => {
                      setShellProfileMenuOpen(false);
                      openSettings('appearance');
                    }}
                  />
                )}
              </div>

              {/* Split Terminal */}
              <button
                onClick={() => onSplitTerminal?.()}
                className="text-white/50 hover:text-white transition p-1 rounded hover:bg-white/5"
                title="Split Terminal (Ctrl+Shift+5)"
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Toggle Terminal List */}
              <button
                onClick={() => setTerminalListOpen((v) => !v)}
                className={`p-1 transition rounded ${
                  terminalListOpen
                    ? 'text-white bg-white/10'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
                title="Toggle Terminal Instances List"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="2" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>

              {/* Kill Terminal */}
              <button
                onClick={() => onKillTerminal?.()}
                className="text-white/50 hover:text-white transition p-1 rounded hover:bg-white/5"
                title="Kill Terminal"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Terminal "..." overflow menu (image 3) */}
              <div className="relative">
                <button
                  onClick={() => setTerminalMenuOpen((v) => !v)}
                  className={`p-1 transition rounded ${
                    terminalMenuOpen
                      ? 'text-white bg-white/10'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                  title="Terminal Actions..."
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {terminalMenuOpen && (
                  <TerminalOverflowMenu
                    onClose={() => setTerminalMenuOpen(false)}
                    onScrollPrevCommand={onScrollPrevCommand}
                    onScrollNextCommand={onScrollNextCommand}
                    onClearTerminal={onClearTerminal}
                    onRunActiveFile={onRunActiveFile}
                    onRunSelectedText={onRunSelectedText}
                    onGoToRecentDirectory={onGoToRecentDirectory}
                    onRunRecentCommand={onRunRecentCommand}
                  />
                )}
              </div>
            </>
          )}

          {activeTab === 'problems' && (
            <>
              <button
                onClick={handleCopyProblems}
                className="text-white/50 hover:text-white transition p-1 rounded hover:bg-white/5"
                title="Copy All"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {activeTab === 'output' && (
            <button
              onClick={handleClearOutput}
              className="text-white/50 hover:text-white transition p-1 rounded hover:bg-white/5"
              title="Clear Output"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {activeTab === 'ports' && (
            <button
              onClick={() => setIsAddingPort((v) => !v)}
              className="text-white/50 hover:text-white transition p-1 rounded hover:bg-white/5"
              title="Forward a Port"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

          {/* Maximize / Restore */}
          <button
            onClick={() => setIsMaximized((v) => !v)}
            className="text-white/50 hover:text-white transition p-1 rounded hover:bg-white/5"
            title={isMaximized ? 'Restore Panel Size' : 'Maximize Panel'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Panel "..." menu (image 1: tab visibility, position, align, hide) */}
          <div className="relative">
            <button
              onClick={() => setPanelMenuOpen((v) => !v)}
              className={`p-1 transition rounded ${
                panelMenuOpen ? 'text-white bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
              title="Panel Layout & Tabs..."
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {panelMenuOpen && (
              <PanelOverflowMenu
                onClose={() => setPanelMenuOpen(false)}
                visibleTabs={visibleTabs}
                onToggleTabVisible={(id) =>
                  setVisibleTabs((prev) => ({ ...prev, [id]: !prev[id] }))
                }
                showIcons={showIcons}
                onToggleShowIcons={() => setShowIcons((v) => !v)}
                onHidePanel={onHidePanel}
              />
            )}
          </div>

          {/* Close panel */}
          <button
            onClick={onHidePanel}
            className="text-white/50 hover:text-white transition p-1 rounded hover:bg-white/5"
            title="Close Panel (Ctrl+`)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          {activeTab === 'problems' && <ProblemsView problems={problems} />}
          {activeTab === 'output' && (
            <OutputView
              channels={channelsList}
              activeChannelId={activeChannelId}
              onSelectChannel={setActiveChannelId}
            />
          )}
          {activeTab === 'debugConsole' && <DebugConsoleView />}
          {activeTab === 'terminal' && (
            <MultiTerminalPanel
              ref={terminalPanelRef}
              messages={messages}
              onCommand={onCommand}
              onInterrupt={onInterrupt}
              onSessionsChange={handleSessionsChange}
              hideOwnHeader
            />
          )}
          {activeTab === 'ports' && (
            <PortsView
              ports={portList}
              isAddingPort={isAddingPort}
              newPortNumber={newPortNumber}
              newPortLabel={newPortLabel}
              onPortNumberChange={setNewPortNumber}
              onPortLabelChange={setNewPortLabel}
              onForwardPort={handleForwardPort}
              onCancelAddPort={() => setIsAddingPort(false)}
            />
          )}
          {activeTab === 'watch' && (
            <WatchActivityFeed projectId={workspaceId} live={watch.lastActivity} />
          )}
        </div>

        {/* Right-side terminal instance list (screenshot: "node / node" panel) */}
        {activeTab === 'terminal' && terminalListOpen && (
          <div className="w-48 border-l border-white/5 bg-[#0e0e0e] flex flex-col flex-shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 text-[10px] text-white/40 uppercase font-semibold tracking-wider">
              <span>Terminals</span>
              <button
                onClick={() => onNewTerminal('bash')}
                className="hover:text-white transition p-0.5"
                title="New Terminal"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {terminals.map((t) => (
              <div
                key={t.id}
                onClick={() => terminalPanelRef.current?.setActiveTerminalId(t.id)}
                className={`group flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer border-l-2 transition-colors ${
                  t.id === activeTerminalId
                    ? 'bg-white/10 text-white border-[#0078d4]'
                    : 'text-white/60 hover:bg-white/5 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <TerminalProcessIcon shellType={t.shellType} />
                  <span className="truncate">{t.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    terminalPanelRef.current?.killTerminalById(t.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition p-0.5 ml-1"
                  title="Kill Terminal"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Go to Recent Directory */}
      {recentDirsModalOpen && (
        <RecentListModal
          title="Go to Recent Directory"
          icon={<Folder className="w-4 h-4 text-yellow-400" />}
          items={terminalPanelRef.current?.getRecentDirectories() || []}
          emptyText="No recent directories recorded. Use 'cd <dir>' in terminal first."
          onSelect={(dir) => {
            terminalPanelRef.current?.runInActiveTerminal(`cd "${dir}"`);
            setRecentDirsModalOpen(false);
          }}
          onClose={() => setRecentDirsModalOpen(false)}
        />
      )}

      {/* Modal: Run Recent Command */}
      {recentCommandsModalOpen && (
        <RecentListModal
          title="Run Recent Command"
          icon={<CornerDownLeft className="w-4 h-4 text-emerald-400" />}
          items={terminalPanelRef.current?.getRecentCommands() || []}
          emptyText="No recent commands run in this session."
          onSelect={(cmd) => {
            terminalPanelRef.current?.runInActiveTerminal(cmd);
            setRecentCommandsModalOpen(false);
          }}
          onClose={() => setRecentCommandsModalOpen(false)}
        />
      )}
    </motion.div>
  );
}

function TerminalProcessIcon({ shellType }: { shellType: string }) {
  const color =
    {
      bash: '#4caf50',
      zsh: '#10b981',
      powershell: '#2196f3',
      node: '#8bc34a',
    }[shellType] ?? '#8a8a8a';
  return <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />;
}

// ---------------------------------------------------------------------
// 1. New Terminal Profile Menu (Image 2)
// ---------------------------------------------------------------------
interface NewTerminalProfileMenuProps {
  onClose: () => void;
  onNewTerminal?: (shell: TerminalSessionMeta['shellType']) => void;
  onSplitTerminal?: () => void;
  onRunTask?: () => void;
  onOpenSettings?: () => void;
}

function NewTerminalProfileMenu({
  onClose,
  onNewTerminal,
  onSplitTerminal,
  onRunTask,
  onOpenSettings,
}: NewTerminalProfileMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 w-52 bg-[#1e1e1e] border border-white/10 rounded-md shadow-2xl py-1 z-50 text-xs text-white"
    >
      <div className="px-3 py-1 text-[10px] uppercase font-semibold text-white/40 tracking-wider">
        Shell Profiles
      </div>
      {SHELL_TYPES.map((shell) => (
        <button
          key={shell.id}
          onClick={() => onNewTerminal?.(shell.id)}
          className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition flex items-center justify-between"
        >
          <span>{shell.label}</span>
          <TerminalProcessIcon shellType={shell.id} />
        </button>
      ))}
      <div className="my-1 border-t border-white/10" />
      <button
        onClick={() => onSplitTerminal?.()}
        className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition flex items-center gap-2"
      >
        <SplitSquareHorizontal className="w-3.5 h-3.5 text-white/50" />
        <span>Split Terminal</span>
      </button>
      <button
        onClick={() => onRunTask?.()}
        className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition flex items-center gap-2"
      >
        <Play className="w-3.5 h-3.5 text-white/50" />
        <span>Run Task...</span>
      </button>
      <div className="my-1 border-t border-white/10" />
      <button
        onClick={() => onOpenSettings?.()}
        className="w-full text-left px-3 py-1.5 text-white/60 hover:bg-white/10 hover:text-white transition flex items-center gap-2 text-[11px]"
      >
        <Settings className="w-3.5 h-3.5 text-white/40" />
        <span>Configure Terminal Settings...</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
// 2. Terminal Overflow Menu (Image 3)
// ---------------------------------------------------------------------
interface TerminalOverflowMenuProps {
  onClose: () => void;
  onScrollPrevCommand?: () => void;
  onScrollNextCommand?: () => void;
  onClearTerminal?: () => void;
  onRunActiveFile?: () => void;
  onRunSelectedText?: () => void;
  onGoToRecentDirectory?: () => void;
  onRunRecentCommand?: () => void;
}

function TerminalOverflowMenu({
  onClose,
  onScrollPrevCommand,
  onScrollNextCommand,
  onClearTerminal,
  onRunActiveFile,
  onRunSelectedText,
  onGoToRecentDirectory,
  onRunRecentCommand,
}: TerminalOverflowMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 w-64 bg-[#1e1e1e] border border-white/10 rounded-md shadow-2xl py-1 z-50 text-xs text-white"
    >
      <button
        onClick={() => onScrollPrevCommand?.()}
        className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition flex items-center justify-between"
      >
        <span>Scroll to Previous Command</span>
        <span className="text-[10px] text-white/40 font-mono">Ctrl+Up</span>
      </button>
      <button
        onClick={() => onScrollNextCommand?.()}
        className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition flex items-center justify-between"
      >
        <span>Scroll to Next Command</span>
        <span className="text-[10px] text-white/40 font-mono">Ctrl+Down</span>
      </button>
      <button
        onClick={() => onClearTerminal?.()}
        className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition flex items-center justify-between"
      >
        <span>Clear Terminal</span>
        <span className="text-[10px] text-white/40 font-mono">Ctrl+K</span>
      </button>

      <div className="my-1 border-t border-white/10" />

      <button
        onClick={() => onRunActiveFile?.()}
        className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
      >
        Run Active File in Terminal
      </button>
      <button
        onClick={() => onRunSelectedText?.()}
        className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
      >
        Run Selected Text in Terminal
      </button>

      <div className="my-1 border-t border-white/10" />

      <button
        onClick={() => onGoToRecentDirectory?.()}
        className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition flex items-center justify-between"
      >
        <span>Go to Recent Directory...</span>
        <Folder className="w-3.5 h-3.5 text-white/40" />
      </button>
      <button
        onClick={() => onRunRecentCommand?.()}
        className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition flex items-center justify-between"
      >
        <span>Run Recent Command...</span>
        <CornerDownLeft className="w-3.5 h-3.5 text-white/40" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
// 3. Panel Overflow Menu (Image 1)
// ---------------------------------------------------------------------
interface PanelOverflowMenuProps {
  onClose: () => void;
  visibleTabs: Record<PanelTab, boolean>;
  onToggleTabVisible: (id: PanelTab) => void;
  showIcons: boolean;
  onToggleShowIcons: () => void;
  onHidePanel: () => void;
}

function PanelOverflowMenu({
  onClose,
  visibleTabs,
  onToggleTabVisible,
  showIcons,
  onToggleShowIcons,
  onHidePanel,
}: PanelOverflowMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 w-56 bg-[#1e1e1e] border border-white/10 rounded-md shadow-2xl py-1 z-50 text-xs text-white"
    >
      <div className="px-3 py-1 text-[10px] uppercase font-semibold text-white/40 tracking-wider">
        Visible Tabs
      </div>
      {ALL_TABS.map((tab) => {
        const isChecked = visibleTabs[tab.id];
        return (
          <button
            key={tab.id}
            onClick={() => onToggleTabVisible(tab.id)}
            className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition flex items-center justify-between"
          >
            <span>{tab.label}</span>
            {isChecked && <Check className="w-3.5 h-3.5 text-[#0078d4]" />}
          </button>
        );
      })}

      <div className="my-1 border-t border-white/10" />

      <button
        onClick={onToggleShowIcons}
        className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition flex items-center justify-between"
      >
        <span>Show Icons</span>
        {showIcons && <Check className="w-3.5 h-3.5 text-[#0078d4]" />}
      </button>

      <div className="my-1 border-t border-white/10" />

      <div className="px-3 py-1.5 text-white/50 flex items-center justify-between">
        <span>Panel Position</span>
        <span className="text-white/70 font-medium">Bottom</span>
      </div>
      <div className="px-3 py-1.5 text-white/50 flex items-center justify-between">
        <span>Panel Alignment</span>
        <span className="text-white/70 font-medium">Justify</span>
      </div>

      <div className="my-1 border-t border-white/10" />

      <button
        onClick={() => {
          onClose();
          onHidePanel();
        }}
        className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/10 transition flex items-center justify-between"
      >
        <span>Hide Panel</span>
        <span className="text-[10px] text-white/40 font-mono">Ctrl+`</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
// Modal Helper for Recent Directories & Commands
// ---------------------------------------------------------------------
interface RecentListModalProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  emptyText: string;
  onSelect: (item: string) => void;
  onClose: () => void;
}

function RecentListModal({ title, icon, items, emptyText, onSelect, onClose }: RecentListModalProps) {
  const [filter, setFilter] = useState('');
  const filtered = items.filter((it) => it.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className="w-full max-w-lg bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl overflow-hidden text-xs"
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#252525]">
          <div className="flex items-center gap-2 font-medium text-white">
            {icon}
            <span>{title}</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-2 border-b border-white/5 bg-[#181818]">
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Type to filter..."
            className="w-full bg-[#121212] border border-white/10 rounded px-2.5 py-1.5 text-white outline-none"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1 font-mono">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-white/40 italic font-sans">{emptyText}</div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onSelect(item)}
                className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded transition flex items-center justify-between group"
              >
                <span className="truncate">{item}</span>
                <span className="text-[10px] text-white/30 group-hover:text-white/60 font-sans">
                  Select ↵
                </span>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Problems Tab
// ---------------------------------------------------------------------
function ProblemsView({ problems }: { problems: ProblemEntry[] }) {
  const [filterQuery, setFilterQuery] = useState('');
  const setTargetJump = useIDEStore((s) => s.setTargetJump);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const setActivePath = useIDEStore((s) => s.setActivePath);

  const filtered = problems.filter(
    (p) =>
      p.message.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.file.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (problems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-xs italic gap-1 select-none">
        <Check className="w-5 h-5 text-white/20 mb-1" />
        <span>No problems have been detected in the workspace.</span>
      </div>
    );
  }

  const grouped = filtered.reduce<Record<string, ProblemEntry[]>>((acc, p) => {
    (acc[p.file] = acc[p.file] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-1.5 border-b border-white/5 flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-white/40" />
        <input
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter problems (e.g. text, file name)"
          className="bg-transparent outline-none text-xs text-white/80 placeholder-white/30 w-64"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-1 text-xs">
        {Object.entries(grouped).map(([file, entries]) => (
          <div key={file} className="mb-2">
            <div className="px-2 py-1 text-white/70 font-medium flex items-center gap-1.5 bg-white/[0.02] rounded">
              <span>📄</span>
              <span className="font-mono">{file}</span>
              <span className="text-white/30 text-[11px] font-mono">({entries.length})</span>
            </div>
            {entries.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  if (p.file) {
                    addOpenFile(p.file);
                    setActivePath(p.file);
                    if (p.line) setTargetJump({ path: p.file, line: p.line });
                  }
                }}
                className="flex items-start gap-2 px-6 py-1 hover:bg-white/5 cursor-pointer rounded transition-colors group"
              >
                {p.severity === 'error' && (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                )}
                {p.severity === 'warning' && (
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                )}
                {p.severity === 'info' && (
                  <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-white/80 flex-1 group-hover:text-white transition-colors">{p.message}</span>
                <span className="text-white/30 flex-shrink-0 font-mono text-[11px] group-hover:text-white/60">
                  [Ln {p.line}, Col {p.column ?? p.col ?? 1}] {p.source && `(${p.source})`}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Output Tab
// ---------------------------------------------------------------------
interface OutputViewProps {
  channels: OutputChannel[];
  activeChannelId: string;
  onSelectChannel: (id: string) => void;
}

function OutputView({ channels, activeChannelId, onSelectChannel }: OutputViewProps) {
  const channel = channels.find((c) => c.id === activeChannelId) || channels[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 bg-[#121212]">
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Channel:</span>
        <select
          value={channel?.id || ''}
          onChange={(e) => onSelectChannel(e.target.value)}
          className="bg-[#1e1e1e] border border-white/10 text-white text-xs rounded px-2 py-0.5 outline-none cursor-pointer hover:border-white/20"
        >
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-white/70 whitespace-pre-wrap leading-relaxed select-text">
        {channel && channel.lines.length > 0 ? (
          channel.lines.map((line, i) => (
            <div key={i} className="hover:bg-white/[0.02]">
              {line}
            </div>
          ))
        ) : (
          <span className="text-white/30 italic">No output for this channel.</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Debug Console Tab
// ---------------------------------------------------------------------
function DebugConsoleView() {
  const [lines, setLines] = useState<{ type: 'input' | 'output' | 'error'; text: string }[]>([]);
  const [input, setInput] = useState('');

  function evaluate(expr: string) {
    setLines((prev) => [...prev, { type: 'input', text: expr }]);
    try {
      const fn = new Function(`return (${expr})`);
      const result = fn();
      setLines((prev) => [...prev, { type: 'output', text: String(result) }]);
    } catch (err: any) {
      setLines((prev) => [...prev, { type: 'error', text: err?.message || String(err) }]);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a]">
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs select-text">
        {lines.length === 0 && (
          <div className="text-white/30 italic">
            Debug session inactive — expressions are evaluated in the client workspace environment.
          </div>
        )}
        {lines.map((l, i) => (
          <div
            key={i}
            className={`py-0.5 ${
              l.type === 'input'
                ? 'text-white/50'
                : l.type === 'error'
                  ? 'text-red-400'
                  : 'text-white/90'
            }`}
          >
            {l.type === 'input' ? '> ' : ''}
            {l.text}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-white/5 bg-[#121212]">
        <span className="text-white/50 text-xs font-mono">&gt;</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              evaluate(input.trim());
              setInput('');
            }
          }}
          placeholder="Evaluate expression..."
          className="flex-1 bg-transparent text-white/90 outline-none text-xs font-mono placeholder-white/20"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Ports Tab
// ---------------------------------------------------------------------
interface PortsViewProps {
  ports: ForwardedPort[];
  isAddingPort: boolean;
  newPortNumber: string;
  newPortLabel: string;
  onPortNumberChange: (v: string) => void;
  onPortLabelChange: (v: string) => void;
  onForwardPort: () => void;
  onCancelAddPort: () => void;
}

function PortsView({
  ports,
  isAddingPort,
  newPortNumber,
  newPortLabel,
  onPortNumberChange,
  onPortLabelChange,
  onForwardPort,
  onCancelAddPort,
}: PortsViewProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a]">
      {isAddingPort && (
        <div className="px-3 py-2 border-b border-white/5 bg-[#141414] flex items-center gap-3 text-xs">
          <span className="text-white/60">Port:</span>
          <input
            type="number"
            autoFocus
            value={newPortNumber}
            onChange={(e) => onPortNumberChange(e.target.value)}
            placeholder="e.g. 5173"
            className="bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-white text-xs w-24 outline-none font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onForwardPort();
              if (e.key === 'Escape') onCancelAddPort();
            }}
          />
          <span className="text-white/60">Label:</span>
          <input
            type="text"
            value={newPortLabel}
            onChange={(e) => onPortLabelChange(e.target.value)}
            placeholder="Optional name"
            className="bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-white text-xs w-36 outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onForwardPort();
              if (e.key === 'Escape') onCancelAddPort();
            }}
          />
          <button
            onClick={onForwardPort}
            className="bg-[#0078d4] text-white px-2.5 py-1 rounded text-xs hover:bg-[#006cbd] transition"
          >
            Forward Port
          </button>
          <button
            onClick={onCancelAddPort}
            className="text-white/50 hover:text-white px-2 py-1 text-xs transition"
          >
            Cancel
          </button>
        </div>
      )}

      {ports.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-xs gap-2 select-none">
          <Globe className="w-5 h-5 text-white/20" />
          <span>No forwarded ports</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto text-xs">
          <div className="grid grid-cols-[90px_1fr_100px_1fr] gap-2 px-3 py-1.5 text-white/40 border-b border-white/5 font-medium select-none bg-[#121212]">
            <span>Port</span>
            <span>Label</span>
            <span>Visibility</span>
            <span>Local Address</span>
          </div>
          {ports.map((p) => (
            <div
              key={p.port}
              className="grid grid-cols-[90px_1fr_100px_1fr] gap-2 px-3 py-1.5 hover:bg-white/5 items-center transition-colors border-b border-white/[0.02]"
            >
              <span className="text-white/80 font-mono">{p.port}</span>
              <span className="text-white/60 truncate">{p.label ?? p.process ?? '—'}</span>
              <span
                className={
                  p.visibility === 'public'
                    ? 'text-emerald-400 font-mono text-[11px]'
                    : 'text-white/50 font-mono text-[11px]'
                }
              >
                {p.visibility}
              </span>
              <a
                href={p.localUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#3b82f6] hover:underline truncate font-mono"
              >
                {p.localUrl}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BottomPanel;
