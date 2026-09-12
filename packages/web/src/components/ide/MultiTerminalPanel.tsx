import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal as TerminalIcon,
  Trash2,
  Plus,
  SplitSquareHorizontal,
  ChevronDown,
  Maximize2,
  Minimize2,
  X,
  Search,
  Copy,
  Clipboard,
  CheckSquare,
} from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import type { ChatMessage } from '../../types/chat';
import { getSocket } from '../../hooks/useChatSocket';

export interface TerminalSessionMeta {
  id: string;
  name: string;
  shellType: 'bash' | 'zsh' | 'powershell' | 'node';
}

interface TerminalSession extends TerminalSessionMeta {
  history: string[];
  historyIndex: number;
}

const isWindowsPlatform = typeof window !== 'undefined' && (/win/i.test(navigator.userAgent || '') || /win/i.test(navigator.platform || ''));
const DEFAULT_SHELL: TerminalSessionMeta['shellType'] = isWindowsPlatform ? 'powershell' : 'bash';

const SHELL_TYPES: { id: TerminalSessionMeta['shellType']; label: string }[] = isWindowsPlatform
  ? [
      { id: 'powershell', label: 'PowerShell' },
      { id: 'bash', label: 'Git Bash / Bash' },
      { id: 'node', label: 'Node.js' },
    ]
  : [
      { id: 'bash', label: 'bash' },
      { id: 'zsh', label: 'zsh' },
      { id: 'powershell', label: 'PowerShell' },
      { id: 'node', label: 'Node.js' },
    ];

export interface MultiTerminalPanelHandle {
  newTerminal: (shellType?: TerminalSessionMeta['shellType']) => void;
  splitTerminal: () => void;
  killActiveTerminal: () => void;
  clearActiveTerminal: () => void;
  scrollActiveTerminal: (direction: 'prev' | 'next') => void;
  runInActiveTerminal: (cmd: string) => void;
  getRecentDirectories: () => string[];
  getRecentCommands: () => string[];
  setActiveTerminalId: (id: string) => void;
  killTerminalById: (id: string) => void;
}

export interface MultiTerminalPanelProps {
  messages: ChatMessage[];
  onCommand?: (cmd: string) => void;
  onInterrupt?: () => void;
  hideOwnHeader?: boolean;
  onSessionsChange?: (sessions: TerminalSessionMeta[], activeId: string) => void;
}

const COMMON_COMMANDS = [
  'npm run dev',
  'npm run build',
  'npm test',
  'npm install',
  'npm start',
  'git status',
  'git add .',
  'git commit -m ""',
  'git push',
  'git pull',
  'git branch',
  'git checkout',
  'node',
  'python',
  'bash',
  'clear',
  'cd',
  'ls',
  'mkdir',
  'rm -rf',
  'cat',
  'pwd',
  'touch',
];

