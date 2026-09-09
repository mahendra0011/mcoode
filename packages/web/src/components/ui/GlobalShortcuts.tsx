"use client";
import { useHotkeys } from "react-hotkeys-hook";
import { useIDEStore } from "../../store/ideStore";

/**
 * Global VS Code-style keyboard shortcuts, wired to the Zustand IDE store.
 *
 * Mounted once in Providers so the shortcuts are active on every route.
 * (`mod` = Ctrl on Windows/Linux, Cmd on macOS.)
 */
export function GlobalShortcuts() {
  const togglePalette = useIDEStore((s) => s.toggleCommandPalette);
  const closePalette = useIDEStore((s) => s.closeCommandPalette);
  const toggleSidebar = useIDEStore((s) => s.toggleSidebar);
  const toggleTerminal = useIDEStore((s) => s.toggleTerminal);
  const toggleShortcuts = useIDEStore((s) => s.toggleShortcutsOpen);
  const toggleQuickOpen = useIDEStore((s) => s.toggleQuickOpen);
  const toggleSymbolSearch = useIDEStore((s) => s.toggleSymbolSearch);
  const toggleGoToLine = useIDEStore((s) => s.toggleGoToLine);
  const toggleWordWrap = useIDEStore((s) => s.toggleWordWrap);
  const setTasksOpen = useIDEStore((s) => s.setTasksOpen);
  const setQuickOpenOpen = useIDEStore((s) => s.setQuickOpenOpen);
  const setSymbolSearchOpen = useIDEStore((s) => s.setSymbolSearchOpen);
  const setGoToLineOpen = useIDEStore((s) => s.setGoToLineOpen);
  const setShortcutsOpen = useIDEStore((s) => s.setShortcutsOpen);
  const setAboutOpen = useIDEStore((s) => s.setAboutOpen);
  const setReleaseNotesOpen = useIDEStore((s) => s.setReleaseNotesOpen);
  const setZenMode = useIDEStore((s) => s.setZenMode);
  const zenMode = useIDEStore((s) => s.zenMode);
  const setActiveActivityBar = useIDEStore((s) => s.setActiveActivityBar);

  useHotkeys("mod+k", togglePalette);
  useHotkeys("mod+shift+p", togglePalette);
  useHotkeys("mod+b", toggleSidebar);
  useHotkeys("mod+`", toggleTerminal);
  useHotkeys("mod+j", toggleTerminal);
  useHotkeys("mod+/", toggleShortcuts);
  useHotkeys("mod+p", toggleQuickOpen);
  useHotkeys("mod+shift+o", toggleSymbolSearch);
  useHotkeys("mod+g", toggleGoToLine);
  useHotkeys("alt+z", toggleWordWrap);
  useHotkeys("mod+shift+b", () => setTasksOpen(true));
  useHotkeys("f5", (e) => {
    e.preventDefault();
    setActiveActivityBar("run-debug");
  });

  useHotkeys("escape", () => {
    closePalette();
    setQuickOpenOpen(false);
    setSymbolSearchOpen(false);
    setGoToLineOpen(false);
    setShortcutsOpen(false);
    setAboutOpen(false);
    setReleaseNotesOpen(false);
    setTasksOpen(false);
    if (zenMode) setZenMode(false);
  });

  return null;
}

export default GlobalShortcuts;
