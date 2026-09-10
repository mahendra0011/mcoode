import React, { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Terminal, FileText, Pencil, FolderSearch, Send, Paperclip, ShieldCheck, ChevronDown } from "lucide-react";

export type IconKey = keyof typeof ICONS;

const ICONS = {
  explored: FolderSearch,
  searched: Search,
  ran: Terminal,
  wrote: FileText,
  updated: Pencil,
};

export interface StepPulseProps {
  active?: boolean;
}

export interface ToolCallCardProps {
  type?: IconKey | (string & {});
  label?: string;
  summary?: string;
  children?: ReactNode;
  defaultOpen?: boolean;
  active?: boolean;
}

export interface WroteFileProps {
  filename: string;
  lang?: string;
  lines: number;
}

export interface DiffBlockProps {
  filename: string;
  added: number;
  removed: number;
}

export interface TerminalOutputProps {
  command?: string;
  output?: string;
}

export interface AgentInputBarProps {
  model?: string;
  onSend?: (value: string) => void;
}

const LANG_COLOR: Record<string, string> = {
  js: "#f7df1e",
  html: "#e34c26",
  css: "#264de4",
  py: "#3776ab",
  rs: "#dea584",
  ts: "#3178c6",
};

export function StepPulse({ active }: StepPulseProps) {
  if (!active) return <div style={{ width: 6, height: 6 }} />;
  return (
    <motion.div
      animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "var(--mcode-green, #3ecf8e)",
        flexShrink: 0,
      }}
    />
  );
}

export function ToolCallCard({ type = "explored", label, summary, children, defaultOpen = false, active = false }: ToolCallCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = (ICONS[type as IconKey] ?? FolderSearch);

  return (
    <div style={{ marginBottom: 8, fontFamily: "var(--mcode-font)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "4px 0",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--mcode-text)",
          textAlign: "left",
        }}
      >
        <Icon size={15} style={{ color: "var(--mcode-accent)", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color: "var(--mcode-text-dim)", marginLeft: 4 }}>
          {summary}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="tool-call-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            data-state="open"
            data-mcode-collapsible-animate-close="true"
            style={{
              padding: "8px 0 8px 24px",
              fontSize: 12.5,
              color: "var(--mcode-text-dim)",
              fontFamily: "var(--mcode-mono)",
              overflow: "hidden",
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WroteFile({ filename, lang, lines }: WroteFileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
        fontFamily: "var(--mcode-mono)",
        fontSize: 12.5,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: LANG_COLOR[lang ?? ""] ?? "#888",
        }}
      />
      <span style={{ color: "var(--mcode-text)" }}>{filename}</span>
      <span style={{ color: "var(--mcode-green)" }}>+{lines}</span>
    </motion.div>
  );
}

export function DiffBlock({ filename, added, removed }: DiffBlockProps) {
  const total = added + removed || 1;
  return (
    <div style={{ fontFamily: "var(--mcode-mono)", fontSize: 12.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
        <span style={{ color: "var(--mcode-text)" }}>{filename}</span>
        <span>
          <span style={{ color: "var(--mcode-green)" }}>+{added}</span>{" "}
          <span style={{ color: "var(--mcode-red)" }}>-{removed}</span>
        </span>
      </div>
      <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", background: "var(--mcode-border)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(added / total) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{ background: "var(--mcode-green)" }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(removed / total) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
          style={{ background: "var(--mcode-red)" }}
        />
      </div>
    </div>
  );
}

export function TerminalOutput({ command, output }: TerminalOutputProps) {
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    setVisibleChars(0);
    if (!output) return;
    const id = setInterval(() => {
      setVisibleChars((n) => {
        if (n >= output.length) {
          clearInterval(id);
          return n;
        }
        return n + Math.max(1, Math.ceil(output.length / 40));
      });
    }, 16);
    return () => clearInterval(id);
  }, [output]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{
        background: "transparent",
        border: "1px solid var(--mcode-border)",
        borderRadius: 6,
        padding: "8px 10px",
        fontFamily: "var(--mcode-mono)",
        fontSize: 12,
      }}
    >
      <div style={{ color: "var(--mcode-accent)" }}>$ {command}</div>
      <pre style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", color: "var(--mcode-text-dim)" }}>
        {output ? output.slice(0, visibleChars) : ""}
        {output && visibleChars < output.length && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            ▌
          </motion.span>
        )}
      </pre>
    </motion.div>
  );
}

export function AgentInputBar({ model = "GLM-5.2", onSend }: AgentInputBarProps) {
  const [value, setValue] = useState("");

  return (
    <div
      style={{
        background: "transparent",
        border: "1px solid var(--mcode-border)",
        borderRadius: 12,
        padding: 10,
        fontFamily: "var(--mcode-font)",
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask for follow-up changes"
        rows={2}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          resize: "none",
          color: "var(--mcode-text)",
          fontSize: 13,
          fontFamily: "inherit",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend?.(value);
            setValue("");
          }
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <div style={{ display: "flex", gap: 10, color: "var(--mcode-text-dim)", fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <Paperclip size={13} /> Add context
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <ShieldCheck size={13} /> Ask before changes
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--mcode-text-dim)",
              cursor: "pointer",
            }}
          >
            {model} <ChevronDown size={12} />
          </span>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              onSend?.(value);
              setValue("");
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--mcode-accent)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Send size={13} color="#0d0e12" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