export const MultiTerminalPanel = React.forwardRef<MultiTerminalPanelHandle, MultiTerminalPanelProps>(
  function MultiTerminalPanel(
    { messages, onCommand, onInterrupt, hideOwnHeader, onSessionsChange },
    ref
  ) {
    const [sessions, setSessions] = useState<TerminalSession[]>(() => {
      const initialId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'term-1';
      return [{ id: initialId, name: DEFAULT_SHELL === 'powershell' ? 'PowerShell' : 'bash', shellType: DEFAULT_SHELL, history: [], historyIndex: -1 }];
    });
    const [activeId, setActiveId] = useState(sessions[0]?.id || 'term-1');
    const recentDirectoriesRef = useRef<string[]>([]);

    const onSessionsChangeRef = useRef(onSessionsChange);
    useEffect(() => {
      onSessionsChangeRef.current = onSessionsChange;
    });
    const lastEmittedRef = useRef<string>('');

    useEffect(() => {
      const payload = JSON.stringify({
        s: sessions.map(({ id, name, shellType }) => ({ id, name, shellType })),
        a: activeId,
      });
      if (payload !== lastEmittedRef.current) {
        lastEmittedRef.current = payload;
        onSessionsChangeRef.current?.(
          sessions.map(({ id, name, shellType }) => ({ id, name, shellType })),
          activeId
        );
      }
    }, [sessions, activeId]);

    const [splitIds, setSplitIds] = useState<string[]>([]);
    const [splitRatio, setSplitRatio] = useState<number>(50); // percentage for split terminals
    const [isMaximized, setIsMaximized] = useState(false);
    const [shellMenuOpen, setShellMenuOpen] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0];
    const visibleIds = [activeId, ...splitIds].filter((id, i, arr) => arr.indexOf(id) === i);

    // Tab management
    function newTerminal(shellType: TerminalSessionMeta['shellType'] = DEFAULT_SHELL) {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `term-${Date.now()}`;
      const defaultName = shellType === 'powershell' ? 'PowerShell' : shellType;
      const existingOfType = sessions.filter((s) => s.shellType === shellType).length;
      const name = existingOfType === 0 ? defaultName : `${defaultName} (${existingOfType + 1})`;
      setSessions((prev) => [...prev, { id, name, shellType, history: [], historyIndex: -1 }]);
      setActiveId(id);
      setShellMenuOpen(false);
    }

    function killTerminal(id: string) {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (next.length === 0) {
          const freshId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `term-${Date.now()}`;
          setActiveId(freshId);
          return [{ id: freshId, name: DEFAULT_SHELL === 'powershell' ? 'PowerShell' : 'bash', shellType: DEFAULT_SHELL, history: [], historyIndex: -1 }];
        }
        if (activeId === id) setActiveId(next[0].id);
        return next;
      });
      setSplitIds((prev) => prev.filter((sid) => sid !== id));
    }

    function renameTerminal(id: string, newName: string) {
      if (!newName.trim()) return;
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name: newName.trim() } : s)));
    }

    function toggleSplit(id: string) {
      setSplitIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    function pushHistory(sessionId: string, cmd: string) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, history: [...s.history, cmd], historyIndex: -1 } : s
        )
      );
      const cdMatch = cmd.match(/^cd\s+(.+)/);
      if (cdMatch) {
        const dir = cdMatch[1].trim();
        recentDirectoriesRef.current = [dir, ...recentDirectoriesRef.current.filter((d) => d !== dir)].slice(0, 10);
      }
    }

    // Split terminal resize handler
    const handleSplitResize = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      const container = (e.target as HTMLElement).parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const onMouseMove = (ev: MouseEvent) => {
        const offsetX = ev.clientX - rect.left;
        const pct = Math.max(20, Math.min(80, (offsetX / rect.width) * 100));
        setSplitRatio(pct);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }, []);

    // Expose imperative controls for BottomPanel's toolbar/menus
    React.useImperativeHandle(ref, () => ({
      newTerminal: (shellType) => newTerminal(shellType),
      splitTerminal: () => {
        const other = sessions.find((s) => s.id !== activeId);
        if (other) toggleSplit(other.id);
        else newTerminal(activeSession?.shellType ?? 'bash');
      },
      killActiveTerminal: () => killTerminal(activeId),
      killTerminalById: (id: string) => killTerminal(id),
      setActiveTerminalId: (id: string) => setActiveId(id),
      clearActiveTerminal: () => {
        document.dispatchEvent(new CustomEvent('terminal:clear', { detail: activeId }));
      },
      scrollActiveTerminal: (direction) => {
        document.dispatchEvent(
          new CustomEvent('terminal:scroll-command', { detail: { sessionId: activeId, direction } })
        );
      },
      runInActiveTerminal: (cmd) => {
        pushHistory(activeId, cmd);
        getSocket().emit('terminal:input', { id: activeId, data: cmd.endsWith('\n') ? cmd : cmd + '\r' });
        onCommand?.(cmd);
      },
      getRecentDirectories: () => recentDirectoriesRef.current,
      getRecentCommands: () => activeSession?.history.slice().reverse() ?? [],
    }));

    return (
      <motion.div
        className={`flex flex-col flex-shrink-0 h-full w-full select-none ${
          hideOwnHeader ? '' : 'border-t border-white/5 bg-[#0e0e0e]'
        } ${!hideOwnHeader && isMaximized ? 'h-[calc(100vh-120px)]' : !hideOwnHeader ? 'h-52' : ''}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Top bar (if rendered standalone) */}
        {!hideOwnHeader && (
          <div className="flex items-center justify-between border-b border-white/5 bg-[#121212] pr-2">
            <div className="flex items-center overflow-x-auto no-scrollbar">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  onDoubleClick={() => {
                    setRenamingId(s.id);
                    setRenameValue(s.name);
                  }}
                  className={`group flex items-center gap-2 px-3 h-8 text-xs cursor-pointer whitespace-nowrap border-r border-[#252525] transition-colors ${
                    s.id === activeId
                      ? 'bg-[#1e1e1e] text-white border-t-2 border-[#0078d4]'
                      : 'text-white/50 hover:bg-white/5 border-t-2 border-transparent'
                  }`}
                >
                  <TerminalIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {renamingId === s.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => {
                        renameTerminal(s.id, renameValue);
                        setRenamingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameTerminal(s.id, renameValue);
                          setRenamingId(null);
                        }
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent border-b border-white/30 outline-none w-20 text-white"
                    />
                  ) : (
                    <span>{s.name}</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      killTerminal(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition ml-1"
                    title="Kill Terminal"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="relative">
                <button
                  onClick={() => setShellMenuOpen((v) => !v)}
                  className="flex items-center gap-0.5 text-white/50 hover:text-white transition p-1"
                  title="New Terminal (choose shell)"
                >
                  <Plus
                    className="w-3.5 h-3.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      newTerminal();
                    }}
                  />
                  <ChevronDown className="w-3 h-3" />
                </button>
                {shellMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl py-1 z-50 text-xs">
                    {SHELL_TYPES.map((shell) => (
                      <button
                        key={shell.id}
                        onClick={() => newTerminal(shell.id)}
                        className="w-full text-left px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
                      >
                        {shell.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() =>
                  toggleSplit(
                    activeId === visibleIds[0]
                      ? sessions.find((s) => s.id !== activeId)?.id ?? activeId
                      : activeId
                  )
                }
                className="text-white/50 hover:text-white transition p-1"
                title="Split Terminal"
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMaximized((v) => !v)}
                className="text-white/50 hover:text-white transition p-1"
                title={isMaximized ? 'Restore Panel Size' : 'Maximize Panel'}
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => killTerminal(activeId)}
                className="text-white/50 hover:text-white transition p-1"
                title="Kill Active Terminal"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Terminal instances with Split Resizer */}
        <div className="flex-1 flex min-h-0 w-full overflow-hidden relative">
          {visibleIds.map((id, index) => {
            const session = sessions.find((s) => s.id === id);
            if (!session) return null;
            const isSplit = visibleIds.length > 1;
            const widthStyle = isSplit
              ? { width: index === 0 ? `${splitRatio}%` : `${100 - splitRatio}%` }
              : { width: '100%' };

            return (
              <React.Fragment key={id}>
                {index > 0 && (
                  <div
                    onMouseDown={handleSplitResize}
                    className="w-1 bg-[#1e1e1e] hover:bg-[#0078d4] active:bg-[#0078d4] cursor-ew-resize transition-colors z-10 flex-shrink-0"
                    title="Drag to resize split terminals"
                  />
                )}
                <div style={widthStyle} className="h-full flex flex-col min-w-0">
                  <TerminalInstance
                    session={session}
                    isActive={id === activeId}
                    messages={messages}
                    onFocus={() => setActiveId(id)}
                    onCommand={(cmd) => onCommand?.(cmd)}
                    onInterrupt={onInterrupt}
                    onPushHistory={(cmd) => pushHistory(id, cmd)}
                    onSplit={() => toggleSplit(id)}
                    onKill={() => killTerminal(id)}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </motion.div>
    );
  }
);

// ---------------------------------------------------------------------
// Single Terminal Instance with ANSI Readline & Context Menu
// ---------------------------------------------------------------------
interface TerminalInstanceProps {
  session: TerminalSession;
  isActive: boolean;
  messages: ChatMessage[];
  onFocus: () => void;
  onCommand: (cmd: string) => void;
  onInterrupt?: () => void;
  onPushHistory: (cmd: string) => void;
  onSplit?: () => void;
  onKill?: () => void;
}

const PROMPT = '\x1b[38;2;45;214;119m➜\x1b[0m \x1b[38;2;96;165;250mmcode\x1b[0m \x1b[90m$\x1b[0m ';

function TerminalInstance({
  session,
  isActive,
  messages,
  onFocus,
  onCommand,
  onInterrupt,
  onPushHistory,
  onSplit,
  onKill,
}: TerminalInstanceProps) {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Mount xterm & attach backend PTY session
  useEffect(() => {
    // Read terminal settings from localStorage or fallback defaults
    const fontSize = parseInt(localStorage.getItem('mcode.terminal.fontSize') || '13', 10);
    const fontFamily = localStorage.getItem('mcode.terminal.fontFamily') || 'monospace';
    const cursorStyle = (localStorage.getItem('mcode.terminal.cursorStyle') as any) || 'block';
    const cursorBlink = localStorage.getItem('mcode.terminal.cursorBlink') !== 'false';
    const scrollback = parseInt(localStorage.getItem('mcode.terminal.scrollback') || '5000', 10);

    const handleSettingsUpdate = () => {
      const fs = parseInt(localStorage.getItem('mcode.terminal.fontSize') || '13', 10);
      const ff = localStorage.getItem('mcode.terminal.fontFamily') || 'monospace';
      const cs = (localStorage.getItem('mcode.terminal.cursorStyle') as any) || 'block';
      const cb = localStorage.getItem('mcode.terminal.cursorBlink') !== 'false';
      const sb = parseInt(localStorage.getItem('mcode.terminal.scrollback') || '5000', 10);
      if (term) {
        term.options.fontSize = fs;
        term.options.fontFamily = ff;
        term.options.cursorStyle = cs;
        term.options.cursorBlink = cb;
        term.options.scrollback = sb;
        try { fitAddon.fit(); } catch {}
      }
    };
    window.addEventListener('mcode:terminal-settings-updated', handleSettingsUpdate);

    const term = new Terminal({
      theme: {
        background: '#0a0a0a',
        foreground: '#f4f4f5',
        cursor: '#f4f4f5',
        cursorAccent: '#0a0a0a',
        black: '#0a0a0a',
        red: '#f87171',
        green: '#10b981',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#2dd677',
        white: '#e5e5e5',
        brightBlack: '#27272a',
        brightRed: '#fb6b6b',
        brightGreen: '#2dd677',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#4feda8',
        brightWhite: '#f4f4f5',
      },
      fontSize,
      fontFamily,
      convertEol: true,
      cursorBlink,
      cursorStyle,
      disableStdin: false,
      scrollback,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon((_e, uri) => window.open(uri, '_blank', 'noopener'));

    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(webLinksAddon);

    if (terminalRef.current) term.open(terminalRef.current);
    try {
      fitAddon.fit();
    } catch {}

    xtermRef.current = term;
    searchAddonRef.current = searchAddon;

    const socket = getSocket();

    // Spawn PTY session on backend
    const spawnTerminal = () => {
      socket.emit('terminal:spawn', {
        id: session.id,
        shellType: session.shellType,
        cols: term.cols || 80,
        rows: term.rows || 24,
      });
    };

    spawnTerminal();
    socket.on('connect', spawnTerminal);

    // Stream output from backend PTY process directly to xterm
    const handleOutput = (payload: { id: string; data: string }) => {
      if (payload.id === session.id) {
        term.write(payload.data);
      }
    };
    socket.on('terminal:output', handleOutput);

    // Forward user keystrokes straight to PTY stdin
    const dataDisposable = term.onData((data) => {
      socket.emit('terminal:input', { id: session.id, data });
    });

    // Custom key event handler: Allow Ctrl+C copy if text is selected, Ctrl+F search
    term.attachCustomKeyEventHandler((e) => {
      if (e.type === 'keydown') {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          setSearchOpen(true);
          return false;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && term.hasSelection()) {
          return false; // let browser handle standard copy
        }
      }
      return true;
    });

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (term.cols && term.rows) {
          socket.emit('terminal:resize', { id: session.id, cols: term.cols, rows: term.rows });
        }
      } catch {}
    });
    if (terminalRef.current) resizeObserver.observe(terminalRef.current);

    const handleResize = () => {
      try {
        fitAddon.fit();
        if (term.cols && term.rows) {
          socket.emit('terminal:resize', { id: session.id, cols: term.cols, rows: term.rows });
        }
      } catch {}
    };
    window.addEventListener('resize', handleResize);

    term.onSelectionChange(() => {
      const sel = term.getSelection();
      if (sel) {
        const copyOnSelect = localStorage.getItem('mcode.terminal.copyOnSelection') === 'true';
        if (copyOnSelect) {
          navigator.clipboard.writeText(sel).catch(() => {});
        }
      }
    });

    const handleClear = (e: CustomEvent<string>) => {
      if (e.detail === session.id) {
        term.clear();
      }
    };
    document.addEventListener('terminal:clear', handleClear as EventListener);

    return () => {
      window.removeEventListener('mcode:terminal-settings-updated', handleSettingsUpdate);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      document.removeEventListener('terminal:clear', handleClear as EventListener);
      socket.off('connect', spawnTerminal);
      socket.off('terminal:output', handleOutput);
      socket.emit('terminal:kill', { id: session.id });
      dataDisposable.dispose();
      term.dispose();
    };
  }, [session.id, session.shellType]);

  // Auto-focus terminal when it becomes active
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        xtermRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Keyboard Shortcuts (Ctrl+F search, Ctrl+V paste)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isActive) return;

      const activeEl = document.activeElement;
      if (activeEl?.tagName === 'INPUT') return;

      // Ctrl+F search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);

      // Ctrl+V paste into PTY
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        navigator.clipboard.readText().then((clip) => {
          if (clip) {
            getSocket().emit('terminal:input', { id: session.id, data: clip });
          }
        });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive, session.id]);

  useEffect(() => {
    if (searchQuery) searchAddonRef.current?.findNext(searchQuery);
  }, [searchQuery]);

  // Context Menu Actions
  const handleCopySelection = () => {
    const sel = xtermRef.current?.getSelection();
    if (sel) navigator.clipboard.writeText(sel);
    setContextMenu(null);
  };

  const handlePasteClipboard = () => {
    navigator.clipboard.readText().then((clip) => {
      if (clip) {
        getSocket().emit('terminal:input', { id: session.id, data: clip });
      }
    });
    setContextMenu(null);
  };

  const handleSelectAll = () => {
    xtermRef.current?.selectAll();
    setContextMenu(null);
  };

  const handleClearContext = () => {
    xtermRef.current?.clear();
    setContextMenu(null);
  };

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 h-full relative ${
        isActive ? 'bg-[#0a0a0a]' : 'opacity-90 bg-[#0c0c0c]'
      }`}
      onClick={() => {
        onFocus();
        xtermRef.current?.focus();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          const filePaths = files.map((f) => (f as any).path || f.name).join(' ');
          getSocket().emit('terminal:input', { id: session.id, data: filePaths });
        } else {
          const text = e.dataTransfer.getData('text/plain');
          if (text) {
            getSocket().emit('terminal:input', { id: session.id, data: text });
          }
        }
      }}
    >
      {/* In-terminal search bar (Ctrl+F) */}
      <AnimatePresence>
        {searchOpen && isActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl px-2 py-1"
          >
            <Search className="w-3.5 h-3.5 text-white/40" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') searchAddonRef.current?.findNext(searchQuery);
                if (e.key === 'Escape') setSearchOpen(false);
              }}
              placeholder="Find"
              className="bg-transparent outline-none text-xs text-white w-28"
            />
            <button
              onClick={() => searchAddonRef.current?.findPrevious(searchQuery)}
              className="text-white/40 hover:text-white text-xs px-1"
            >
              ↑
            </button>
            <button
              onClick={() => searchAddonRef.current?.findNext(searchQuery)}
              className="text-white/40 hover:text-white text-xs px-1"
            >
              ↓
            </button>
            <button
              onClick={() => setSearchOpen(false)}
              className="text-white/40 hover:text-white px-1"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="flex-1 overflow-hidden p-2 relative h-full cursor-text"
        onClick={() => {
          xtermRef.current?.focus();
        }}
      >
        <div
          className="w-full h-full cursor-text"
          ref={terminalRef}
          onClick={() => {
            xtermRef.current?.focus();
          }}
        />
      </div>

      {/* VS Code Right-Click Terminal Context Menu */}
      {contextMenu && (
        <TerminalContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCopy={handleCopySelection}
          onPaste={handlePasteClipboard}
          onSelectAll={handleSelectAll}
          onClear={handleClearContext}
          onSplit={() => {
            onSplit?.();
            setContextMenu(null);
          }}
          onKill={() => {
            onKill?.();
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Right-Click Terminal Context Menu (VS Code)
// ---------------------------------------------------------------------
interface TerminalContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onSplit: () => void;
  onKill: () => void;
}

function TerminalContextMenu({
  x,
  y,
  onClose,
  onCopy,
  onPaste,
  onSelectAll,
  onClear,
  onSplit,
  onKill,
}: TerminalContextMenuProps) {
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

  // Constrain position to screen bounds
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 230);

  return (
    <div
      ref={menuRef}
      style={{ left: adjustedX, top: adjustedY }}
      className="fixed z-50 w-48 bg-[#1e1e1e] border border-white/10 rounded-md shadow-2xl py-1 text-xs text-white"
    >
      <button
        onClick={onCopy}
        className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <Copy className="w-3.5 h-3.5 text-white/50" />
          Copy
        </span>
        <span className="text-[10px] text-white/40 font-mono">Ctrl+C</span>
      </button>

      <button
        onClick={onPaste}
        className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <Clipboard className="w-3.5 h-3.5 text-white/50" />
          Paste
        </span>
        <span className="text-[10px] text-white/40 font-mono">Ctrl+V</span>
      </button>

      <button
        onClick={onSelectAll}
        className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 text-white/50" />
          Select All
        </span>
        <span className="text-[10px] text-white/40 font-mono">Ctrl+A</span>
      </button>

      <button
        onClick={onClear}
        className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5 text-white/50" />
          Clear
        </span>
        <span className="text-[10px] text-white/40 font-mono">Ctrl+K</span>
      </button>

      <div className="my-1 border-t border-white/10" />

      <button
        onClick={onSplit}
        className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-white/80 hover:text-white flex items-center gap-2"
      >
        <SplitSquareHorizontal className="w-3.5 h-3.5 text-white/50" />
        <span>Split Terminal</span>
      </button>

      <button
        onClick={onKill}
        className="w-full text-left px-3 py-1.5 hover:bg-red-500/10 text-red-400 flex items-center gap-2"
      >
        <X className="w-3.5 h-3.5" />
        <span>Kill Terminal</span>
      </button>
    </div>
  );
}

export default MultiTerminalPanel;
