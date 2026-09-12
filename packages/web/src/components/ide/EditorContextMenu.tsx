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
      style={{ top: clampedY, left: clampedX }}
      className="fixed z-[9999] min-w-[250px] bg-[#1e1e1e] border border-[#454545]/60 rounded-md shadow-2xl p-1 text-xs text-white/90 select-none animate-in fade-in-80 duration-100 font-sans"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. Go to Definition */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onClick={() => runMonacoAction("editor.action.revealDefinition")}
      >
        <span>Go to Definition</span>
        <span className="text-[11px] text-white/40 font-mono">F12</span>
      </div>

      {/* 2. Go to References */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onClick={() => runMonacoAction("editor.action.goToReferences")}
      >
        <span>Go to References</span>
        <span className="text-[11px] text-white/40 font-mono">Shift+F12</span>
      </div>

      {/* 3. Peek > */}
      <div
        className="relative flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onMouseEnter={() => setActiveSubmenu("peek")}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <span>Peek</span>
        <ChevronRight className="w-3.5 h-3.5 text-white/40" />

        {activeSubmenu === "peek" && (
          <div className="absolute left-full top-0 -ml-1 min-w-[190px] bg-[#1e1e1e] border border-[#454545]/60 rounded-md shadow-2xl p-1 text-xs text-white/90 z-50">
            <div
              className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
              onClick={() => runMonacoAction("editor.action.peekDefinition")}
            >
              <span>Peek Definition</span>
              <span className="text-[10px] text-white/40 font-mono">Alt+F12</span>
            </div>
            <div
              className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
              onClick={() => runMonacoAction("editor.action.referenceSearch.trigger")}
            >
              <span>Peek References</span>
              <span className="text-[10px] text-white/40 font-mono">Shift+F10</span>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-white/10 my-1 -mx-1" />

      {/* 4. Find All References */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onClick={() => runMonacoAction("editor.action.referenceSearch.trigger")}
      >
        <span>Find All References</span>
        <span className="text-[11px] text-white/40 font-mono">Shift+Alt+F12</span>
      </div>

      <div className="h-px bg-white/10 my-1 -mx-1" />

      {/* 5. Rename Symbol */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onClick={() => runMonacoAction("editor.action.rename")}
      >
        <span>Rename Symbol</span>
        <span className="text-[11px] text-white/40 font-mono">F2</span>
      </div>

      {/* 6. Change All Occurrences */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onClick={() => runMonacoAction("editor.action.changeAll")}
      >
        <span>Change All Occurrences</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+F2</span>
      </div>

      {/* 7. Refactor... */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onClick={() => runMonacoAction("editor.action.refactor")}
      >
        <span>Refactor...</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+Shift+R</span>
      </div>

      {/* 8. Source Action... */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onClick={() => runMonacoAction("editor.action.sourceAction")}
      >
        <span>Source Action...</span>
      </div>

      <div className="h-px bg-white/10 my-1 -mx-1" />

      {/* 9. Share > */}
      <div
        className="relative flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onMouseEnter={() => setActiveSubmenu("share")}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <span>Share</span>
        <ChevronRight className="w-3.5 h-3.5 text-white/40" />

        {activeSubmenu === "share" && (
          <div className="absolute left-full top-0 -ml-1 min-w-[160px] bg-[#1e1e1e] border border-[#454545]/60 rounded-md shadow-2xl p-1 text-xs text-white/90 z-50">
            <div
              className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Share link copied to clipboard");
                onClose();
              }}
            >
              <span>Copy Link</span>
            </div>
            <div
              className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
              onClick={() => {
                handleCopy();
                toast.info("Shared code snippet to clipboard");
                onClose();
              }}
            >
              <span>Share Code</span>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-white/10 my-1 -mx-1" />

      {/* 10. Cut */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onClick={handleCut}
      >
        <span>Cut</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+X</span>
      </div>

      {/* 11. Copy */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onClick={handleCopy}
      >
        <span>Copy</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+C</span>
      </div>

      {/* 12. Paste */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onClick={handlePaste}
      >
        <span>Paste</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+V</span>
      </div>

      <div className="h-px bg-white/10 my-1 -mx-1" />

      {/* 13. Command Palette... */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#04395e] hover:text-white cursor-pointer transition-colors"
        onClick={() => runMonacoAction("editor.action.quickCommand")}
      >
        <span>Command Palette...</span>
        <span className="text-[11px] text-white/40 font-mono">Ctrl+Shift+P</span>
      </div>
    </div>
  );
}
