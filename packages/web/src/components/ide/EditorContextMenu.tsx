"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

export interface EditorContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  editor: any;
  monaco: any;
}

// WEB-019: shared classes for menu items. Rendered as native <button> so
// they are focusable and handle Enter/Space without custom key handlers.
// `w-full text-left` preserves the old full-width div layout; the
// focus-visible style mirrors the hover style for keyboard users.
const ITEM_CLASSES =
  "flex w-full items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white focus-visible:bg-[#04395e] focus-visible:text-white focus-visible:outline-none cursor-pointer transition-colors text-left";

export function EditorContextMenu({
  x,
  y,
  onClose,
  editor,
  monaco,
}: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  // Position clamping so menu doesn't overflow screen boundaries
  const menuWidth = 260;
  const menuHeight = 440;
  const clampedX = Math.max(10, Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1200) - menuWidth - 10));
  const clampedY = Math.max(10, Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 800) - menuHeight - 10));

  // Dismiss menu on click outside or Escape key
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const runMonacoAction = (actionId: string) => {
    if (editor) {
      editor.focus();
      const action = editor.getAction(actionId);
      if (action) {
        action.run();
      } else {
        editor.trigger("contextmenu", actionId, null);
      }
    }
    onClose();
  };

  const handleCut = () => {
    if (editor) {
      editor.focus();
      const selection = editor.getSelection();
      const model = editor.getModel();
      if (selection && model) {
        const text = model.getValueInRange(selection);
        if (text) {
          navigator.clipboard.writeText(text);
          editor.executeEdits("cut", [{ range: selection, text: "" }]);
        }
      }
    }
    onClose();
  };

  const handleCopy = () => {
    if (editor) {
      editor.focus();
      const selection = editor.getSelection();
      const model = editor.getModel();
      if (selection && model) {
        const text = model.getValueInRange(selection);
        if (text) {
          navigator.clipboard.writeText(text);
          toast.success("Copied to clipboard");
        }
      }
    }
    onClose();
  };

  const handlePaste = async () => {
    if (editor) {
      editor.focus();
      try {
        const text = await navigator.clipboard.readText();
        const selection = editor.getSelection();
        if (selection && text) {
          editor.executeEdits("paste", [{ range: selection, text }]);
        }
      } catch {
        toast.error("Clipboard access denied");
      }
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Editor actions"
      style={{ top: clampedY, left: clampedX }}
      className="fixed z-[9999] min-w-[250px] bg-[#1e1e1e] border border-[#454545]/60 rounded-md shadow-2xl p-1 text-xs text-white/90 select-none animate-in fade-in-80 duration-100 font-sans"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. Go to Definition */}
      <button
        type="button"
        role="menuitem"
        className={ITEM_CLASSES}
        onClick={() => runMonacoAction("editor.action.revealDefinition")}
      >
        <span>Go to Definition</span>
        <span className="text-[11px] text-white/40 font-mono">F12</span>
      </button>

      {/* 2. Go to References */}
      <button
        type="button"
        role="menuitem"
        className={ITEM_CLASSES}
        onClick={() => runMonacoAction("editor.action.goToReferences")}
      >
        <span>Go to References</span>
        <span className="text-[11px] text-white/40 font-mono">Shift+F12</span>
      </button>

      {/* 3. Peek > */}
      <div className="relative" onMouseLeave={() => setActiveSubmenu(null)}>
        <button
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={activeSubmenu === "peek"}
          className={ITEM_CLASSES}
          onMouseEnter={() => setActiveSubmenu("peek")}
          onFocus={() => setActiveSubmenu("peek")}
          onClick={() => setActiveSubmenu(activeSubmenu === "peek" ? null : "peek")}
        >
          <span>Peek</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/40" aria-hidden="true" />
        </button>

        {activeSubmenu === "peek" && (
          <div
            role="menu"
            aria-label="Peek"
            className="absolute left-full top-0 -ml-1 min-w-[190px] bg-[#1e1e1e] border border-[#454545]/60 rounded-md shadow-2xl p-1 text-xs text-white/90 z-50"
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <button
              type="button"
              role="menuitem"
              className={ITEM_CLASSES}
              onClick={() => runMonacoAction("editor.action.peekDefinition")}
            >
              <span>Peek Definition</span>
              <span className="text-[10px] text-white/40 font-mono">Alt+F12</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={ITEM_CLASSES}
              onClick={() => runMonacoAction("editor.action.referenceSearch.trigger")}
            >
              <span>Peek References</span>
              <span className="text-[10px] text-white/40 font-mono">Shift+F10</span>
            </button>
          </div>
        )}
      </div>

      <div className="h-px bg-white/10 my-1 -mx-1" />

      {/* 4. Find All References */}
      <button
        type="button"
        role="menuitem"
        className={ITEM_CLASSES}
        onClick={() => runMonacoAction("editor.action.referenceSearch.trigger")}
      >
        <span>Find All References</span>
        <span className="text-[11px] text-white/40 font-mono">Shift+Alt+F12</span>
      </button>

      <div className="h-px bg-white/10 my-1 -mx-1" />

      {/* 5. Rename Symbol */}
      <button
        type="button"
        role="menuitem"
        className={ITEM_CLASSES}
        onClick={() => runMonacoAction("editor.action.rename")}
      >
        <span>Rename Symbol</span>
        <span className="text-[11px] text-white/40 font-mono">F2</span>
      </button>

      {/* 6. Change All Occurrences */}
      <button
        type="button"
        role="menuitem"
        className={ITEM_CLASSES}
        onClick={() => runMonacoAction("editor.action.changeAll")}
      >
        <span>Change All Occurrences</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+F2</span>
      </button>

      {/* 7. Refactor... */}
      <button
        type="button"
        role="menuitem"
        className={ITEM_CLASSES}
        onClick={() => runMonacoAction("editor.action.refactor")}
      >
        <span>Refactor...</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+Shift+R</span>
      </button>

      {/* 8. Source Action... */}
      <button
        type="button"
        role="menuitem"
        className={ITEM_CLASSES}
        onClick={() => runMonacoAction("editor.action.sourceAction")}
      >
        <span>Source Action...</span>
      </button>

      <div className="h-px bg-white/10 my-1 -mx-1" />

      {/* 9. Share > */}
      <div className="relative" onMouseLeave={() => setActiveSubmenu(null)}>
        <button
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={activeSubmenu === "share"}
          className={ITEM_CLASSES}
          onMouseEnter={() => setActiveSubmenu("share")}
          onFocus={() => setActiveSubmenu("share")}
          onClick={() => setActiveSubmenu(activeSubmenu === "share" ? null : "share")}
        >
          <span>Share</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/40" aria-hidden="true" />
        </button>

        {activeSubmenu === "share" && (
          <div
            role="menu"
            aria-label="Share"
            className="absolute left-full top-0 -ml-1 min-w-[160px] bg-[#1e1e1e] border border-[#454545]/60 rounded-md shadow-2xl p-1 text-xs text-white/90 z-50"
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <button
              type="button"
              role="menuitem"
              className={ITEM_CLASSES}
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Share link copied to clipboard");
                onClose();
              }}
            >
              <span>Copy Link</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={ITEM_CLASSES}
              onClick={() => {
                handleCopy();
                toast.info("Shared code snippet to clipboard");
                onClose();
              }}
            >
              <span>Share Code</span>
            </button>
          </div>
        )}
      </div>

      <div className="h-px bg-white/10 my-1 -mx-1" />

      {/* 10. Cut */}
      <button
        type="button"
        role="menuitem"
        className={ITEM_CLASSES}
        onClick={handleCut}
      >
        <span>Cut</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+X</span>
      </button>

      {/* 11. Copy */}
      <button
        type="button"
        role="menuitem"
        className={ITEM_CLASSES}
        onClick={handleCopy}
      >
        <span>Copy</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+C</span>
      </button>

      {/* 12. Paste */}
      <button
        type="button"
        role="menuitem"
        className={ITEM_CLASSES}
        onClick={handlePaste}
      >
        <span>Paste</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+V</span>
      </button>

      <div className="h-px bg-white/10 my-1 -mx-1" />

      {/* 13. Command Palette... */}
      <button
        type="button"
        role="menuitem"
        className={ITEM_CLASSES}
        onClick={() => runMonacoAction("editor.action.quickCommand")}
      >
        <span>Command Palette...</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+Shift+P</span>
      </button>
    </div>
  );
}
