import { create } from "zustand";

export type ActiveTab = "Chat" | "AI Code Editor";

interface IDEState {
  // Tab surface shown in the workspace header (Chat vs VS Code editor).
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

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
}

/**
 * Central UI state for the VS Code-style IDE surfaces.
 *
 * Backing all keyboard shortcuts (react-hotkeys-hook via GlobalShortcuts) plus
 * the Command palette and ShortcutsDialog so every surface shares one source of
 * truth. Defaults: sidebar + terminal open, palette + dialogs closed, no open
 * editor files.
 */
export const useIDEStore = create<IDEState>()((set) => ({
  activeTab: "Chat",
  setActiveTab: (activeTab) => set({ activeTab }),

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
  addOpenFile: (path) =>
    set((s) => ({
      openFiles: s.openFiles.includes(path) ? s.openFiles : [...s.openFiles, path],
      activePath: path,
    })),
  setActivePath: (activePath) => set({ activePath }),
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
}));

export default useIDEStore;
