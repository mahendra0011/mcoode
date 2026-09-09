"use client";
import { useState, useEffect } from "react";
import { WebSearchAnimation } from "./WebSearchAnimation";
import { WebFetchAnimation } from "./WebFetchAnimation";
import type { SearchPhase, SearchSource, ChatMessage } from "../../types/chat";

export { WebSearchAnimation, WebFetchAnimation };

interface StreamingAnswerProps {
  text?: string;
  wordsPerTick?: number;
  tickMs?: number;
}

/**
 * StreamingAnswer — word-by-word reveal (Claude/Perplexity typing feel)
 */
export function StreamingAnswer({ text, wordsPerTick = 2, tickMs = 35 }: StreamingAnswerProps) {
  const words = text ? text.split(" ") : [];
  const [count, setCount] = useState<number>(0);

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
    <p className="text-[14.5px] leading-relaxed text-neutral-800 dark:text-neutral-200">
      {words.slice(0, count).join(" ")}
      {count < words.length && (
        <span className="pulse-caret ml-0.5 text-emerald-500">
          █
        </span>
      )}
    </p>
  );
}

interface SearchResultBlockProps {
  query?: string;
  phase?: SearchPhase;
  sources?: SearchSource[];
  answer?: string;
  tool?: string;
  type?: string;
  msg?: ChatMessage;
}

/**
 * SearchResultBlock — Claude-style web search & web fetch card
 * Replaces the old search animation with the new Framer Motion components.
 */
export function SearchResultBlock({ query, phase, sources = [], answer, tool, type, msg }: SearchResultBlockProps) {
  if (tool === "web_fetch" || type === "fetch" || msg?.tool === "web_fetch") {
    return <WebFetchAnimation msg={msg} status={phase === "searching" ? "fetching" : "done"} />;
  }

  const status = phase === "answering" || phase === "done" ? "done" : "searching";

  return (
    <WebSearchAnimation
      query={query}
      status={status}
      sources={sources}
      answer={answer}
    />
  );
}

export default WebSearchAnimation;
