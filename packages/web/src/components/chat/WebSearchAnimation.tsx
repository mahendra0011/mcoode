"use client";
import { useState, useEffect, useMemo } from "react";
import type { SyntheticEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronDown, Loader2 } from "lucide-react";
import type { SearchSource, SearchStatus } from "../../types/chat";

function safeHostname(url: string | null | undefined): string {
  try {
    return new URL(url as string).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "").slice(0, 30);
  }
}

interface WebSearchAnimationProps {
  query?: string;
  status?: SearchStatus | "searching" | "reading" | "done" | "idle";
  sources?: SearchSource[];
  answer?: string;
  defaultExpanded?: boolean;
}

/**
 * Single source item row with favicon and fallback
 */
function SourceRow({ source, idx }: { source: SearchSource; idx: number }) {
  const [imgError, setImgError] = useState(false);
  const domain = source.domain || safeHostname(source.url);

  return (
    <motion.a
      href={source.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.02, duration: 0.18 }}
      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors group no-underline text-inherit cursor-pointer"
    >
      {/* Left: Favicon + Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
        {!imgError && domain ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            width={15}
            height={15}
            className="rounded-sm shrink-0 object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <Globe size={14} className="text-neutral-400 dark:text-white/40 shrink-0" />
        )}
        <span className="text-[13px] text-neutral-800 dark:text-white/85 group-hover:text-neutral-950 dark:group-hover:text-white truncate font-normal transition-colors">
          {source.title || domain}
        </span>
      </div>

      {/* Right: Domain */}
      <span className="text-xs font-mono text-neutral-400 dark:text-white/40 group-hover:text-neutral-600 dark:group-hover:text-white/70 shrink-0">
        {domain}
      </span>
    </motion.a>
  );
}

/**
 * Claude/Perplexity-style Single Web Search Component:
 * - Single component per assistant turn.
 * - Header: "Searched the web ˇ" / "Searching the web... ˇ"
 * - Dropdown card: rounded-2xl with clean rows: [Favicon] [Title] ...... [domain.com]
 * - Auto-behavior: open while searching (sites appear one by one), collapses automatically
 *   when search completes and the answer summary arrives.
 * - Clicking the header toggles the dropdown open/closed at any time.
 */
export function WebSearchAnimation({
  query = "web search",
  status = "done",
  sources: incomingSources,
  answer,
  defaultExpanded,
}: WebSearchAnimationProps) {
  const isSearching = status === "searching" || status === "reading" || status === "idle";

  // Auto-collapse logic:
  // - While searching: open by default so user sees sites as they appear
  // - Once done: auto-close so only "Searched the web ˇ" sits above the answer summary
  // - If user explicitly clicks the toggle, honor user's choice
  const [userToggled, setUserToggled] = useState<boolean | null>(null);

  // Reset user toggle when a new search starts
  useEffect(() => {
    if (isSearching) {
      setUserToggled(null);
    }
  }, [isSearching]);

  const isOpen = userToggled !== null ? userToggled : (defaultExpanded !== undefined ? defaultExpanded : isSearching);

  // Normalize and deduplicate incoming sources by URL
  const sourcesList = useMemo<SearchSource[]>(() => {
    if (incomingSources && Array.isArray(incomingSources) && incomingSources.length > 0) {
      const seen = new Set<string>();
      const list: SearchSource[] = [];
      for (const s of incomingSources) {
        const rawUrl = s.url || "";
        if (rawUrl && seen.has(rawUrl)) continue;
        if (rawUrl) seen.add(rawUrl);
        list.push({
          id: s.id || rawUrl || String(list.length + 1),
          title: s.title || rawUrl || "Web Source",
          domain: s.domain || (rawUrl ? safeHostname(rawUrl) : "source"),
          url: rawUrl || null,
          snippet: s.snippet || null,
        });
      }
      return list;
    }
    return [];
  }, [incomingSources]);

  return (
    <div className="w-full max-w-2xl my-2 select-none">
      {/* Claude-style Dropdown Header: "Searched the web ˇ" */}
      <button
        type="button"
        onClick={() => setUserToggled(!isOpen)}
        className="flex items-center gap-1.5 text-[13.5px] text-neutral-600 dark:text-white/70 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none py-1 group bg-transparent border-0 focus:outline-none"
      >
        {isSearching ? (
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Searching the web</span>
          </span>
        ) : (
          <span>Searched the web</span>
        )}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex items-center text-neutral-400 dark:text-white/40 group-hover:text-neutral-600 dark:group-hover:text-white/70"
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>

      {/* Claude-style Dropdown Panel: [Favicon] [Title] ...... [domain.com] */}
      <AnimatePresence initial={false}>
        {isOpen && (sourcesList.length > 0 || isSearching) && (
          <motion.div
            key="claude-search-dropdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden mt-1.5 w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#16161a]/95 backdrop-blur-md shadow-lg"
          >
            <div className="py-2 px-1 divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {sourcesList.map((source, idx) => (
                <SourceRow key={source.url || idx} source={source} idx={idx} />
              ))}

              {/* While searching, show gentle pulsing indicator at bottom */}
              {isSearching && (
                <div className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-400 dark:text-white/40">
                  <Loader2 size={12} className="animate-spin text-emerald-500" />
                  <span>{sourcesList.length === 0 ? "Finding sources..." : "Reading sources..."}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {answer && (
        <div className="mt-2 text-sm text-neutral-800 dark:text-white/90 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

export default WebSearchAnimation;
