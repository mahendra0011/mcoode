"use client";
import { useIDEStore } from "../../store/ideStore";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@radix-ui/react-dialog";
import { Keyboard, X } from "lucide-react";

interface ShortcutRow {
  keys: string;
  label: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: "⌘ / Ctrl + K", label: "Open command palette" },
  { keys: "⌘ / Ctrl + Shift + P", label: "Open command palette" },
  { keys: "⌘ / Ctrl + B", label: "Toggle file-tree sidebar" },
  { keys: "⌘ / Ctrl + ` (backtick) or J", label: "Toggle integrated terminal" },
  { keys: "⌘ / Ctrl + P", label: "Quick open file" },
  { keys: "⌘ / Ctrl + Shift + O", label: "Go to symbol" },
  { keys: "⌘ / Ctrl + G", label: "Go to line" },
  { keys: "⌘ / Ctrl + Shift + B", label: "Open tasks" },
  { keys: "⌘ / Ctrl + /", label: "Show this cheat sheet" },
  { keys: "Escape", label: "Close dialogs" },
];

/**
 * Radix Dialog cheat-sheet for the keyboard shortcuts.
 *
 * Opened via Cmd/Ctrl+/ (see GlobalShortcuts → useIDEStore.toggleShortcutsOpen).
 * Controlled programmatically via useIDEStore.
 */
export function ShortcutsDialog() {
  const open = useIDEStore((s) => s.isShortcutsOpen);
  const setOpen = useIDEStore((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-[#1e1e1e] border border-white/10 text-white max-w-md w-[90vw] p-0 gap-0 outline-none">
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold p-4 pb-2">
          <Keyboard className="w-5 h-5 text-white/60" />
          Keyboard shortcuts
        </DialogTitle>
        <DialogDescription className="block text-sm text-white/50 px-4 pb-2">
          VS Code-style shortcuts for mcode.
        </DialogDescription>
        <div className="px-4 pb-4 space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-1.5">
              <kbd className="px-2 py-1 text-xs font-mono bg-white/5 rounded border border-white/10 text-white/70">
                {s.keys}
              </kbd>
              <span className="text-sm text-white/60">{s.label}</span>
            </div>
          ))}
        </div>
        <DialogClose className="absolute top-3 right-3 text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export default ShortcutsDialog;
