import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Search, Terminal, FileText, Pencil, FolderSearch, Check, Send, Paperclip, ShieldCheck, ChevronDown } from "lucide-react";

export function StepPulse({ active }) {
  if (!active) return <div style={{ width: 6, height: 6 }} />;
  return (
    <motion.div
      animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "var(--zc-accent)",
        flexShrink: 0,
      }}
    />
  );
}

const ICONS = {
  explored: FolderSearch,
  searched: Search,
  ran: Terminal,
  wrote: FileText,
  updated: Pencil,
};

export function ToolCallCard({ type = "explored", label, summary, children, defaultOpen = false, active = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = ICONS[type] ?? FolderSearch;
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.setProperty(
        "--radix-collapsible-content-height",
        `${contentRef.current.scrollHeight}px`
      );
    }
  }, [open, children]);

  return (
    <div style={{ marginBottom: 8, fontFamily: "var(--zc-font)" }}>
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
          color: "var(--zc-text)",
          textAlign: "left",
        }}
      >
        <Icon size={15} style={{ color: "var(--zc-accent)", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color: "var(--zc-text-dim)", marginLeft: 4 }}>
          {summary}
        </span>
      </button>

      <div
        ref={contentRef}
        data-state={open ? "open" : "closed"}
        data-zcode-collapsible-animate-close="true"
        style={{
          display: open ? "block" : "none",
          padding: "8px 0 8px 24px",
          fontSize: 12.5,
          color: "var(--zc-text-dim)",
          fontFamily: "var(--zc-mono)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const LANG_COLOR = {
  js: "#f7df1e",
  html: "#e34c26",
  css: "#264de4",
  py: "#3776ab",
  rs: "#dea584",
  ts: "#3178c6",
};

export function WroteFile({ filename, lang, lines }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
        fontFamily: "var(--zc-mono)",
        fontSize: 12.5,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: LANG_COLOR[lang] ?? "#888",
        }}
      />
      <span style={{ color: "var(--zc-text)" }}>{filename}</span>
      <span style={{ color: "var(--zc-green)" }}>+{lines}</span>
    </motion.div>
  );
}

export function DiffBlock({ filename, added, removed }) {
  return (
    <div style={{ fontFamily: "var(--zc-mono)", fontSize: 12.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
        <span style={{ color: "var(--zc-text)" }}>{filename}</span>
        <span>
          <span style={{ color: "var(--zc-green)" }}>+{added}</span>{" "}
          <span style={{ color: "var(--zc-red)" }}>-{removed}</span>
        </span>
      </div>
      <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", background: "var(--zc-border)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(added / (added + removed)) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ background: "var(--zc-green)" }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(removed / (added + removed)) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          style={{ background: "var(--zc-red)" }}
        />
      </div>
    </div>
  );
}

export function TerminalOutput({ command, output }) {
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
      style={{
        background: "transparent",
        border: "1px solid var(--zc-border)",
        borderRadius: 6,
        padding: "8px 10px",
        fontFamily: "var(--zc-mono)",
        fontSize: 12,
      }}
    >
      <div style={{ color: "var(--zc-accent)" }}>$ {command}</div>
      <pre style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", color: "var(--zc-text-dim)" }}>
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

export function GoalTracker({ title, steps, elapsed, tokens }) {
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / Math.max(1, steps.length)) * 100);

  return (
    <div
      style={{
        background: "transparent",
        border: "1px solid var(--zc-border)",
        borderRadius: "var(--zc-radius)",
        padding: 14,
        fontFamily: "var(--zc-font)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--zc-text)" }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--zc-text-dim)" }}>
          {done}/{steps.length} · {elapsed} · {tokens}
        </span>
      </div>

      <div style={{ height: 4, background: "var(--zc-border)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ height: "100%", background: "var(--zc-green)" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}
          >
            <motion.div
              animate={{
                backgroundColor: s.done ? "var(--zc-green)" : "transparent",
                borderColor: s.done ? "var(--zc-green)" : "var(--zc-border)",
              }}
              style={{
                width: 15,
                height: 15,
                borderRadius: "50%",
                border: "1.5px solid",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {s.done && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  <Check size={10} color="#000" />
                </motion.span>
              )}
            </motion.div>
            <span
              style={{
                color: s.done ? "var(--zc-text-dim)" : "var(--zc-text)",
                textDecoration: s.done ? "line-through" : "none",
              }}
            >
              {s.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function AgentInputBar({ model = "GLM-5.2", onSend }) {
  const [value, setValue] = useState("");

  return (
    <div
      style={{
        background: "transparent",
        border: "1px solid var(--zc-border)",
        borderRadius: 12,
        padding: 10,
        fontFamily: "var(--zc-font)",
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
          color: "var(--zc-text)",
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
        <div style={{ display: "flex", gap: 10, color: "var(--zc-text-dim)", fontSize: 12 }}>
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
              color: "var(--zc-text-dim)",
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
              background: "var(--zc-accent)",
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
