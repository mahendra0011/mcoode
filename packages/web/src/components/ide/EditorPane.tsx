import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileType2,
  FileCode,
  FileJson,
  File as FileIcon,
  Play,
  ChevronDown,
  SplitSquareHorizontal,
  MoreHorizontal,
  Terminal,
  Cpu,
  Package,
  Check,
  Globe,
  ExternalLink,
} from 'lucide-react';
import api from '../../lib/axios';
import editorApi from '../../lib/extensions/editorApi';
import { useIDEStore } from '../../store/ideStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getSocket } from '../../hooks/useChatSocket';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@radix-ui/react-context-menu';
import { WelcomeTab } from './menu/WelcomeTab';
import { EditorContextMenu } from './EditorContextMenu';
import { toast } from 'sonner';

const getFileIcon = (name: string) => {
  if (name.endsWith('.jsx') || name.endsWith('.tsx')) return <FileType2 className="w-4 h-4 text-cyan-400" />;
  if (name.endsWith('.js') || name.endsWith('.ts')) return <FileCode className="w-4 h-4 text-blue-400" />;
  if (name.endsWith('.json')) return <FileJson className="w-4 h-4 text-yellow-400" />;
  if (name.endsWith('.html')) return <FileCode className="w-4 h-4 text-orange-400" />;
  return <FileIcon className="w-4 h-4 text-white/50" />;
};

const getLanguage = (path: string) => {
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.md')) return 'markdown';
  return 'plaintext';
};

export interface EditorPaneProps {
  workspaceId: string;
  workspaces?: any[];
  onSelectWorkspace?: (id: string) => void;
  onOpenFolder?: () => void;
  onCloneRepo?: () => void;
}

