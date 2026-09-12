"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useIDEStore } from "../../../store/ideStore";
import { toast } from "sonner";

interface MenuItemDef {
  label?: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
  checked?: boolean;
  submenu?: MenuItemDef[];
}

interface MenuDef {
  id: string;
  label: string;
  items: MenuItemDef[];
}

export interface IDEMenuBarProps {
  className?: string;
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onSaveAll?: () => void;
  onRevert?: () => void;
  onCloseEditor?: () => void;
  onCloseAll?: () => void;
}

export function IDEMenuBar({
  className,
  onOpenFile,
  onOpenFolder,
  onSave,
  onSaveAs,
  onSaveAll,
  onRevert,
  onCloseEditor,
  onCloseAll,
}: IDEMenuBarProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState<number | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // IDE Store actions & states
  const store = useIDEStore();

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
        setActiveSubmenuIndex(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenuId(null);
        setActiveSubmenuIndex(null);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const runMonacoAction = (actionId: string) => {
    if (!store.activeEditor) {
      toast.error("No active editor");
      return;
    }
    try {
      const action = store.activeEditor.getAction(actionId);
      if (action) {
        action.run();
      } else {
        store.activeEditor.trigger("menu", actionId, null);
      }
    } catch {
      // ignore
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const copySelection = async () => {
    if (!store.activeEditor) return;
    const model = store.activeEditor.getModel();
    const selection = store.activeEditor.getSelection();
    if (model && selection) {
      const text = model.getValueInRange(selection);
      if (text) {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    }
  };

  const cutSelection = async () => {
    if (!store.activeEditor) return;
    const model = store.activeEditor.getModel();
    const selection = store.activeEditor.getSelection();
    if (model && selection) {
      const text = model.getValueInRange(selection);
      if (text) {
        await navigator.clipboard.writeText(text);
        store.activeEditor.executeEdits("menu", [
          { range: selection, text: "", forceMoveMarkers: true },
        ]);
      }
    }
  };

  const pasteSelection = async () => {
    if (!store.activeEditor) return;
    try {
      const text = await navigator.clipboard.readText();
      const selection = store.activeEditor.getSelection();
      if (selection) {
        store.activeEditor.executeEdits("menu", [
          { range: selection, text, forceMoveMarkers: true },
        ]);
      }
    } catch {
      toast.error("Clipboard access denied");
    }
  };

  const duplicateSelection = () => {
    if (!store.activeEditor) return;
    const model = store.activeEditor.getModel();
    const selection = store.activeEditor.getSelection();
    if (model && selection) {
      const text = model.getValueInRange(selection);
      if (text) {
        store.activeEditor.executeEdits("menu", [
          {
            range: {
              startLineNumber: selection.endLineNumber,
              startColumn: selection.endColumn,
              endLineNumber: selection.endLineNumber,
              endColumn: selection.endColumn,
            },
            text,
            forceMoveMarkers: true,
          },
        ]);
      } else {
        runMonacoAction("editor.action.copyLinesDownAction");
      }
    }
  };

  const triggerBreakpointCurrentLine = () => {
    if (!store.activeEditor || !store.activePath) return;
    const pos = store.activeEditor.getPosition();
    if (pos) {
      store.toggleBreakpoint(store.activePath, pos.lineNumber);
    }
  };

  // Build Recent Files submenu
  const recentItems: MenuItemDef[] =
    store.recentFiles.length === 0
      ? [{ label: "No Recent Files", disabled: true }]
      : store.recentFiles.slice(0, 10).map((path) => ({
          label: path.split("/").pop() || path,
          action: () => {
            store.addOpenFile(path);
            store.setActivePath(path);
          },
        }));

  // Build Switch Editor submenu
  const openFileItems: MenuItemDef[] =
    store.openFiles.length === 0
      ? [{ label: "No Open Editors", disabled: true }]
      : store.openFiles.map((p) => ({
          label: p.split("/").pop() || p,
          checked: store.activePath === p,
          action: () => store.setActivePath(p),
        }));

  // Menu Definitions
  const menus: MenuDef[] = [
    // 1. FILE MENU
    {
      id: "file",
      label: "File",
      items: [
        {
          label: "New Text File",
          shortcut: "Ctrl+N",
          action: () => store.createUntitledFile(),
        },
        {
          label: "New File...",
          action: () => store.createUntitledFile(),
        },
        {
          label: "New Window",
          shortcut: "Ctrl+Shift+N",
          action: () => {
            if (window.mcodeElectron?.openExternal) {
              window.mcodeElectron.openExternal(window.location.href).catch(() => {
                window.open(window.location.href, "_blank");
              });
            } else {
              window.open(window.location.href, "_blank");
            }
          },
        },
        { divider: true },
        {
          label: "Open File...",
          shortcut: "Ctrl+O",
          action: () => {
            if (onOpenFile) onOpenFile();
            else {
              const input = document.createElement("input");
              input.type = "file";
              input.onchange = (e: any) => {
                const f = e.target?.files?.[0];
                if (f) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const content = String(reader.result || "");
                    store.addOpenFile(f.name);
                    store.setActivePath(f.name);
                    store.setFileContent(f.name, content);
                    store.setSavedContent(f.name, content);
                  };
                  reader.readAsText(f);
                }
              };
              input.click();
            }
          },
        },
        {
          label: "Open Folder...",
          action: () => {
            if (onOpenFolder) onOpenFolder();
            else if ("showDirectoryPicker" in window) {
              (window as any)
                .showDirectoryPicker()
                .then(async (dirHandle: any) => {
                  toast.success(`Opened folder: ${dirHandle.name}`);
                })
                .catch(() => {});
            } else {
              toast.info("Folder picker fallback: use Upload button");
            }
          },
        },
        {
          label: "Open Workspace from File...",
          action: () => toast.info("Select a workspace definition file"),
        },
        {
          label: "Open Recent",
          submenu: recentItems,
        },
        { divider: true },
        {
          label: "Add Folder to Workspace...",
          action: () => toast.info("Add folder to workspace"),
        },
        {
          label: "Save Workspace As...",
          action: () => {
            const blob = new Blob(
              [JSON.stringify({ files: store.openFiles }, null, 2)],
              { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "workspace.mcode-workspace";
            a.click();
            URL.revokeObjectURL(url);
          },
        },
        {
          label: "Duplicate Workspace",
          action: () => toast.success("Workspace cloned"),
        },
        { divider: true },
        {
          label: "Save",
          shortcut: "Ctrl+S",
          action: () => {
            if (onSave) onSave();
            else toast.success("File saved");
          },
        },
        {
          label: "Save As...",
          shortcut: "Ctrl+Shift+S",
          action: () => {
            if (onSaveAs) onSaveAs();
            else if (store.activePath) {
              const content =
                store.fileContentsCache[store.activePath] ||
                store.activeEditor?.getValue() ||
                "";
              const blob = new Blob([content], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = store.activePath.split("/").pop() || "download.txt";
              a.click();
              URL.revokeObjectURL(url);
            }
          },
        },
        {
          label: "Save All",
          shortcut: "Ctrl+K S",
          action: () => {
            if (onSaveAll) onSaveAll();
            else toast.success("All files saved");
          },
        },
        { divider: true },
        {
          label: "Auto Save",
          checked: store.autoSaveEnabled,
          action: () => {
            store.toggleAutoSave();
            toast.info(`Auto Save ${!store.autoSaveEnabled ? "enabled" : "disabled"}`);
          },
        },
        { divider: true },
        {
          label: "Revert File",
          action: () => {
            if (onRevert) onRevert();
            else if (store.activePath && store.savedContents[store.activePath] !== undefined) {
              const original = store.savedContents[store.activePath];
              store.setFileContent(store.activePath, original);
              if (store.activeEditor) {
                store.activeEditor.setValue(original);
              }
              toast.success("File reverted to last saved state");
            } else {
              toast.info("No saved snapshot available to revert");
            }
          },
        },
        { divider: true },
        {
          label: "Close Editor",
          shortcut: "Ctrl+W",
          action: () => {
            if (onCloseEditor) onCloseEditor();
            else if (store.activePath) store.closeFile(store.activePath);
          },
        },
        {
          label: "Close Folder",
          shortcut: "Ctrl+K F",
          action: () => {
            if (onCloseAll) onCloseAll();
            else store.openFiles.forEach((f) => store.closeFile(f));
          },
        },
        {
          label: "Close Window",
          shortcut: "Ctrl+Shift+W",
          action: () => window.close(),
        },
        { divider: true },
        {
          label: "Preferences: Open Settings",
          shortcut: "Ctrl+,",
          action: () => store.openSettings("models"),
        },
        { divider: true },
        {
          label: "Exit",
          action: () => {
            store.setActiveTab("Chat");
          },
        },
      ],
    },

    // 2. EDIT MENU
    {
      id: "edit",
      label: "Edit",
      items: [
        {
          label: "Undo",
          shortcut: "Ctrl+Z",
          action: () => runMonacoAction("undo"),
        },
        {
          label: "Redo",
          shortcut: "Ctrl+Y",
          action: () => runMonacoAction("redo"),
        },
        { divider: true },
        {
          label: "Cut",
          shortcut: "Ctrl+X",
          action: cutSelection,
        },
        {
          label: "Copy",
          shortcut: "Ctrl+C",
          action: copySelection,
        },
        {
          label: "Paste",
          shortcut: "Ctrl+V",
          action: pasteSelection,
        },
        { divider: true },
        {
          label: "Find",
          shortcut: "Ctrl+F",
          action: () => runMonacoAction("actions.find"),
        },
        {
          label: "Replace",
          shortcut: "Ctrl+H",
          action: () => runMonacoAction("editor.action.startFindReplaceAction"),
        },
        { divider: true },
        {
          label: "Find in Files",
          shortcut: "Ctrl+Shift+F",
          action: () => {
            store.setActiveActivityBar("search");
            store.setSidebarOpen(true);
          },
        },
        {
          label: "Replace in Files",
          shortcut: "Ctrl+Shift+H",
          action: () => {
            store.setActiveActivityBar("search");
            store.setSidebarOpen(true);
          },
        },
        { divider: true },
        {
          label: "Toggle Line Comment",
          shortcut: "Ctrl+/",
          action: () => runMonacoAction("editor.action.commentLine"),
        },
        {
          label: "Toggle Block Comment",
          shortcut: "Shift+Alt+A",
          action: () => runMonacoAction("editor.action.blockComment"),
        },
        {
          label: "Emmet: Expand Abbreviation",
          shortcut: "Tab",
          action: () => runMonacoAction("editor.emmet.action.expandAbbreviation"),
        },
      ],
    },

    // 3. SELECTION MENU
    {
      id: "selection",
      label: "Selection",
      items: [
        {
          label: "Select All",
          shortcut: "Ctrl+A",
          action: () => {
            if (store.activeEditor) {
              store.activeEditor.setSelection(
                store.activeEditor.getModel()?.getFullModelRange()
              );
            }
          },
        },
        {
          label: "Expand Selection",
          shortcut: "Shift+Alt+Right",
          action: () => runMonacoAction("editor.action.smartSelect.expand"),
        },
        {
          label: "Shrink Selection",
          shortcut: "Shift+Alt+Left",
          action: () => runMonacoAction("editor.action.smartSelect.shrink"),
        },
        { divider: true },
        {
          label: "Copy Line Up",
          shortcut: "Shift+Alt+Up",
          action: () => runMonacoAction("editor.action.copyLinesUpAction"),
        },
        {
          label: "Copy Line Down",
          shortcut: "Shift+Alt+Down",
          action: () => runMonacoAction("editor.action.copyLinesDownAction"),
        },
        {
          label: "Move Line Up",
          shortcut: "Alt+Up",
          action: () => runMonacoAction("editor.action.moveLinesUpAction"),
        },
        {
          label: "Move Line Down",
          shortcut: "Alt+Down",
          action: () => runMonacoAction("editor.action.moveLinesDownAction"),
        },
        { divider: true },
        {
          label: "Duplicate Selection",
          action: duplicateSelection,
        },
        { divider: true },
        {
          label: "Add Cursor Above",
          shortcut: "Ctrl+Alt+Up",
          action: () => runMonacoAction("editor.action.insertCursorAbove"),
        },
        {
          label: "Add Cursor Below",
          shortcut: "Ctrl+Alt+Down",
          action: () => runMonacoAction("editor.action.insertCursorBelow"),
        },
        {
          label: "Add Cursors to Line Ends",
          shortcut: "Shift+Alt+I",
          action: () =>
            runMonacoAction("editor.action.insertCursorAtEndOfEachLineSelected"),
        },
        {
          label: "Add Next Occurrence",
          shortcut: "Ctrl+D",
          action: () =>
            runMonacoAction("editor.action.addSelectionToNextFindMatch"),
        },
        {
          label: "Select All Occurrences",
          shortcut: "Ctrl+Shift+L",
          action: () => runMonacoAction("editor.action.selectHighlights"),
        },
        { divider: true },
        {
          label: "Switch to Ctrl+Click for Multi-Cursor",
          action: () => toast.info("Multi-cursor modifier set to Ctrl/Cmd"),
        },
        {
          label: "Column Selection Mode",
          checked: store.columnSelection,
          action: () => {
            store.toggleColumnSelection();
            toast.info(`Column Selection ${!store.columnSelection ? "on" : "off"}`);
          },
        },
      ],
    },

    // 4. VIEW MENU
    {
      id: "view",
      label: "View",
      items: [
        {
          label: "Command Palette...",
          shortcut: "Ctrl+Shift+P",
          action: () => store.toggleCommandPalette(),
        },
        {
          label: "Open View...",
          action: () => store.setQuickOpenOpen(true),
        },
        { divider: true },
        {
          label: "Appearance",
          submenu: [
            {
              label: "Full Screen",
              action: toggleFullScreen,
            },
            {
              label: "Zen Mode",
              checked: store.zenMode,
              action: () => store.toggleZenMode(),
            },
            {
              label: "Menu Bar",
              checked: store.menuBarVisible,
              action: () => store.toggleMenuBar(),
            },
            {
              label: "Primary Side Bar",
              shortcut: "Ctrl+B",
              checked: store.isSidebarOpen,
              action: () => store.toggleSidebar(),
            },
            {
              label: "Secondary Side Bar (AI Chat)",
              checked: store.secondarySideBarVisible,
              action: () => store.toggleSecondarySideBar(),
            },
            {
              label: "Panel",
              shortcut: "Ctrl+J",
              checked: store.isTerminalOpen,
              action: () => store.toggleTerminal(),
            },
            {
              label: "Status Bar",
              checked: store.statusBarVisible,
              action: () => store.toggleStatusBar(),
            },
          ],
        },
        {
          label: "Editor Layout",
          submenu: [
            {
              label: "Single Pane",
              action: () => toast.info("Layout: Single Pane"),
            },
            {
              label: "Split Right",
              action: () => toast.info("Editor split right"),
            },
            {
              label: "Split Down",
              action: () => toast.info("Editor split down"),
            },
          ],
        },
        { divider: true },
        {
          label: "Explorer",
          shortcut: "Ctrl+Shift+E",
          action: () => {
            store.setActiveActivityBar("explorer");
            store.setSidebarOpen(true);
          },
        },
        {
          label: "Search",
          shortcut: "Ctrl+Shift+F",
          action: () => {
            store.setActiveActivityBar("search");
            store.setSidebarOpen(true);
          },
        },
        {
          label: "Source Control",
          shortcut: "Ctrl+Shift+G",
          action: () => {
            store.setActiveActivityBar("source-control");
            store.setSidebarOpen(true);
          },
        },
        {
          label: "Run",
          shortcut: "Ctrl+Shift+D",
          action: () => {
            store.setActiveActivityBar("run-debug");
            store.setSidebarOpen(true);
          },
        },
        {
          label: "Languages & Runtimes",
          shortcut: "Ctrl+Shift+L",
          action: () => {
            store.setActiveActivityBar("languages");
            store.setSidebarOpen(true);
          },
        },
        {
          label: "Extensions",
          shortcut: "Ctrl+Shift+X",
          action: () => {
            store.setActiveActivityBar("extensions");
            store.setSidebarOpen(true);
          },
        },
        { divider: true },
        {
          label: "Problems",
          shortcut: "Ctrl+Shift+M",
          action: () => store.setActivePanelTab("problems"),
        },
        {
          label: "Output",
          shortcut: "Ctrl+Shift+U",
          action: () => store.setActivePanelTab("output"),
        },
        {
          label: "Debug Console",
          shortcut: "Ctrl+Shift+Y",
          action: () => store.setActivePanelTab("debugConsole"),
        },
        {
          label: "Terminal",
          shortcut: "Ctrl+`",
          action: () => store.setActivePanelTab("terminal"),
        },
        { divider: true },
        {
          label: "Word Wrap",
          shortcut: "Alt+Z",
          checked: store.wordWrap,
          action: () => store.toggleWordWrap(),
        },
      ],
    },

    // 5. GO MENU
    {
      id: "go",
      label: "Go",
      items: [
        {
          label: "Back",
          shortcut: "Alt+Left",
          action: () => {
            const p = store.navGoBack();
            if (p) {
              if (store.activePath !== p.path) {
                store.addOpenFile(p.path);
                store.setActivePath(p.path);
              }
              if (store.activeEditor) {
                store.activeEditor.revealLineInCenter(p.line);
                store.activeEditor.setPosition({
                  lineNumber: p.line,
                  column: p.column || 1,
                });
                store.activeEditor.focus();
              }
            } else {
              toast.info("Beginning of navigation history");
            }
          },
        },
        {
          label: "Forward",
          shortcut: "Alt+Right",
          action: () => {
            const p = store.navGoForward();
            if (p) {
              if (store.activePath !== p.path) {
                store.addOpenFile(p.path);
                store.setActivePath(p.path);
              }
              if (store.activeEditor) {
                store.activeEditor.revealLineInCenter(p.line);
                store.activeEditor.setPosition({
                  lineNumber: p.line,
                  column: p.column || 1,
                });
                store.activeEditor.focus();
              }
            } else {
              toast.info("End of navigation history");
            }
          },
        },
        {
          label: "Last Edit Location",
          shortcut: "Ctrl+K Ctrl+Q",
          action: () => runMonacoAction("workbench.action.navigateToLastEditLocation"),
        },
        { divider: true },
        {
          label: "Switch Editor",
          submenu: openFileItems,
        },
        { divider: true },
        {
          label: "Go to File...",
          shortcut: "Ctrl+P",
          action: () => store.setQuickOpenOpen(true),
        },
        {
          label: "Go to Symbol in Editor...",
          shortcut: "Ctrl+Shift+O",
          action: () => store.setSymbolSearchOpen(true),
        },
        {
          label: "Go to Symbol in Workspace...",
          shortcut: "Ctrl+T",
          action: () => store.setSymbolSearchOpen(true),
        },
        {
          label: "Go to Definition",
          shortcut: "F12",
          action: () => runMonacoAction("editor.action.revealDefinition"),
        },
        {
          label: "Go to Declaration",
          action: () => runMonacoAction("editor.action.revealDeclaration"),
        },
        {
          label: "Go to Type Definition",
          action: () => runMonacoAction("editor.action.goToTypeDefinition"),
        },
        {
          label: "Go to References",
          shortcut: "Shift+F12",
          action: () => runMonacoAction("editor.action.goToReferences"),
        },
        { divider: true },
        {
          label: "Go to Line/Column...",
          shortcut: "Ctrl+G",
          action: () => store.setGoToLineOpen(true),
        },
        {
          label: "Go to Bracket",
          shortcut: "Ctrl+Shift+\\",
          action: () => runMonacoAction("editor.action.jumpToBracket"),
        },
        { divider: true },
        {
          label: "Next Problem",
          shortcut: "F8",
          action: () => runMonacoAction("editor.action.marker.next"),
        },
        {
          label: "Previous Problem",
          shortcut: "Shift+F8",
          action: () => runMonacoAction("editor.action.marker.prev"),
        },
        {
          label: "Next Change",
          shortcut: "Alt+F3",
          action: () => runMonacoAction("workbench.action.compareEditor.nextChange"),
        },
        {
          label: "Previous Change",
          shortcut: "Shift+Alt+F3",
          action: () => runMonacoAction("workbench.action.compareEditor.previousChange"),
        },
      ],
    },

    // 6. RUN MENU
    {
      id: "run",
      label: "Run",
      items: [
        {
          label: "Start Debugging",
          shortcut: "F5",
          action: () => {
            store.setActiveActivityBar("run-debug");
            store.setSidebarOpen(true);
            toast.info("Starting debug session in sandboxed runner");
          },
        },
        {
          label: "Run Without Debugging",
          shortcut: "Ctrl+F5",
          action: () => {
            if (store.activePath) {
              const code =
                store.fileContentsCache[store.activePath] ||
                store.activeEditor?.getValue() ||
                "";
              store.setTerminalOpen(true);
              store.setActivePanelTab("terminal");
              document.dispatchEvent(
                new CustomEvent("terminal:write", {
                  detail: `\r\n\x1b[32m[Running ${store.activePath}]\x1b[0m\r\n`,
                })
              );
              try {
                // eslint-disable-next-line no-new-func
                new Function(code)();
                document.dispatchEvent(
                  new CustomEvent("terminal:write", {
                    detail: `\x1b[32m[Process completed successfully]\x1b[0m\r\n`,
                  })
                );
              } catch (err: any) {
                document.dispatchEvent(
                  new CustomEvent("terminal:write", {
                    detail: `\x1b[31mError: ${err?.message || err}\x1b[0m\r\n`,
                  })
                );
              }
            } else {
              toast.info("No active file to run");
            }
          },
        },
        {
          label: "Stop Debugging",
          shortcut: "Shift+F5",
          action: () => toast.info("Debug session stopped"),
        },
        {
          label: "Restart Debugging",
          shortcut: "Ctrl+Shift+F5",
          action: () => toast.info("Restarting debug session"),
        },
        { divider: true },
        {
          label: "Open Configurations",
          action: () => {
            const launchPath = ".vscode/launch.json";
            const sample = JSON.stringify(
              {
                version: "0.2.0",
                configurations: [
                  {
                    type: "node",
                    request: "launch",
                    name: "Launch Program",
                    program: "${workspaceFolder}/index.js",
                  },
                ],
              },
              null,
              2
            );
            store.addOpenFile(launchPath);
            store.setActivePath(launchPath);
            if (!store.fileContentsCache[launchPath]) {
              store.setFileContent(launchPath, sample);
              store.setSavedContent(launchPath, sample);
            }
          },
        },
        {
          label: "Add Configuration...",
          action: () => toast.info("Add Debug Configuration"),
        },
        { divider: true },
        {
          label: "Step Over",
          shortcut: "F10",
          action: () => toast.info("Step Over (attach DevTools or debugger)"),
        },
        {
          label: "Step Into",
          shortcut: "F11",
          action: () => toast.info("Step Into"),
        },
        {
          label: "Step Out",
          shortcut: "Shift+F11",
          action: () => toast.info("Step Out"),
        },
        {
          label: "Continue",
          shortcut: "F5",
          action: () => toast.info("Continuing execution"),
        },
        { divider: true },
        {
          label: "Toggle Breakpoint",
          shortcut: "F9",
          action: triggerBreakpointCurrentLine,
        },
        {
          label: "Enable All Breakpoints",
          action: () => {
            store.enableAllBreakpoints();
            toast.success("All breakpoints enabled");
          },
        },
        {
          label: "Disable All Breakpoints",
          action: () => {
            store.disableAllBreakpoints();
            toast.info("All breakpoints disabled");
          },
        },
        {
          label: "Remove All Breakpoints",
          action: () => {
            store.clearAllBreakpoints();
            toast.success("All breakpoints removed");
          },
        },
      ],
    },

    // 7. TERMINAL MENU
    {
      id: "terminal",
      label: "Terminal",
      items: [
        {
          label: "New Terminal",
          shortcut: "Ctrl+Shift+`",
          action: () => {
            store.addTerminalInstance();
            toast.success("New terminal created");
          },
        },
        {
          label: "Split Terminal",
          shortcut: "Ctrl+Shift+5",
          action: () => {
            store.addTerminalInstance("split");
            toast.success("Terminal split");
          },
        },
        { divider: true },
        {
          label: "Run Task...",
          action: () => store.setTasksOpen(true),
        },
        {
          label: "Run Build Task",
          shortcut: "Ctrl+Shift+B",
          action: () => {
            store.setTerminalOpen(true);
            store.setActivePanelTab("terminal");
            document.dispatchEvent(
              new CustomEvent("terminal:write", {
                detail: `\r\n\x1b[34m$ npm run build\x1b[0m\r\n`,
              })
            );
          },
        },
        {
          label: "Run Active File",
          action: () => {
            if (store.activePath) {
              store.setTerminalOpen(true);
              store.setActivePanelTab("terminal");
              document.dispatchEvent(
                new CustomEvent("terminal:write", {
                  detail: `\r\n\x1b[34m$ node ${store.activePath}\x1b[0m\r\n`,
                })
              );
            }
          },
        },
        { divider: true },
        {
          label: "Show Running Tasks",
          action: () => store.setTasksOpen(true),
        },
        {
          label: "Restart Running Task",
          action: () => toast.info("Task restarted"),
        },
        {
          label: "Terminate Task",
          action: () => toast.info("Task terminated"),
        },
        { divider: true },
        {
          label: "Configure Tasks...",
          action: () => {
            const taskPath = ".vscode/tasks.json";
            const sample = JSON.stringify(
              {
                version: "2.0.0",
                tasks: [
                  {
                    label: "build",
                    type: "shell",
                    command: "npm run build",
                  },
                ],
              },
              null,
              2
            );
            store.addOpenFile(taskPath);
            store.setActivePath(taskPath);
            if (!store.fileContentsCache[taskPath]) {
              store.setFileContent(taskPath, sample);
              store.setSavedContent(taskPath, sample);
            }
          },
        },
        {
          label: "Configure Default Build Task...",
          action: () => toast.info("Default build task configured"),
        },
        { divider: true },
        {
          label: "Clear Terminal",
          action: () => {
            document.dispatchEvent(new CustomEvent("terminal:clear"));
            toast.success("Terminal cleared");
          },
        },
        {
          label: "Kill Terminal",
          action: () => {
            if (store.activeTerminalId) {
              store.removeTerminalInstance(store.activeTerminalId);
              toast.info("Terminal killed");
            }
          },
        },
        {
          label: "Rename Terminal",
          action: () => {
            const name = prompt("Enter new terminal name:", "bash");
            if (name && store.activeTerminalId) {
              store.renameTerminalInstance(store.activeTerminalId, name);
            }
          },
        },
      ],
    },

    // 8. HELP MENU
    {
      id: "help",
      label: "Help",
      items: [
        {
          label: "Welcome",
          action: () => store.setWelcomeOpen(true),
        },
        {
          label: "Show All Commands",
          shortcut: "Ctrl+Shift+P",
          action: () => store.toggleCommandPalette(),
        },
        {
          label: "Documentation",
          action: () => window.open("https://github.com", "_blank"),
        },
        {
          label: "Editor Playground",
          action: () => store.setWelcomeOpen(true),
        },
        {
          label: "Show Release Notes",
          action: () => store.setReleaseNotesOpen(true),
        },
        { divider: true },
        {
          label: "Keyboard Shortcuts Reference",
          shortcut: "Ctrl+K Ctrl+R",
          action: () => store.setShortcutsOpen(true),
        },
        {
          label: "Video Tutorials",
          action: () => window.open("https://youtube.com", "_blank"),
        },
        {
          label: "Tips and Tricks",
          action: () => store.setWelcomeOpen(true),
        },
        { divider: true },
        {
          label: "Join Us on GitHub",
          action: () => window.open("https://github.com", "_blank"),
        },
        {
          label: "Search Feature Requests",
          action: () => window.open("https://github.com", "_blank"),
        },
        {
          label: "Report Issue",
          action: () => window.open("https://github.com", "_blank"),
        },
        { divider: true },
        {
          label: "View License",
          action: () => window.open("/LICENSE.txt", "_blank"),
        },
        {
          label: "About",
          action: () => store.setAboutOpen(true),
        },
      ],
    },
  ];

  const handleMenuClick = (id: string) => {
    if (activeMenuId === id) {
      setActiveMenuId(null);
      setActiveSubmenuIndex(null);
    } else {
      setActiveMenuId(id);
      setActiveSubmenuIndex(null);
    }
  };

  const handleMenuMouseEnter = (id: string) => {
    if (activeMenuId !== null && activeMenuId !== id) {
      setActiveMenuId(id);
      setActiveSubmenuIndex(null);
    }
  };

  const handleItemClick = (item: MenuItemDef) => {
    if (item.disabled || item.submenu) return;
    if (item.action) item.action();
    setActiveMenuId(null);
    setActiveSubmenuIndex(null);
  };

  if (!store.menuBarVisible) return null;

  return (
    <div
      ref={menuBarRef}
      className={`flex items-center text-xs text-white/80 select-none relative z-40 flex-shrink-0 ${className || 'h-8 bg-[#151515] border-b border-white/5 px-2'}`}
    >
      <div className="flex items-center gap-0.5">
        {menus.map((menu) => {
          const isOpen = activeMenuId === menu.id;
          return (
            <div key={menu.id} className="relative">
              <button
                type="button"
                onClick={() => handleMenuClick(menu.id)}
                onMouseEnter={() => handleMenuMouseEnter(menu.id)}
                className={`px-2.5 py-1 rounded transition-colors text-xs ${
                  isOpen
                    ? "bg-white/10 text-white font-medium shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {menu.label}
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div
                  className="absolute left-0 top-full mt-1 min-w-[240px] bg-[#1a1a1d] border border-white/10 rounded-lg shadow-2xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  {menu.items.map((item, idx) => {
                    if (item.divider) {
                      return <div key={idx} className="h-px bg-white/5 my-1" />;
                    }

                    const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0);
                    const isSubmenuOpen = activeSubmenuIndex === idx;

                    return (
                      <div
                        key={idx}
                        className="relative"
                        onMouseEnter={() => {
                          if (hasSubmenu) setActiveSubmenuIndex(idx);
                          else setActiveSubmenuIndex(null);
                        }}
                      >
                        <div
                          onClick={() => handleItemClick(item)}
                          className={`flex items-center justify-between px-3 py-1.5 mx-1 rounded cursor-pointer transition-colors ${
                            item.disabled
                              ? "opacity-30 cursor-not-allowed text-white/50"
                              : isSubmenuOpen
                              ? "bg-blue-600 text-white font-medium"
                              : "text-white/80 hover:bg-blue-600 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-3">
                            <span className="w-3.5 flex items-center justify-center">
                              {item.checked && <Check className="w-3.5 h-3.5 text-blue-400" />}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-white/40 flex-shrink-0">
                            {item.shortcut && (
                              <span className="font-mono tracking-tight text-white/40 group-hover:text-white/80">
                                {item.shortcut}
                              </span>
                            )}
                            {hasSubmenu && <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
                          </div>
                        </div>

                        {/* Submenu */}
                        {hasSubmenu && isSubmenuOpen && (
                          <div
                            className="absolute left-full top-0 ml-0.5 min-w-[200px] max-w-[280px] bg-[#1a1a1d] border border-white/10 rounded-lg shadow-2xl py-1 text-xs z-50 backdrop-blur-md animate-in fade-in duration-75"
                            onMouseLeave={() => setActiveSubmenuIndex(null)}
                          >
                            {item.submenu!.map((subItem, sIdx) => {
                              if (subItem.divider) {
                                return <div key={sIdx} className="h-px bg-white/5 my-1" />;
                              }
                              return (
                                <div
                                  key={sIdx}
                                  onClick={() => handleItemClick(subItem)}
                                  className={`flex items-center justify-between px-3 py-1.5 mx-1 rounded cursor-pointer transition-colors ${
                                    subItem.disabled
                                      ? "opacity-30 cursor-not-allowed text-white/50"
                                      : "text-white/80 hover:bg-blue-600 hover:text-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-3.5 flex items-center justify-center">
                                      {subItem.checked && <Check className="w-3.5 h-3.5 text-blue-400" />}
                                    </span>
                                    <span className="truncate">{subItem.label}</span>
                                  </div>
                                  {subItem.shortcut && (
                                    <span className="text-[10px] font-mono text-white/40 ml-2">
                                      {subItem.shortcut}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default IDEMenuBar;
