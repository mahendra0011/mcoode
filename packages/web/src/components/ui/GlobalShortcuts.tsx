"use client";
import { useHotkeys } from "react-hotkeys-hook";
import { useIDEStore } from "../../store/ideStore";

/**
 * Global VS Code-style keyboard shortcuts, wired to the Zustand IDE store.
 *
 * Mounted once in Providers so the shortcuts are active on every route.
 * (`mod` = Ctrl on Windows/Linux, Cmd on macOS.) react-hotkeys-hook skips
 * shortcuts while typing in text inputs/textarea, so these never steal focus
 * from the chat prompt or editor.
 *
 *   Cmd/Ctrl + K              toggle the command palette
 *   Cmd/Ctrl + Shift + P      toggle the command palette
 *   Cmd/Ctrl + B              toggle the file-tree sidebar
 *   Cmd/Ctrl + ` (backtick)   toggle the integrated terminal
 *   Cmd/Ctrl + /              open the shortcuts cheat sheet
 *   Escape                    close the command palette
 */
export function GlobalShortcuts() {
  const togglePalette = useIDEStore((s) => s.toggleCommandPalette);
  const closePalette = useIDEStore((s) => s.closeCommandPalette);
  const toggleSidebar = useIDEStore((s) => s.toggleSidebar);
  const toggleTerminal = useIDEStore((s) => s.toggleTerminal);
  const toggleShortcuts = useIDEStore((s) => s.toggleShortcutsOpen);

  useHotkeys("mod+k", togglePalette);
  useHotkeys("mod+shift+p", togglePalette);
  useHotkeys("mod+b", toggleSidebar);
  useHotkeys("mod+`", toggleTerminal);
  useHotkeys("mod+/", toggleShortcuts);
  useHotkeys("escape", closePalette);

  return null;
}

export default GlobalShortcuts;