export function EditorPane({
  workspaceId,
  workspaces,
  onSelectWorkspace,
  onOpenFolder,
  onCloneRepo,
}: EditorPaneProps) {
  const openFiles = useIDEStore((s) => s.openFiles);
  const activePath = useIDEStore((s) => s.activePath);
  const setActivePath = useIDEStore((s) => s.setActivePath);
  const closeFile = useIDEStore((s) => s.closeFile);
  const isWelcomeOpen = useIDEStore((s) => s.isWelcomeOpen);
  const setWelcomeOpen = useIDEStore((s) => s.setWelcomeOpen);
  const wordWrap = useIDEStore((s) => s.wordWrap);
  const columnSelection = useIDEStore((s) => s.columnSelection);
  const autoSaveEnabled = useIDEStore((s) => s.autoSaveEnabled);
  const editorLayout = useIDEStore((s) => s.editorLayout);
  const setEditorLayout = useIDEStore((s) => s.setEditorLayout);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    if (moreMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreMenuOpen]);

  const editorSettings = useSettingsStore((s) => s.editor);
  const advancedEditor = useSettingsStore((s) => s.advancedEditor);
  const colorTheme = useSettingsStore((s) => s.appearance.colorTheme);
  const autoSave = editorSettings.autoSave;
  const autoSaveDelay = advancedEditor.autoSaveDelay;
  const formatOnSave = editorSettings.formatOnSave;

  const monacoOptions = useMemo(() => {
    return useSettingsStore.getState().getMonacoOptions();
  }, [editorSettings, advancedEditor]);

  const [fileContents, setFileContents] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(new Set<string>());
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number } | null>(null);
  const [editorTheme, setEditorTheme] = useState(() => {
    if (colorTheme === 'mcode-light' || colorTheme === 'github-light') return 'vs';
    if (colorTheme === 'one-dark') return 'one-dark-pro';
    return editorApi.getTheme() || 'vs-dark';
  });

  useEffect(() => {
    let theme = 'vs-dark';
    if (colorTheme === 'mcode-light' || colorTheme === 'github-light') {
      theme = 'vs';
    } else if (colorTheme === 'one-dark') {
      theme = 'one-dark-pro';
    }
    setEditorTheme(theme);
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme);
    }
  }, [colorTheme]);

  useEffect(() => {
    const unsub = editorApi.subscribeTheme((newTheme) => {
      setEditorTheme(newTheme);
      if (monacoRef.current) {
        monacoRef.current.editor.setTheme(newTheme);
      }
    });
    return unsub;
  }, []);

  const targetJump = useIDEStore((s) => s.targetJump);
  const setTargetJump = useIDEStore((s) => s.setTargetJump);
  const setFileContent = useIDEStore((s) => s.setFileContent);
  const setSavedContent = useIDEStore((s) => s.setSavedContent);
  const breakpoints = useIDEStore((s) => s.breakpoints);
  const recordTimeline = useIDEStore((s) => s.recordTimeline);
  const expandPathAncestors = useIDEStore((s) => s.expandPathAncestors);
  const setActiveActivityBar = useIDEStore((s) => s.setActiveActivityBar);

  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);
  const decorationsRef = React.useRef<any[]>([]);

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editorApi.attachEditor(editor, monaco);
    useIDEStore.getState().setActiveEditor(editor, monaco);

    // Custom right-click context menu (matching Screenshot 3)
    editor.onContextMenu((e: any) => {
      e.event?.preventDefault?.();
      e.event?.stopPropagation?.();
      const mouseX = e.event?.posx || e.event?.browserEvent?.clientX || 0;
      const mouseY = e.event?.posy || e.event?.browserEvent?.clientY || 0;
      setContextMenu({
        visible: true,
        x: mouseX,
        y: mouseY,
      });
    });

    // Track cursor position for navigation history
    editor.onDidChangeCursorPosition((e: any) => {
      const p = useIDEStore.getState().activePath;
      if (p && e.position) {
        useIDEStore.getState().recordNavPoint({
          path: p,
          line: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });

    // Gutter click to toggle breakpoint
    editor.onMouseDown((e: any) => {
      if (!useIDEStore.getState().activePath) return;
      const t = e.target?.type;
      if (t === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN || t === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
        const line = e.target?.position?.lineNumber;
        const p = useIDEStore.getState().activePath;
        if (line && p) {
          useIDEStore.getState().toggleBreakpoint(p, line);
        }
      }
    });

    monaco.editor.defineTheme('one-dark-pro', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c678dd' },
        { token: 'string', foreground: '98c379' },
        { token: 'number', foreground: 'd19a66' },
        { token: 'type', foreground: 'e5c07b' },
      ],
      colors: {
        'editor.background': '#282c34',
        'editor.foreground': '#abb2bf',
        'editorCursor.foreground': '#528bff',
        'editor.lineHighlightBackground': '#2c313a',
        'editorLineNumber.foreground': '#4b5263',
        'editor.selectionBackground': '#3e4451',
      },
    });

    if (editorApi.getTheme() === 'one-dark-pro') {
      monaco.editor.setTheme('one-dark-pro');
    }

    const formatProvider = {
      async provideDocumentFormattingEdits(model: any) {
        const text = model.getValue();
        const formatted = await editorApi.formatCode(text);
        if (formatted === text) return [];
        return [{
          range: model.getFullModelRange(),
          text: formatted,
        }];
      },
    };

    const formatLanguages = ['javascript', 'typescript', 'json', 'html', 'css', 'scss', 'markdown', 'sql', 'python', 'cpp', 'c', 'yaml', 'xml'];
    formatLanguages.forEach((lang) => {
      try {
        monaco.languages.registerDocumentFormattingEditProvider(lang, formatProvider);
      } catch (e) {
        // provider already registered or language not loaded yet
      }
    });
  }, []);

  // Update editor options reactively when monacoOptions or columnSelection change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        ...monacoOptions,
        columnSelection,
      });
    }
  }, [monacoOptions, columnSelection]);

  // Update glyph margin decorations whenever breakpoints or activePath change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !activePath) return;
    const currentBps = breakpoints.filter((b) => b.path === activePath);
    const newDecorations = currentBps.map((b) => ({
      range: new monacoRef.current.Range(b.line, 1, b.line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: b.enabled ? 'monaco-breakpoint-glyph' : 'monaco-breakpoint-glyph-disabled',
        glyphMarginHoverMessage: { value: `Breakpoint: line ${b.line} (${b.enabled ? 'enabled' : 'disabled'})` },
      },
    }));
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
  }, [breakpoints, activePath]);

  // Jump to line when triggered from Search or Testing panels or Go To Line modal
  useEffect(() => {
    if (targetJump && editorRef.current) {
      if (activePath !== targetJump.path) {
        setActivePath(targetJump.path);
      } else {
        editorRef.current.revealLineInCenter(targetJump.line);
        editorRef.current.setPosition({ lineNumber: targetJump.line, column: targetJump.column || 1 });
        editorRef.current.focus();
        setTargetJump(null);
      }
    }
  }, [targetJump, activePath, setActivePath, setTargetJump]);

  // Fetch content when a new file is opened
  useEffect(() => {
    if (!activePath) return;
    if (fileContents[activePath] !== undefined) return; // already loaded in local state

    // Check if in-memory cache has it (e.g. newly created Untitled file)
    const cached = useIDEStore.getState().fileContentsCache[activePath];
    if (cached !== undefined) {
      setFileContents(prev => ({ ...prev, [activePath]: cached }));
      return;
    }

    if (!workspaceId) return;

    setLoading(true);
    api.get(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(activePath)}`)
      .then(res => {
        const text = typeof res.data === 'string' ? res.data : (res.data?.content ?? '');
        setFileContents(prev => ({ ...prev, [activePath]: text }));
        setFileContent(activePath, text);
        setSavedContent(activePath, text);
        recordTimeline(activePath, 'Opened', text);
      })
      .catch(err => {
        console.error('Failed to load file content:', err);
        setFileContents(prev => ({ ...prev, [activePath]: '' }));
      })
      .finally(() => setLoading(false));
  }, [activePath, workspaceId, fileContents, setFileContent, setSavedContent, recordTimeline]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activePath) return;
    const str = value || '';
    setFileContents(prev => ({ ...prev, [activePath]: str }));
    setFileContent(activePath, str);
    setDirty(prev => new Set(prev).add(activePath));
    try {
      localStorage.setItem(`mcode_draft_${activePath}`, str);
    } catch {}
  }, [activePath, setFileContent]);

  // Handle Save (Cmd+S)
  const handleSave = useCallback(() => {
    if (!activePath) return;
    if (formatOnSave && editorRef.current) {
      try {
        editorRef.current.getAction('editor.action.formatDocument')?.run();
      } catch {}
    }
    const content = fileContents[activePath] ?? useIDEStore.getState().fileContentsCache[activePath] ?? '';

    if (workspaceId) {
      api.put(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(activePath)}`, content)
        .then(res => {
          if (res.status >= 400) throw new Error('Save failed');
          setDirty(prev => { const next = new Set(prev); next.delete(activePath); return next; });
          setSavedContent(activePath, content);
          recordTimeline(activePath, 'Saved', content);
          try { localStorage.removeItem(`mcode_draft_${activePath}`); } catch {}
        })
        .catch(err => console.error(err));
    } else {
      setDirty(prev => { const next = new Set(prev); next.delete(activePath); return next; });
      setSavedContent(activePath, content);
      recordTimeline(activePath, 'Saved', content);
      try { localStorage.removeItem(`mcode_draft_${activePath}`); } catch {}
    }
  }, [workspaceId, activePath, fileContents, formatOnSave, recordTimeline, setSavedContent]);

  // Auto-Save interval & progress persistence
  useEffect(() => {
    const isAutoSave = autoSave || autoSaveEnabled;
    if (!isAutoSave || dirty.size === 0) return;
    const interval = setInterval(() => {
      dirty.forEach((path) => {
        const content = fileContents[path] ?? useIDEStore.getState().fileContentsCache[path] ?? '';
        if (workspaceId) {
          api.put(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(path)}`, content)
            .then(() => {
              setDirty(prev => { const next = new Set(prev); next.delete(path); return next; });
              setSavedContent(path, content);
              try { localStorage.removeItem(`mcode_draft_${path}`); } catch {}
            })
            .catch(() => {});
        } else {
          setDirty(prev => { const next = new Set(prev); next.delete(path); return next; });
          setSavedContent(path, content);
          try { localStorage.removeItem(`mcode_draft_${path}`); } catch {}
        }
      });
    }, autoSaveDelay || 1000);
    return () => clearInterval(interval);
  }, [autoSave, autoSaveEnabled, autoSaveDelay, dirty, fileContents, workspaceId, setSavedContent]);

  // Flush unsaved draft progress on window beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dirty.size === 0) return;
      dirty.forEach((path) => {
        const content = fileContents[path] ?? useIDEStore.getState().fileContentsCache[path] ?? '';
        try { localStorage.setItem(`mcode_draft_${path}`, content); } catch {}
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty, fileContents]);

  // Listen for file:changed events from the agent
  useEffect(() => {
    const handleFileChanged = (e: Event) => {
      const changedPath = (e as CustomEvent<{ path?: string }>).detail?.path;
      if (!changedPath || !openFiles.includes(changedPath)) return;
      if (dirty.has(changedPath)) {
        const reload = window.confirm(
          'This file was changed by the AI agent while you have unsaved edits. ' +
          'OK to reload the agent\'s version (your local changes will be lost), ' +
          'Cancel to keep your current edits.'
        );
        if (!reload) return;
      }
      setFileContents(prev => {
        const next = { ...prev };
        delete next[changedPath];
        return next;
      });
      setDirty(prev => { const d = new Set(prev); d.delete(changedPath); return d; });
    };
    document.addEventListener('file:changed', handleFileChanged);
    return () => document.removeEventListener('file:changed', handleFileChanged);
  }, [openFiles, dirty]);

  // Bind Cmd+S globally when Editor has focus
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown as EventListener);
    return () => window.removeEventListener('keydown', onKeyDown as EventListener);
  }, [handleSave]);

  const [runMenuOpen, setRunMenuOpen] = useState(false);
  const [runMode, setRunMode] = useState<'piston' | 'terminal' | 'docker'>('piston');
  const runMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (runMenuRef.current && !runMenuRef.current.contains(e.target as Node)) {
        setRunMenuOpen(false);
      }
    }
    if (runMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [runMenuOpen]);

  const handleRunCode = useCallback(
    (overrideMode?: 'piston' | 'terminal' | 'docker') => {
      const mode = overrideMode || runMode;
      setRunMenuOpen(false);

      if (!activePath) {
        toast.info('No active file is open to run.');
        return;
      }

      const editorValue = editorRef.current?.getValue();
      const currentCode = editorValue !== undefined ? editorValue : fileContents[activePath] || '';
      const filename = activePath.split('/').pop() || activePath;

      // Always open bottom panel
      useIDEStore.getState().setTerminalOpen(true);

      if (mode === 'docker') {
        useIDEStore.getState().setActivePanelTab('terminal');
        toast.info(`Running project in Docker container...`);
        const socket = getSocket();
        socket.emit('project:run');
        return;
      }

      if (mode === 'terminal') {
        useIDEStore.getState().setActivePanelTab('terminal');
        const ext = filename.split('.').pop()?.toLowerCase();
        let cmd = '';
        if (ext === 'js' || ext === 'mjs' || ext === 'cjs') cmd = `node "${filename}"`;
        else if (ext === 'ts') cmd = `npx ts-node "${filename}"`;
        else if (ext === 'py') cmd = `python "${filename}"`;
        else if (ext === 'sh') cmd = `bash "${filename}"`;
        else if (ext === 'go') cmd = `go run "${filename}"`;
        else if (ext === 'rs') cmd = `rustc "${filename}" && ./${filename.replace(/\.rs$/, '')}`;
        else if (ext === 'cpp' || ext === 'c') cmd = `g++ "${filename}" -o a.out && ./a.out`;
        else if (ext === 'java') cmd = `java "${filename}"`;
        else cmd = `./"${filename}"`;

        const socket = getSocket();
        socket.emit('terminal:input', { id: 'term-1', data: `${cmd}\r` });
        toast.success(`Running ${filename} in terminal`);
        return;
      }

      // Default: Piston single-file sandbox execution
      if (!currentCode.trim()) {
        toast.info('Active file is empty.');
        return;
      }

      useIDEStore.getState().setActivePanelTab('output');
      toast.info(`Running ${filename} via Piston sandbox...`);

      const socket = getSocket();
      socket.emit('code:run-file', {
        filename,
        code: currentCode,
        stdin: '',
      });
    },
    [activePath, fileContents, runMode]
  );

  // Bind Ctrl+Alt+N & F5 globally to run code
  useEffect(() => {
    const onRunKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleRunCode();
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleRunCode();
      }
    };
    window.addEventListener('keydown', onRunKeyDown as EventListener);
    return () => window.removeEventListener('keydown', onRunKeyDown as EventListener);
  }, [handleRunCode]);

  const showWelcomeTab = isWelcomeOpen;
  const isWelcomeActive = showWelcomeTab && (!activePath || !openFiles.includes(activePath));

  return (
    <motion.div
      className="flex-1 flex flex-col min-w-0 bg-[#181818] h-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Editor Header: Tabs on Left + Action Toolbar (Run Code, Split, More) on Right */}
      <div className="flex items-center justify-between border-b border-[#252525] bg-[#181818] flex-shrink-0 select-none h-9 relative">
        {/* Tabs on Left */}
        <motion.div
          className="flex items-center overflow-x-auto custom-scrollbar flex-1 h-full min-w-0"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Welcome Tab (Persistent in Tab Bar like VS Code desktop) */}
          {showWelcomeTab && (
            <div
              onClick={() => setActivePath(null)}
              className={`flex items-center gap-2 px-3.5 h-full text-xs cursor-pointer whitespace-nowrap font-normal border-r border-[#252525] transition-colors group ${
                isWelcomeActive
                  ? 'bg-[#1e1e1e] border-t-2 border-[#0078d4] text-white font-medium'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border-t-2 border-transparent'
              }`}
            >
              {/* Official VS Code Blue Ribbon Icon */}
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.27a.998.998 0 0 0-.005 1.458L4.35 12 .322 15.272a.998.998 0 0 0 .005 1.458l1.322 1.212a1 1 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zM18 17.807l-7.07-5.807L18 6.193v11.614z" fill="#0078D4"/>
              </svg>
              <span>Welcome</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setWelcomeOpen(false);
                  if (openFiles.length > 0 && (!activePath || !openFiles.includes(activePath))) {
                    setActivePath(openFiles[0]);
                  }
                }}
                className="text-white/40 hover:text-white cursor-pointer ml-1 text-sm leading-none px-1 py-0.5 rounded hover:bg-white/10 transition"
                title="Close Welcome"
              >
                ×
              </span>
            </div>
          )}

          {openFiles.map((path, i) => {
            const name = path.split('/').pop() || '';
            const isActive = !isWelcomeActive && activePath === path;
            const isDirty = dirty.has(path);
            return (
              <ContextMenu key={path}>
                <ContextMenuTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    transition={{ delay: i * 0.04 + 0.1, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    onClick={() => {
                      setActivePath(path);
                    }}
                    className={`flex items-center gap-2 px-3.5 h-full text-xs cursor-pointer whitespace-nowrap border-r border-[#252525] transition-colors ${
                      isActive
                        ? 'bg-[#1e1e1e] border-t-2 border-[#0078d4] font-medium text-white'
                        : 'text-white/50 hover:bg-white/5 border-t-2 border-transparent'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {getFileIcon(name)} {name}
                    {isDirty && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" title="Unsaved changes" />
                    )}
                    <motion.span
                      className="text-white/30 ml-2 hover:text-white cursor-pointer px-1 rounded hover:bg-white/10 text-sm leading-none"
                      whileHover={{ scale: 1.15 }}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (isDirty && !window.confirm('This file has unsaved changes. Close anyway?')) return;
                        closeFile(path);
                      }}
                    >
                      ×
                    </motion.span>
                  </motion.div>
                </ContextMenuTrigger>
                <ContextMenuContent className="min-w-[210px] bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl p-1 text-xs text-white/90 z-50 select-none animate-in fade-in-80 duration-100">
                  <ContextMenuItem
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                    onSelect={() => closeFile(path)}
                  >
                    <span>Close</span>
                    <span className="text-[10px] text-white/40 font-mono">Ctrl+W</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                    onSelect={() => {
                      openFiles.forEach((p) => {
                        if (p !== path) closeFile(p);
                      });
                    }}
                  >
                    <span>Close Others</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                    onSelect={() => {
                      const idx = openFiles.indexOf(path);
                      if (idx !== -1) {
                        openFiles.slice(idx + 1).forEach((p) => closeFile(p));
                      }
                    }}
                  >
                    <span>Close to the Right</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                    onSelect={() => {
                      openFiles.forEach((p) => {
                        if (!dirty.has(p)) closeFile(p);
                      });
                    }}
                  >
                    <span>Close Saved</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                    onSelect={() => {
                      openFiles.forEach((p) => closeFile(p));
                    }}
                  >
                    <span>Close All</span>
                    <span className="text-[10px] text-white/40 font-mono">Ctrl+K Ctrl+W</span>
                  </ContextMenuItem>

                  <ContextMenuSeparator className="h-px bg-white/10 my-1 -mx-1" />

                  <ContextMenuItem
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                    onSelect={() => {
                      setEditorLayout('split-right');
                      setActivePath(path);
                    }}
                  >
                    <span>Split Right</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                    onSelect={() => {
                      setEditorLayout('split-down');
                      setActivePath(path);
                    }}
                  >
                    <span>Split Down</span>
                  </ContextMenuItem>

                  <ContextMenuSeparator className="h-px bg-white/10 my-1 -mx-1" />

                  <ContextMenuItem
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                    onSelect={() => {
                      navigator.clipboard.writeText(path);
                      toast.success('Path copied to clipboard');
                    }}
                  >
                    <span>Copy Path</span>
                    <span className="text-[10px] text-white/40 font-mono">Shift+Alt+C</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                    onSelect={() => {
                      navigator.clipboard.writeText(name);
                      toast.success('File name copied to clipboard');
                    }}
                  >
                    <span>Copy Relative Path</span>
                  </ContextMenuItem>

                  <ContextMenuSeparator className="h-px bg-white/10 my-1 -mx-1" />

                  <ContextMenuItem
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer outline-none transition-colors"
                    onSelect={() => {
                      setActiveActivityBar('explorer');
                      expandPathAncestors(path);
                      setTimeout(() => {
                        const el = document.querySelector(`[data-tree-path="${CSS.escape(path)}"]`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.classList.add('ring-2', 'ring-cyan-500');
                          setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-500'), 2000);
                        }
                      }, 100);
                    }}
                  >
                    <span>Reveal in Side Bar</span>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </motion.div>

        {/* Right-Side Editor Action Icons (matching VS Code top-right editor header) */}
        {activePath && (
          <div className="flex items-center gap-1.5 px-2 h-full flex-shrink-0 bg-[#181818] border-l border-[#252525]/50 z-20" ref={runMenuRef}>
            {/* Run Button Group */}
            <div className="relative flex items-center bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition group">
              <button
                onClick={() => handleRunCode()}
                className="flex items-center gap-1 px-2 py-1 text-emerald-400 hover:text-emerald-300 transition text-xs font-medium"
                title={`Run Code (${runMode === 'piston' ? 'Piston Sandbox' : runMode === 'terminal' ? 'Terminal' : 'Docker'}) [Ctrl+Alt+N / F5]`}
              >
                <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span className="text-white/90 text-xs font-medium">Run</span>
              </button>
              <button
                onClick={() => setRunMenuOpen((v) => !v)}
                className="px-1 py-1 text-emerald-400/70 hover:text-emerald-300 border-l border-emerald-500/20 transition"
                title="Run Options..."
              >
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Dropdown Menu */}
              {runMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl py-1.5 z-50 text-xs text-white">
                  <div className="px-3 py-1 text-[10px] text-white/40 font-semibold uppercase tracking-wider">
                    Execution Mode
                  </div>

                  <button
                    onClick={() => {
                      setRunMode('piston');
                      handleRunCode('piston');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2.5 transition"
                  >
                    <Cpu className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white/90 flex items-center justify-between">
                        <span>Run File (Piston)</span>
                        {runMode === 'piston' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[11px] text-white/40 truncate">
                        Sandboxed multi-language execution (53+ langs)
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setRunMode('terminal');
                      handleRunCode('terminal');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2.5 transition"
                  >
                    <Terminal className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white/90 flex items-center justify-between">
                        <span>Run in Terminal</span>
                        {runMode === 'terminal' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <div className="text-[11px] text-white/40 truncate">
                        Direct execution in PowerShell / Bash
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setRunMode('docker');
                      handleRunCode('docker');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2.5 transition"
                  >
                    <Package className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white/90 flex items-center justify-between">
                        <span>Run Project (Docker)</span>
                        {runMode === 'docker' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <div className="text-[11px] text-white/40 truncate">
                        Full project container with port preview
                      </div>
                    </div>
                  </button>

                  <div className="h-[1px] bg-white/10 my-1" />

                  <button
                    onClick={() => {
                      setRunMenuOpen(false);
                      window.open('/preview', '_blank');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2.5 transition text-blue-400"
                  >
                    <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center justify-between">
                        <span>Open Web Preview</span>
                        <ExternalLink className="w-3 h-3 text-white/40" />
                      </div>
                      <div className="text-[11px] text-white/40 truncate">
                        Full-screen clean preview at /preview
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Web Preview Button */}
            <button
              onClick={() => window.open('/preview', '_blank')}
              className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-blue-400 transition"
              title="Open Web Preview Window (/preview)"
            >
              <Globe className="w-3.5 h-3.5" />
            </button>

            {/* Split Editor */}
            <button
              onClick={() => setEditorLayout(editorLayout === 'single' ? 'split-right' : 'single')}
              className={`p-1.5 rounded hover:bg-white/10 transition ${
                editorLayout !== 'single' ? 'text-[#0078d4]' : 'text-white/40 hover:text-white'
              }`}
              title="Split Editor Right"
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* More Actions */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setMoreMenuOpen((v) => !v)}
                className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer"
                title="More Actions..."
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-[#1e1e1e] border border-white/10 rounded-md shadow-2xl py-1 z-50 text-xs text-white/90">
                  <button
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/10 transition text-left cursor-pointer"
                    onClick={() => {
                      useSettingsStore.getState().updateEditorSetting('formatOnSave', !editorSettings.formatOnSave);
                    }}
                  >
                    <span>Format On Save</span>
                    {editorSettings.formatOnSave && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/10 transition text-left cursor-pointer"
                    onClick={() => {
                      useIDEStore.getState().toggleWordWrap();
                    }}
                  >
                    <span>Word Wrap</span>
                    {wordWrap && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/10 transition text-left cursor-pointer"
                    onClick={() => {
                      useSettingsStore.getState().updateEditorSetting('minimap', !editorSettings.minimap);
                    }}
                  >
                    <span>Minimap</span>
                    {editorSettings.minimap && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <div className="h-px bg-white/10 my-1" />
                  <button
                    className="w-full text-left px-3 py-1.5 hover:bg-white/10 transition cursor-pointer"
                    onClick={() => {
                      if (editorRef.current) {
                        editorRef.current.getAction('editor.action.formatDocument')?.run();
                      }
                      setMoreMenuOpen(false);
                    }}
                  >
                    Format Document Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Editor Body: Welcome Tab or Empty Canvas or Monaco Editor */}
      {isWelcomeActive ? (
        <WelcomeTab
          workspaces={workspaces}
          onSelectWorkspace={onSelectWorkspace}
          onOpenFile={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = (e: any) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const content = (reader.result as string) || '';
                useIDEStore.getState().setFileContent(file.name, content);
                useIDEStore.getState().addOpenFile(file.name);
                setActivePath(file.name);
                toast.success(`Opened ${file.name}`);
              };
              reader.readAsText(file);
            };
            input.click();
          }}
          onOpenFolder={onOpenFolder}
          onCloneRepo={onCloneRepo}
        />
      ) : openFiles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-[#181818]" />
      ) : (
        <div
          className={
            editorLayout === 'split-right'
              ? 'flex-1 flex flex-row h-full w-full relative'
              : editorLayout === 'split-down'
              ? 'flex-1 flex flex-col h-full w-full relative'
              : 'flex-1 relative h-full w-full'
          }
        >
          <div className={editorLayout !== 'single' ? 'flex-1 h-full w-full relative border-r border-[#252525]' : 'h-full w-full relative'}>
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0 flex items-center justify-center bg-[#181818]/50 z-10 text-white/50 text-xs"
                >
                  Loading...
                </motion.div>
              )}
            </AnimatePresence>
            {activePath && (
              <Editor
                height="100%"
                theme={editorTheme}
                onMount={handleEditorDidMount}
                path={activePath}
                language={getLanguage(activePath)}
                value={fileContents[activePath] || ''}
                onChange={handleEditorChange}
                options={{
                  ...monacoOptions,
                  contextmenu: false,
                  columnSelection,
                  padding: { top: 16 },
                }}
              />
            )}
            {contextMenu?.visible && (
              <EditorContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onClose={() => setContextMenu(null)}
                editor={editorRef.current}
                monaco={monacoRef.current}
              />
            )}
          </div>
          {editorLayout !== 'single' && (
            <div className="flex-1 h-full w-full relative bg-[#181818]">
              {(() => {
                const secondaryPath = openFiles.find((p) => p !== activePath) || activePath;
                if (!secondaryPath) return null;
                return (
                  <Editor
                    height="100%"
                    theme={editorTheme}
                    path={`secondary_${secondaryPath}`}
                    language={getLanguage(secondaryPath)}
                    value={fileContents[secondaryPath] || ''}
                    options={{
                      ...monacoOptions,
                      readOnly: false,
                      padding: { top: 16 },
                    }}
                  />
                );
              })()}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default EditorPane;
