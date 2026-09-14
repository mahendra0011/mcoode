import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ALL_LANGUAGES } from "../lib/languagesData";

export type ActiveTab = "Chat" | "AI Code Editor";
export type PanelTab = "problems" | "output" | "debugConsole" | "terminal" | "ports" | "watch";

export interface NavPoint {
  path: string;
  line: number;
  column: number;
}

export interface BreakpointItem {
  id: string;
  path: string;
  line: number;
  enabled: boolean;
}

export interface TerminalInstance {
  id: string;
  name: string;
}

interface IDEState {
  // Tab surface shown in the workspace header (Chat vs VS Code editor).
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Active item in the IDE activity bar (explorer, extensions, search, etc.)
  activeActivityBar: string;
  setActiveActivityBar: (bar: string) => void;

  // Explorer (file-tree) sidebar toggle — Cmd/Ctrl+B.
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Integrated terminal toggle — Cmd/Ctrl+`.
  isTerminalOpen: boolean;
  toggleTerminal: () => void;
  setTerminalOpen: (open: boolean) => void;

  // Global command palette — Cmd/Ctrl+K and Cmd/Ctrl+Shift+P.
  isCommandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  closeCommandPalette: () => void;

  // Keyboard-shortcuts cheat-sheet dialog — Cmd/Ctrl+/.
  isShortcutsOpen: boolean;
  toggleShortcutsOpen: () => void;
  setShortcutsOpen: (open: boolean) => void;

  // Open editor documents + active tab. Moved off AIChatPage local state so
  // FileTree / EditorPane share one source of truth and keyboard shortcuts can
  // drive open-file state without prop threading.
  openFiles: string[];
  activePath: string | null;
  triggerRefresh: number;
  addOpenFile: (path: string) => void;
  setActivePath: (path: string | null) => void;
  closeFile: (path: string) => void;
  bumpRefresh: () => void;

  // Jump to specific file and line (Search panel / Test panel)
  targetJump: { path: string; line: number; column?: number } | null;
  setTargetJump: (jump: { path: string; line: number; column?: number } | null) => void;

  // In-memory file content cache (for Search, Debug, Diff)
  fileContentsCache: Record<string, string>;
  setFileContent: (path: string, content: string) => void;

  // Saved contents snapshot for Revert File
  savedContents: Record<string, string>;
  setSavedContent: (path: string, content: string) => void;

  // Auto-save toggle
  autoSaveEnabled: boolean;
  toggleAutoSave: () => void;
  setAutoSaveEnabled: (enabled: boolean) => void;

  // Recent files list
  recentFiles: string[];
  addRecentFile: (path: string) => void;

  // Untitled file counter
  untitledCount: number;
  createUntitledFile: () => string;

  // Active Monaco instance references
  activeEditor: any | null;
  activeMonaco: any | null;
  setActiveEditor: (editor: any, monaco: any) => void;

  // Layout & Appearance
  zenMode: boolean;
  setZenMode: (zen: boolean) => void;
  toggleZenMode: () => void;
  wordWrap: boolean;
  toggleWordWrap: () => void;
  columnSelection: boolean;
  toggleColumnSelection: () => void;
  menuBarVisible: boolean;
  setMenuBarVisible: (visible: boolean) => void;
  toggleMenuBar: () => void;
  statusBarVisible: boolean;
  setStatusBarVisible: (visible: boolean) => void;
  toggleStatusBar: () => void;
  secondarySideBarVisible: boolean;
  setSecondarySideBarVisible: (visible: boolean) => void;
  toggleSecondarySideBar: () => void;
  activePanelTab: PanelTab;
  setActivePanelTab: (tab: PanelTab) => void;

  // Editor Layout & Multi-Cursor Modifier
  multiCursorModifier: 'alt' | 'ctrlCmd';
  setMultiCursorModifier: (modifier: 'alt' | 'ctrlCmd') => void;
  editorLayout: 'single' | 'split-right' | 'split-down';
  setEditorLayout: (layout: 'single' | 'split-right' | 'split-down') => void;
  defaultBuildTask: string;
  setDefaultBuildTask: (task: string) => void;

  // File Compare & Search & Timeline
  compareLeft: string | null;
  setCompareLeft: (path: string | null) => void;
  diffPair: { original: string; modified: string } | null;
  setDiffPair: (diff: { original: string; modified: string } | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  timelineFile: string | null;
  setTimelineFile: (path: string | null) => void;
  expandedPaths: Record<string, boolean>;
  setPathExpanded: (path: string, expanded: boolean) => void;
  expandPathAncestors: (path: string) => void;

  // Source Control View & Sort
  sourceControlView: 'list' | 'tree';
  setSourceControlView: (view: 'list' | 'tree') => void;
  sourceControlSortMenuOpen: boolean;
  setSourceControlSortMenuOpen: (open: boolean) => void;

  // Navigation History (Go Back / Go Forward)
  navHistory: NavPoint[];
  navPointer: number;
  recordNavPoint: (point: NavPoint) => void;
  navGoBack: () => NavPoint | null;
  navGoForward: () => NavPoint | null;

  // Menu dialog toggles
  isQuickOpenOpen: boolean;
  setQuickOpenOpen: (open: boolean) => void;
  toggleQuickOpen: () => void;

  isSymbolSearchOpen: boolean;
  setSymbolSearchOpen: (open: boolean) => void;
  toggleSymbolSearch: () => void;

  isGoToLineOpen: boolean;
  setGoToLineOpen: (open: boolean) => void;
  toggleGoToLine: () => void;

  isAboutOpen: boolean;
  setAboutOpen: (open: boolean) => void;

  isSettingsOpen: boolean;
  settingsInitialTab: string | null;
  setSettingsOpen: (open: boolean) => void;
  openSettings: (tab?: string) => void;

  isReleaseNotesOpen: boolean;
  setReleaseNotesOpen: (open: boolean) => void;

  isWelcomeOpen: boolean;
  setWelcomeOpen: (open: boolean) => void;

  isTasksOpen: boolean;
  setTasksOpen: (open: boolean) => void;

  isQuickSettingsOpen: boolean;
  setQuickSettingsOpen: (open: boolean) => void;

  isAdvancedSettingsOpen: boolean;
  setAdvancedSettingsOpen: (open: boolean) => void;

  isGeneralSettingsOpen: boolean;
  setGeneralSettingsOpen: (open: boolean) => void;

  // Source control in-browser snapshots & commit history
  lastCommitSnapshots: Record<string, string>;
  commitHistory: Array<{ message: string; timestamp: number }>;
  commitChanges: (message: string) => void;

  // File edit/save timelines
  timelines: Record<string, Array<{ timestamp: number; label: string; contentSnapshot: string }>>;
  recordTimeline: (path: string, label: string, content: string) => void;

  // Breakpoints management
  breakpoints: BreakpointItem[];
  toggleBreakpoint: (path: string, line: number) => void;
  setBreakpointEnabled: (id: string, enabled: boolean) => void;
  enableAllBreakpoints: () => void;
  disableAllBreakpoints: () => void;
  removeBreakpoint: (id: string) => void;
  clearAllBreakpoints: () => void;

  // Terminal instances & runner callback
  terminalInstances: TerminalInstance[];
  activeTerminalId: string;
  addTerminalInstance: (name?: string) => string;
  removeTerminalInstance: (id: string) => void;
  renameTerminalInstance: (id: string, name: string) => void;
  setActiveTerminalId: (id: string) => void;
  runTerminalCommandFn: ((cmd: string) => void) | null;
  setRunTerminalCommandFn: (fn: ((cmd: string) => void) | null) => void;

  // Multi-select languages state (Welcome tab & Left sidebar)
  selectedLanguages: string[];
  toggleLanguage: (name: string) => void;
  setSelectedLanguages: (languages: string[]) => void;
  createLanguageFile: (langName: string) => void;
}

const getInitialRecentFiles = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("mcode_recent_files");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getInitialSelectedLanguages = (): string[] => {
  if (typeof window === "undefined") return ["Python", "JavaScript", "TypeScript", "HTML", "CSS", "Rust", "Go"];
  try {
    const raw = localStorage.getItem("mcode_selected_languages");
    return raw ? JSON.parse(raw) : ["Python", "JavaScript", "TypeScript", "HTML", "CSS", "Rust", "Go"];
  } catch {
    return ["Python", "JavaScript", "TypeScript", "HTML", "CSS", "Rust", "Go"];
  }
};

/**
 * Central UI state for the VS Code-style IDE surfaces.
 */
export const useIDEStore = create<IDEState>()(
  persist(
    (set, get) => ({
      activeTab: "Chat",
      setActiveTab: (activeTab) => set({ activeTab }),

  activeActivityBar: "explorer",
  setActiveActivityBar: (activeActivityBar) =>
    set((s) => {
      if (s.activeActivityBar === activeActivityBar && s.isSidebarOpen) {
        return { isSidebarOpen: false };
      }
      return { activeActivityBar, isSidebarOpen: true };
    }),

  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  isTerminalOpen: true,
  toggleTerminal: () => set((s) => ({ isTerminalOpen: !s.isTerminalOpen })),
  setTerminalOpen: (isTerminalOpen) => set({ isTerminalOpen }),

  isCommandPaletteOpen: false,
  toggleCommandPalette: () => set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),
  setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

  isShortcutsOpen: false,
  toggleShortcutsOpen: () => set((s) => ({ isShortcutsOpen: !s.isShortcutsOpen })),
  setShortcutsOpen: (isShortcutsOpen) => set({ isShortcutsOpen }),

  openFiles: [],
  activePath: null,
  triggerRefresh: 0,
  addOpenFile: (path) => {
    get().addRecentFile(path);
    set((s) => ({
      openFiles: s.openFiles.includes(path) ? s.openFiles : [...s.openFiles, path],
      activePath: path,
    }));
  },
  setActivePath: (activePath) => {
    if (activePath) get().addRecentFile(activePath);
    set({ activePath });
  },
  closeFile: (path) =>
    set((s) => {
      const openFiles = s.openFiles.filter((p) => p !== path);
      return {
        openFiles,
        activePath:
          s.activePath === path
            ? openFiles.length
              ? openFiles[openFiles.length - 1]
              : null
            : s.activePath,
      };
    }),
  bumpRefresh: () => set((s) => ({ triggerRefresh: s.triggerRefresh + 1 })),

  targetJump: null,
  setTargetJump: (targetJump) => set({ targetJump }),

  fileContentsCache: {},
  setFileContent: (path, content) =>
    set((s) => ({
      fileContentsCache: { ...s.fileContentsCache, [path]: content },
    })),

  savedContents: {},
  setSavedContent: (path, content) =>
    set((s) => ({
      savedContents: { ...s.savedContents, [path]: content },
    })),

  autoSaveEnabled: true,
  toggleAutoSave: () => set((s) => ({ autoSaveEnabled: !s.autoSaveEnabled })),
  setAutoSaveEnabled: (autoSaveEnabled) => set({ autoSaveEnabled }),

  recentFiles: getInitialRecentFiles(),
  addRecentFile: (path) => {
    if (!path) return;
    const current = get().recentFiles;
    const updated = [path, ...current.filter((p) => p !== path)].slice(0, 15);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mcode_recent_files", JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    set({ recentFiles: updated });
  },

  untitledCount: 0,
  createUntitledFile: () => {
    const nextCount = get().untitledCount + 1;
    const name = `Untitled-${nextCount}.txt`;
    set((s) => ({
      untitledCount: nextCount,
      openFiles: [...s.openFiles, name],
      activePath: name,
      fileContentsCache: { ...s.fileContentsCache, [name]: "" },
      savedContents: { ...s.savedContents, [name]: "" },
    }));
    return name;
  },

  selectedLanguages: getInitialSelectedLanguages(),
  toggleLanguage: (name) => {
    const cur = get().selectedLanguages;
    const next = cur.includes(name) ? cur.filter((l) => l !== name) : [...cur, name];
    set({ selectedLanguages: next });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mcode_selected_languages", JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  },
  setSelectedLanguages: (selectedLanguages) => {
    set({ selectedLanguages });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mcode_selected_languages", JSON.stringify(selectedLanguages));
      } catch {
        // ignore
      }
    }
  },
  createLanguageFile: (langName) => {
    const lang = ALL_LANGUAGES.find((l) => l.name.toLowerCase() === langName.toLowerCase());
    const ext = lang ? lang.extension : ".txt";
    const baseName = ext.startsWith(".") ? `main${ext}` : ext;
    let path = baseName;
    let counter = 1;
    while (get().openFiles.includes(path)) {
      path = ext.startsWith(".") ? `main_${counter}${ext}` : `${ext}_${counter}`;
      counter++;
    }
    const boilerplate = lang?.defaultBoilerplate || "";
    set((s) => ({
      openFiles: [...s.openFiles, path],
      activePath: path,
      fileContentsCache: { ...s.fileContentsCache, [path]: boilerplate },
      savedContents: { ...s.savedContents, [path]: boilerplate },
      isWelcomeOpen: false,
      selectedLanguages: lang && !s.selectedLanguages.includes(lang.name)
        ? [...s.selectedLanguages, lang.name]
        : s.selectedLanguages,
    }));
  },

  activeEditor: null,
  activeMonaco: null,
  setActiveEditor: (activeEditor, activeMonaco) => set({ activeEditor, activeMonaco }),

  zenMode: false,
  setZenMode: (zenMode) => set({ zenMode }),
  toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode })),

  wordWrap: false,
  toggleWordWrap: () => {
    const next = !get().wordWrap;
    const editor = get().activeEditor;
    if (editor) {
      editor.updateOptions({ wordWrap: next ? "on" : "off" });
    }
    set({ wordWrap: next });
  },

  columnSelection: false,
  toggleColumnSelection: () => {
    const next = !get().columnSelection;
    const editor = get().activeEditor;
    if (editor) {
      editor.updateOptions({ columnSelection: next });
    }
    set({ columnSelection: next });
  },

  menuBarVisible: true,
  setMenuBarVisible: (menuBarVisible) => set({ menuBarVisible }),
  toggleMenuBar: () => set((s) => ({ menuBarVisible: !s.menuBarVisible })),

  statusBarVisible: true,
  setStatusBarVisible: (statusBarVisible) => set({ statusBarVisible }),
  toggleStatusBar: () => set((s) => ({ statusBarVisible: !s.statusBarVisible })),

  secondarySideBarVisible: true,
  setSecondarySideBarVisible: (secondarySideBarVisible) => set({ secondarySideBarVisible }),
  toggleSecondarySideBar: () => set((s) => ({ secondarySideBarVisible: !s.secondarySideBarVisible })),

  activePanelTab: "terminal",
  setActivePanelTab: (activePanelTab) => set({ activePanelTab, isTerminalOpen: true }),

  navHistory: [],
  navPointer: -1,
  recordNavPoint: (point) =>
    set((s) => {
      // Don't record if same file and close lines
      const last = s.navHistory[s.navPointer];
      if (last && last.path === point.path && Math.abs(last.line - point.line) < 3) {
        return s;
      }
      const newHistory = [...s.navHistory.slice(0, s.navPointer + 1), point].slice(-50);
      return {
        navHistory: newHistory,
        navPointer: newHistory.length - 1,
      };
    }),
  navGoBack: () => {
    const s = get();
    if (s.navPointer <= 0) return null;
    const targetIdx = s.navPointer - 1;
    set({ navPointer: targetIdx });
    return s.navHistory[targetIdx];
  },
  navGoForward: () => {
    const s = get();
    if (s.navPointer >= s.navHistory.length - 1) return null;
    const targetIdx = s.navPointer + 1;
    set({ navPointer: targetIdx });
    return s.navHistory[targetIdx];
  },

  isQuickOpenOpen: false,
  setQuickOpenOpen: (isQuickOpenOpen) => set({ isQuickOpenOpen }),
  toggleQuickOpen: () => set((s) => ({ isQuickOpenOpen: !s.isQuickOpenOpen })),

  isSymbolSearchOpen: false,
  setSymbolSearchOpen: (isSymbolSearchOpen) => set({ isSymbolSearchOpen }),
  toggleSymbolSearch: () => set((s) => ({ isSymbolSearchOpen: !s.isSymbolSearchOpen })),

  isGoToLineOpen: false,
  setGoToLineOpen: (isGoToLineOpen) => set({ isGoToLineOpen }),
  toggleGoToLine: () => set((s) => ({ isGoToLineOpen: !s.isGoToLineOpen })),

  isAboutOpen: false,
  setAboutOpen: (isAboutOpen) => set({ isAboutOpen }),

  isSettingsOpen: false,
  settingsInitialTab: null,
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  openSettings: (tab) => set({ isSettingsOpen: true, settingsInitialTab: tab || 'permissions' }),

  isReleaseNotesOpen: false,
  setReleaseNotesOpen: (isReleaseNotesOpen) => set({ isReleaseNotesOpen }),

  isWelcomeOpen: true,
  setWelcomeOpen: (isWelcomeOpen) => set({ isWelcomeOpen }),

  isTasksOpen: false,
  setTasksOpen: (isTasksOpen) => set({ isTasksOpen }),

  isQuickSettingsOpen: false,
  setQuickSettingsOpen: (isQuickSettingsOpen) => set({ isQuickSettingsOpen }),

  isAdvancedSettingsOpen: false,
  setAdvancedSettingsOpen: (isAdvancedSettingsOpen) => set({ isAdvancedSettingsOpen }),

  isGeneralSettingsOpen: false,
  setGeneralSettingsOpen: (isGeneralSettingsOpen) => set({ isGeneralSettingsOpen }),

  lastCommitSnapshots: {},
  commitHistory: [],
  commitChanges: (message: string) =>
    set((s) => ({
      lastCommitSnapshots: { ...s.fileContentsCache },
      commitHistory: [
        { message, timestamp: Date.now() },
        ...s.commitHistory,
      ],
    })),

  timelines: {},
  recordTimeline: (path: string, label: string, content: string) =>
    set((s) => ({
      timelines: {
        ...s.timelines,
        [path]: [
          { timestamp: Date.now(), label, contentSnapshot: content },
          ...(s.timelines[path] || []),
        ].slice(0, 50),
      },
    })),

  breakpoints: [],
  toggleBreakpoint: (path, line) =>
    set((s) => {
      const existing = s.breakpoints.find((b) => b.path === path && b.line === line);
      if (existing) {
        return { breakpoints: s.breakpoints.filter((b) => b.id !== existing.id) };
      }
      return {
        breakpoints: [
          ...s.breakpoints,
          {
            id: `bp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            path,
            line,
            enabled: true,
          },
        ],
      };
    }),
  setBreakpointEnabled: (id, enabled) =>
    set((s) => ({
      breakpoints: s.breakpoints.map((b) => (b.id === id ? { ...b, enabled } : b)),
    })),
  enableAllBreakpoints: () =>
    set((s) => ({
      breakpoints: s.breakpoints.map((b) => ({ ...b, enabled: true })),
    })),
  disableAllBreakpoints: () =>
    set((s) => ({
      breakpoints: s.breakpoints.map((b) => ({ ...b, enabled: false })),
    })),
  removeBreakpoint: (id) =>
    set((s) => ({
      breakpoints: s.breakpoints.filter((b) => b.id !== id),
    })),
  clearAllBreakpoints: () => set({ breakpoints: [] }),

  terminalInstances: [{ id: "term-1", name: "bash" }],
  activeTerminalId: "term-1",
  addTerminalInstance: (name = "bash") => {
    const id = `term-${Date.now().toString(36)}`;
    set((s) => ({
      terminalInstances: [...s.terminalInstances, { id, name }],
      activeTerminalId: id,
      isTerminalOpen: true,
      activePanelTab: "terminal",
    }));
    return id;
  },
  removeTerminalInstance: (id) =>
    set((s) => {
      const remaining = s.terminalInstances.filter((t) => t.id !== id);
      const fallback = remaining.length > 0 ? remaining[remaining.length - 1].id : "";
      return {
        terminalInstances: remaining,
        activeTerminalId: s.activeTerminalId === id ? fallback : s.activeTerminalId,
      };
    }),
  renameTerminalInstance: (id, name) =>
    set((s) => ({
      terminalInstances: s.terminalInstances.map((t) => (t.id === id ? { ...t, name } : t)),
    })),
  setActiveTerminalId: (activeTerminalId) => set({ activeTerminalId }),

  runTerminalCommandFn: null,
  setRunTerminalCommandFn: (runTerminalCommandFn) => set({ runTerminalCommandFn }),

  multiCursorModifier: 'alt',
  setMultiCursorModifier: (multiCursorModifier) => set({ multiCursorModifier }),

  editorLayout: 'single',
  setEditorLayout: (editorLayout) => set({ editorLayout }),

  defaultBuildTask: 'build',
  setDefaultBuildTask: (defaultBuildTask) => set({ defaultBuildTask }),

  compareLeft: null,
  setCompareLeft: (compareLeft) => set({ compareLeft }),

  diffPair: null,
  setDiffPair: (diffPair) => set({ diffPair }),

  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  timelineFile: null,
  setTimelineFile: (timelineFile) => set({ timelineFile }),

  expandedPaths: {},
  setPathExpanded: (path, expanded) =>
    set((s) => ({ expandedPaths: { ...s.expandedPaths, [path]: expanded } })),
  expandPathAncestors: (path) => {
    const parts = path.replace(/\\/g, '/').split('/');
    const toExpand: Record<string, boolean> = {};
    let cur = '';
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur ? `${cur}/${parts[i]}` : parts[i];
      toExpand[cur] = true;
    }
    set((s) => ({ expandedPaths: { ...s.expandedPaths, ...toExpand } }));
  },

  sourceControlView: 'list',
  setSourceControlView: (sourceControlView) => set({ sourceControlView }),

  sourceControlSortMenuOpen: false,
  setSourceControlSortMenuOpen: (sourceControlSortMenuOpen) => set({ sourceControlSortMenuOpen }),
    }),
    {
      name: 'mcode-ide-settings',
      storage: createJSONStorage(() => localStorage),
      // Persist user preferences and open editor tabs across reloads
      partialize: (state) => ({
        activeTab: state.activeTab,
        openFiles: state.openFiles,
        activePath: state.activePath,
        wordWrap: state.wordWrap,
        autoSaveEnabled: state.autoSaveEnabled,
        columnSelection: state.columnSelection,
        multiCursorModifier: state.multiCursorModifier,
        editorLayout: state.editorLayout,
        menuBarVisible: state.menuBarVisible,
        statusBarVisible: state.statusBarVisible,
        selectedLanguages: state.selectedLanguages,
        defaultBuildTask: state.defaultBuildTask,
        sourceControlView: state.sourceControlView,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.autoSaveEnabled === undefined) {
          state.autoSaveEnabled = true;
        }
      },
    }
  )
);

export default useIDEStore;
