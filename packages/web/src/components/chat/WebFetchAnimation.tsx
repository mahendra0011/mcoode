"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronDown } from "lucide-react";
import type { ChatMessage, FetchItem, FetchStatus } from "../../types/chat";

function safeHostname(url: string | null | undefined): string {
  try {
    return new URL(url as string).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "").slice(0, 30);
  }
}

interface WebFetchAnimationProps {
  msg?: ChatMessage;
  url?: string;
  status?: FetchStatus | "fetching" | "done" | "idle";
  items?: FetchItem[];
  defaultExpanded?: boolean;
}

/**
 * Claude-style Web Fetch Component:
 * Matches the exact same look & feel as Claude Web Search (Image 1):
 * - Clean "Searched the web ˇ" / "Reading web page... ˇ" toggle
 * - Dropdown containing the fetched site with favicon + title + domain
 * - Auto-collapses when complete
 */
export function WebFetchAnimation({
  msg,
  url: directUrl,
  status: controlledStatus,
  defaultExpanded = false,
}: WebFetchAnimationProps) {
  const rawArgs = msg?.args as any;
  const targetUrl: string = String(directUrl || rawArgs?.url || rawArgs?.file || (typeof rawArgs === 'string' ? rawArgs : '') || "");
  const isFetching = controlledStatus === "fetching" || msg?.status === "running";

  const domain = useMemo(() => safeHostname(targetUrl), [targetUrl]);
  const title = msg?.title || domain || "Web Page";

  const [imgError, setImgError] = useState(false);
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const isOpen = userToggled !== null ? userToggled : (defaultExpanded || isFetching);

  if (!targetUrl) return null;

  return (
    <div className="w-full max-w-2xl my-2 select-none">
      <button
        type="button"
        onClick={() => setUserToggled(!isOpen)}
        className="flex items-center gap-1.5 text-[13.5px] text-neutral-600 dark:text-white/70 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none py-1 group bg-transparent border-0 focus:outline-none"
      >
        {isFetching ? (
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="browser-use-operation-breathe">Reading {domain}</span>
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

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="claude-fetch-dropdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden mt-1.5 w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#16161a]/95 backdrop-blur-md shadow-lg"
          >
            <div className="py-2 px-1">
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors group no-underline text-inherit cursor-pointer"
              >
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
                    {title}
                  </span>
                </div>
                <span className="text-xs font-mono text-neutral-400 dark:text-white/40 group-hover:text-neutral-600 dark:group-hover:text-white/70 shrink-0">
                  {domain}
                </span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WebFetchAnimation;
