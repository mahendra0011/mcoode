import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, Check, ExternalLink, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// 1. Top-level status line: "Searching the web..." -> "Read 5 sources"
// ---------------------------------------------------------------------------
export function SearchStatusLine({ phase, query, sourceCount }) {
  // phase: "searching" | "reading" | "done"
  const label = {
    searching: `Searching the web for "${query}"`,
    reading: `Reading ${sourceCount} sources`,
    done: `Read ${sourceCount} sources`,
  }[phase];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13.5,
        color: "var(--zc-text-dim, #8b8d98)",
        fontFamily: "var(--zc-font, Inter, sans-serif)",
        padding: "4px 0",
      }}
    >
      {phase !== "done" ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ display: "flex" }}
        >
          <Loader2 size={14} />
        </motion.span>
      ) : (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          style={{ display: "flex", color: "var(--zc-green, #3ecf8e)" }}
        >
          <Check size={14} />
        </motion.span>
      )}

      {/* text swaps with a crossfade instead of an abrupt jump */}
      <AnimatePresence mode="wait">
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.15 }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Horizontal row of source "favicon pill" cards (Perplexity's signature look)
//    Appears while sources are being fetched, each one pops in as it resolves.
// ---------------------------------------------------------------------------
export function SourcePillRow({ sources }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "6px 0" }}>
      <AnimatePresence>
        {sources.map((s, i) => (
          <motion.a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, scale: 0.85, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 22 }}
            whileHover={{ y: -2 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 9px",
              borderRadius: 999,
              border: "1px solid var(--zc-border, #26272f)",
              background: "transparent",
              fontSize: 12,
              color: "var(--zc-text-dim, #8b8d98)",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${new URL(s.url).hostname}&sz=32`}
              alt=""
              width={13}
              height={13}
              style={{ borderRadius: 2 }}
            />
            <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {new URL(s.url).hostname.replace("www.", "")}
            </span>
          </motion.a>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Expandable "sources" panel — click to reveal full source cards
//    (title, snippet, link) — like Claude's citation list.
// ---------------------------------------------------------------------------
export function SourcesPanel({ sources, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ fontFamily: "var(--zc-font, Inter, sans-serif)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--zc-accent, #6c8cff)",
          fontSize: 13,
          padding: "4px 0",
        }}
      >
        <Globe size={13} />
        {sources.length} sources
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
          ▾
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6 }}>
              {sources.map((s, i) => (
                <motion.a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid var(--zc-border, #26272f)",
                    background: "transparent",
                    textDecoration: "none",
                    color: "var(--zc-text, #e6e6ea)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--zc-text-dim, #8b8d98)",
                      minWidth: 16,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      {s.title}
                      <ExternalLink size={10} style={{ color: "var(--zc-text-dim, #8b8d98)", flexShrink: 0 }} />
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--zc-text-dim, #8b8d98)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {s.snippet}
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Streaming answer text — word-by-word reveal (Claude/Perplexity typing feel)
// ---------------------------------------------------------------------------
export function StreamingAnswer({ text, wordsPerTick = 2, tickMs = 35 }) {
  const words = text ? text.split(" ") : [];
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= words.length) {
          clearInterval(id);
          return c;
        }
        return c + wordsPerTick;
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [text, words.length, wordsPerTick, tickMs]);

  return (
    <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--zc-text, #e6e6ea)" }}>
      {words.slice(0, count).join(" ")}
      {count < words.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          style={{ marginLeft: 2 }}
        >
          ▍
        </motion.span>
      )}
    </p>
  );
}

// ---------------------------------------------------------------------------
// 5. Full composed flow — plug your Node.js backend response into this
// ---------------------------------------------------------------------------
export function SearchResultBlock({ query, phase, sources, answer }) {
  // phase: "searching" | "reading" | "answering" | "done"
  return (
    <div style={{ maxWidth: 600, display: "flex", flexDirection: "column", gap: 4 }}>
      <SearchStatusLine
        phase={phase === "answering" || phase === "done" ? "done" : phase}
        query={query}
        sourceCount={sources.length}
      />

      {sources.length > 0 && <SourcePillRow sources={sources} />}

      <AnimatePresence>
        {(phase === "answering" || phase === "done") && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{ marginTop: 6 }}
          >
            {phase === "answering" ? (
              <StreamingAnswer text={answer} />
            ) : (
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--zc-text, #e6e6ea)" }}>{answer}</p>
            )}
            <div style={{ marginTop: 8 }}>
              <SourcesPanel sources={sources} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
