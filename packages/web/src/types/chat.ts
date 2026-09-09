import type { ReactNode } from "react";

/* ---------------------------------------------------------------------------
 * Shared chat / animation types for the mcode web frontend.
 *
 * These describe the message + search/fetch payload shapes that flow from the
 * backend socket → chatSlice reducer → chat / animation components. They are
 * consumed by the converted `.tsx` components; legacy `.jsx` files keep working
 * untyped until they are migrated.
 * ------------------------------------------------------------------------- */

/** Engine/chat mode carried by the Redux store. */
export type Mode = "chat" | "agent";

/** UI tab key used by AIChatPage's segmented control. */
export type ActiveTab = "Chat" | "AI Code Assistant" | "AI Code Editor";

/** Size variant for message bubbles. */
export type MsgSize = "sm" | "md";

/** Lifecycle status of a chat message. */
export type MsgStatus = "idle" | "running" | "done" | "failed";

/** Role of a chat message. */
export type Role = "user" | "assistant" | (string & {});

/** Tool identifier surfaced in a message. */
export type Tool = "web_search" | "web_fetch" | (string & {});

/** Phase of a web-search / web-fetch sequence. */
export type SearchPhase = "searching" | "reading" | "answering" | "done";

/** Status bubble shown by the search / fetch animations. */
export type SearchStatus = "idle" | "searching" | "done";

/** Status of a single web-fetch row. */
export type FetchStatus = "idle" | "fetching" | "done";

/** A web-search result source. */
export interface SearchSource {
  id?: string | number;
  title: string;
  domain: string;
  url?: string | null;
  snippet?: string | null;
}

/** Payload emitted by the backend for web-search / web-fetch (`searchResults`). */
export interface SearchResultsPayload {
  query?: string;
  phase?: SearchPhase;
  results?: SearchSource[];
  answer?: string;
}

/** A single URL being fetched in the web-fetch animation. */
export interface FetchItem {
  id: string | number;
  url: string;
  status: "fetching" | "done";
  summary: string | null;
}

/** Loose arguments attached to a tool message. */
export interface ToolArgs {
  query?: string;
  url?: string;
  [k: string]: unknown;
}

/** Chat message shape shared across the chat + animation components. */
export interface ChatMessage {
  id?: string | number;
  role?: Role;
  kind?: "stream" | "tool" | "message" | (string & {});
  text?: string;
  tool?: Tool;
  status?: MsgStatus;
  block?: string;
  /** Blocks list attached to a stream/tool message. */
  blocks?: unknown[];
  args?: ToolArgs;
  output?: string;
  lines?: string[];
  path?: string;
  searchResults?: SearchResultsPayload;
  /** Command text for run_shell / run_tests tool messages. */
  command?: string;
  /** Whether a write_file tool created a new file (vs edited an existing one). */
  created?: boolean;
  /** Diff line metadata for edit_file tool messages. */
  diffLines?: unknown[];
  /** Error message text for a failed tool message. */
  error?: string | null;
  /** Display title for a tool / search message. */
  title?: string | null;
  /** Stable key used to replace a streaming/tool message in place. */
  replaceKey?: string | null;
}

export interface MessageContentProps {
  msg?: ChatMessage;
  text?: string;
  size?: MsgSize;
  isStreaming?: boolean;
  children?: ReactNode;
}

export interface ChatMessageProps {
  msg: ChatMessage;
  idx?: number;
  size?: MsgSize;
  isStreaming?: boolean;
  undo?: (msg: ChatMessage) => void;
  isNormalChat?: boolean;
  showAvatar?: boolean;
}

export interface IDEActivitySidebarProps {
  active?: string;
  onSelectTab?: (id: string) => void;
  onSourceControl?: () => void;
  branch?: string;
}
