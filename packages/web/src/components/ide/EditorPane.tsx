import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileType2, FileCode, FileJson, File as FileIcon } from 'lucide-react';
import api from '../../lib/axios';
import { useIDEStore } from '../../store/ideStore';
import editorApi from '../../lib/extensions/editorApi';
import { WelcomeTab } from './menu/WelcomeTab';

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
}

export function EditorPane({ workspaceId }: EditorPaneProps) {
  const openFiles = useIDEStore((s) => s.openFiles);
  const activePath = useIDEStore((s) => s.activePath);
  const setActivePath = useIDEStore((s) => s.setActivePath);
  const closeFile = useIDEStore((s) => s.closeFile);
  const isWelcomeOpen = useIDEStore((s) => s.isWelcomeOpen);
  const setWelcomeOpen = useIDEStore((s) => s.setWelcomeOpen);
  const wordWrap = useIDEStore((s) => s.wordWrap);
  const columnSelection = useIDEStore((s) => s.columnSelection);
  const autoSaveEnabled = useIDEStore((s) => s.autoSaveEnabled);

  const [fileContents, setFileContents] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(new Set<string>());
  const [editorTheme, setEditorTheme] = useState(editorApi.getTheme() || 'vs-dark');

  useEffect(() => {
    return editorApi.subscribeTheme((theme) => {
      setEditorTheme(theme === 'default-dark' ? 'vs-dark' : theme);
    });
  }, []);

  const targetJump = useIDEStore((s) => s.targetJump);
  const setTargetJump = useIDEStore((s) => s.setTargetJump);
  const setFileContent = useIDEStore((s) => s.setFileContent);
  const setSavedContent = useIDEStore((s) => s.setSavedContent);
  const breakpoints = useIDEStore((s) => s.breakpoints);
  const toggleBreakpoint = useIDEStore((s) => s.toggleBreakpoint);
  const recordTimeline = useIDEStore((s) => s.recordTimeline);

  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);
  const decorationsRef = React.useRef<any[]>([]);

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    useIDEStore.getState().setActiveEditor(editor, monaco);

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

    monaco.languages.registerDocumentFormattingEditProvider('javascript', formatProvider);
    monaco.languages.registerDocumentFormattingEditProvider('typescript', formatProvider);
    monaco.languages.registerDocumentFormattingEditProvider('json', formatProvider);
    monaco.languages.registerDocumentFormattingEditProvider('html', formatProvider);
  }, []);

  // Update editor options reactively when wordWrap or columnSelection change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        wordWrap: wordWrap ? 'on' : 'off',
        columnSelection,
      });
    }
  }, [wordWrap, columnSelection]);

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
    api.get(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(activePath)}`, { timeout: 5000 })
      .then(res => {
        if (res.data.content !== undefined) {
          setFileContents(prev => ({ ...prev, [activePath]: res.data.content }));
          setFileContent(activePath, res.data.content);
          setSavedContent(activePath, res.data.content);
        }
      })
      .catch(() => {
        // Fallback for new / offline file
        setFileContents(prev => ({ ...prev, [activePath]: '' }));
        setFileContent(activePath, '');
        setSavedContent(activePath, '');
      })
      .finally(() => setLoading(false));
  }, [workspaceId, activePath, fileContents, setFileContent, setSavedContent]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activePath) return;
    const str = value || '';
    setFileContents(prev => ({ ...prev, [activePath]: str }));
    setFileContent(activePath, str);
    setDirty(prev => new Set(prev).add(activePath));
  }, [activePath, setFileContent]);

  // Handle Save (Cmd+S)
  const handleSave = useCallback(() => {
    if (!activePath) return;
    const content = fileContents[activePath] || '';

    if (workspaceId) {
      api.put(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(activePath)}`, content)
        .then(res => {
          if (res.status >= 400) throw new Error('Save failed');
          setDirty(prev => { const next = new Set(prev); next.delete(activePath); return next; });
          setSavedContent(activePath, content);
          recordTimeline(activePath, 'Saved', content);
        })
        .catch(err => console.error(err));
    } else {
      setDirty(prev => { const next = new Set(prev); next.delete(activePath); return next; });
      setSavedContent(activePath, content);
      recordTimeline(activePath, 'Saved', content);
    }
  }, [workspaceId, activePath, fileContents, recordTimeline, setSavedContent]);

  // Auto-Save interval
  useEffect(() => {
    if (!autoSaveEnabled || dirty.size === 0) return;
    const interval = setInterval(() => {
      dirty.forEach((path) => {
        const content = fileContents[path] || '';
        if (workspaceId) {
          api.put(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(path)}`, content)
            .then(() => {
              setDirty(prev => { const next = new Set(prev); next.delete(path); return next; });
              setSavedContent(path, content);
            })
            .catch(() => {});
        } else {
          setDirty(prev => { const next = new Set(prev); next.delete(path); return next; });
          setSavedContent(path, content);
        }
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [autoSaveEnabled, dirty, fileContents, workspaceId, setSavedContent]);

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

  if (openFiles.length === 0 || isWelcomeOpen) {
    return <WelcomeTab />;
  }

  return (
    <motion.div
      className="flex-1 flex flex-col min-w-0 bg-[#0e0e0e] h-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Editor Tabs */}
      <motion.div
        className="flex items-center border-b border-white/5 bg-[#151515] overflow-x-auto custom-scrollbar flex-shrink-0"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {openFiles.map((path, i) => {
          const name = path.split('/').pop() || '';
          const isActive = activePath === path;
          const isDirty = dirty.has(path);
          return (
            <motion.div
              key={path}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={{ delay: i * 0.04 + 0.1, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              onClick={() => {
                setWelcomeOpen(false);
                setActivePath(path);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#0e0e0e] border-t-2 border-blue-500 font-medium text-white'
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
          );
        })}
      </motion.div>

      {/* Monaco Editor */}
      <div className="flex-1 relative">
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 flex items-center justify-center bg-[#0e0e0e]/50 z-10 text-white/50 text-xs"
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
              glyphMargin: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              renderLineHighlight: 'all',
              wordWrap: wordWrap ? 'on' : 'off',
              columnSelection,
            }}
          />
        )}
      </div>
    </motion.div>
  );
}

export default EditorPane;
