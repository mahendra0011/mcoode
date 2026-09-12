import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, ChevronDown, Cpu, Terminal, Wrench } from "lucide-react";
import { WebSearchAnimation, WebFetchAnimation } from "./SearchAnimation";
import type { ChatMessage, MessageContentProps } from "../../types/chat";

/** Clean raw tool tags and tool action JSON from user-facing text */
function cleanProse(str: string): string {
  if (!str) return "";
  let out = str
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
    .replace(/<tool_call>[\s\S]*$/gi, "")
    .replace(/<arg_key>[\s\S]*?<\/arg_key>/gi, "")
    .replace(/<arg_value>[\s\S]*?<\/arg_value>/gi, "")
    .replace(/<\/?tool_call[^>]*>/gi, "")
    .replace(/<\/?arg_[^>]*>/gi, "")
    .replace(/```(?:mcode-action|action|tool_call)[\s\S]*?```/gi, "")
    .replace(/```(?:mcode-action|action|tool_call)[\s\S]*$/gi, "")
    .replace(/```(?:json)?\s*\{[\s\S]*?"(?:tool|path|write_file|read_file|edit_file|run_shell)"[\s\S]*?\}\s*```/gi, "")
    .replace(/```(?:json)?\s*\{[\s\S]*?"(?:tool|path|write_file|read_file|edit_file|run_shell)"[\s\S]*$/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // If the entire text or trailing text is a raw JSON tool object like {"path":"...","content":"..."}
  const trimmed = out.trim();
  if (trimmed.startsWith('{') && (trimmed.endsWith('}') || trimmed.includes('"content"'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.path || parsed.tool || parsed.write_file) {
        return "";
      }
    } catch {
      // If it looks like a JSON tool invocation that failed JSON.parse because it's incomplete
      if (/^\s*\{\s*"(?:path|tool|write_file|read_file)"/i.test(trimmed)) {
        return "";
      }
    }
  }

  // Remove any standalone JSON tool block from the end of the text
  out = out.replace(/\{\s*"(?:path|tool|write_file|read_file|edit_file|run_shell)"\s*:[\s\S]*?\}\s*$/g, "").trim();

  return out;
}

interface ParsedPart {
  type: "text" | "tool";
  content: string;
  toolName?: string;
  query?: string;
  url?: string;
}

/**
 * parseToolCalls — extract tool execution blocks from text.
 * Web search and fetch are extracted and rendered via Claude-style animation cards.
 * Any other tool is rendered cleanly with no raw XML leakage.
 */
function parseToolCalls(text: string): ParsedPart[] {
  if (!text) return [];

  const parts: ParsedPart[] = [];
  const toolCallRegex = /<tool_call>([\s\S]*?)(?:<\/tool_call>|$)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = toolCallRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const prose = cleanProse(text.slice(lastIndex, match.index));
      if (prose) parts.push({ type: "text", content: prose });
    }

    const body = match[1].trim();
    // Tool name
    const toolMatch = body.match(/^([\w_-]+)/);
    const toolName = toolMatch ? toolMatch[1].toLowerCase() : "tool";

    let query = "";
    let url = "";

    const qMatch = /<arg_value>([\s\S]*?)<\/arg_value>/i.exec(body) || /query[:\s]+([^\n<]+)/i.exec(body);
    if (toolName === "web_search" || qMatch) {
      query = qMatch ? qMatch[1].replace(/<[^>]*>/g, "").trim() : body.replace(/<[^>]*>/g, "").trim();
    }
    const uMatch = /url[:\s]+([^\n<]+)/i.exec(body) || /<arg_value>([\s\S]*?)<\/arg_value>/i.exec(body);
    if (toolName === "web_fetch" || uMatch) {
      url = uMatch ? uMatch[1].replace(/<[^>]*>/g, "").trim() : body.replace(/<[^>]*>/g, "").trim();
    }

    parts.push({
      type: "tool",
      content: body,
      toolName,
      query,
      url,
    });
    lastIndex = toolCallRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const prose = cleanProse(text.slice(lastIndex));
    if (prose) parts.push({ type: "text", content: prose });
  }

  if (parts.length > 0) return parts;
  const clean = cleanProse(text);
  return clean ? [{ type: "text", content: clean }] : [];
}

/** Clean accordion for general development tools (shell, files, etc.) */
function ToolCallAccordion({ content, toolName, isStreaming }: { content: string; toolName?: string; isStreaming: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  const cleanContent = content
    .replace(/<arg_key>/g, "  ")
    .replace(/<\/arg_key>/g, ": ")
    .replace(/<arg_value>/g, "")
    .replace(/<\/arg_value>/g, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();

  const title = toolName ? `Tool: ${toolName}` : "Tool Execution";

  return (
    <div className="my-2.5 flex flex-col border border-white/10 rounded-xl overflow-hidden bg-[#141419]/60 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2 bg-transparent hover:bg-white/[0.04] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 flex items-center justify-center text-emerald-400"
            >
              <Cpu size={13} />
            </motion.div>
          ) : (
            <Wrench size={13} className="text-white/50" />
          )}
          <span className="text-xs text-white/80 font-mono font-medium">{title}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={13} className="text-white/40" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/[0.06] p-2.5 text-[11px] text-white/70 font-mono overflow-y-auto max-h-[160px] whitespace-pre-wrap"
          >
            {cleanContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * MessageContent — renders messages as Markdown with syntax highlighting.
 * Uses Claude and Perplexity style web search/fetch widgets and cleans all raw tags.
 */
export function MessageContent({ msg, text, size = "md", isStreaming = false, children }: MessageContentProps) {
  const [copied, setCopied] = useState(false);
  const textSize = size === "sm" ? "text-[13px]" : "text-[15px]";

  const components = useMemo<Components>(
    () => ({
      code: ({ inline, className, children: codeChildren, ...props }: React.ComponentProps<"code"> & { inline?: boolean }) => {
        const match = /language-(\w+)/.exec(className || "");
        const isInline = inline || !match;

        if (isInline) {
          return (
            <code
              className="px-1.5 py-0.5 rounded bg-white/[0.06] text-emerald-300 font-mono text-[0.88em] whitespace-pre-wrap"
              {...props}
            >
              {codeChildren}
            </code>
          );
        }

        return (
          <div className="relative my-3 group">
            <pre className="text-sm rounded-xl bg-[#111116] border border-white/10 overflow-hidden shadow-lg">
              <div className="overflow-x-auto max-w-[calc(100vw-4rem)] p-3">
                <code className={className} {...props}>
                  {codeChildren}
                </code>
              </div>
            </pre>
            <button
              onClick={() => {
                const codeStr = String(codeChildren || "");
                navigator.clipboard.writeText(codeStr);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white backdrop-blur-md"
              title="Copy code"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        );
      },
      p: ({ children: c, ...props }) => (
        <p className="mb-3.5 leading-relaxed text-white/90 last:mb-0" {...props}>
          {c}
        </p>
      ),
      ul: ({ children: c, ...props }) => (
        <ul className="list-disc pl-5 mb-3.5 space-y-1.5 text-white/90" {...props}>
          {c}
        </ul>
      ),
      ol: ({ children: c, ...props }) => (
        <ol className="list-decimal pl-5 mb-3.5 space-y-1.5 text-white/90" {...props}>
          {c}
        </ol>
      ),
      li: ({ children: c, ...props }) => (
        <li className="leading-relaxed" {...props}>
          {c}
        </li>
      ),
      h1: ({ children: c, ...props }) => (
        <h1 className="text-xl font-semibold text-white mt-4 mb-2.5 tracking-tight" {...props}>
          {c}
        </h1>
      ),
      h2: ({ children: c, ...props }) => (
        <h2 className="text-lg font-semibold text-white mt-3.5 mb-2 tracking-tight" {...props}>
          {c}
        </h2>
      ),
      h3: ({ children: c, ...props }) => (
        <h3 className="text-base font-semibold text-white mt-3 mb-1.5 tracking-tight" {...props}>
          {c}
        </h3>
      ),
      blockquote: ({ children: c, ...props }) => (
        <blockquote
          className="border-l-2 border-emerald-500/50 pl-3.5 italic text-white/70 my-3"
          {...props}
        >
          {c}
        </blockquote>
      ),
      a: ({ href, children: c, ...props }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
          {...props}
        >
          {c}
        </a>
      ),
      hr: ({ ...props }) => <hr className="border-t border-white/10 my-4" {...props} />,
    }),
    [copied]
  );

  const parsedParts = useMemo(() => parseToolCalls(text || ""), [text]);

  // Handle direct standalone web fetch tool message
  if (msg?.kind === "tool" && msg?.tool === "web_fetch") {
    return <WebFetchAnimation msg={msg} />;
  }

  // Handle direct standalone search results message
  if (msg?.kind === "tool" && (msg?.searchResults || msg?.tool === "web_search")) {
    const searchResults = msg.searchResults || {};
    const phase = searchResults.phase || (msg.status === "running" ? "searching" : "done");
    return (
      <WebSearchAnimation
        query={searchResults.query || msg.args?.query || ""}
        status={phase as any}
        sources={searchResults.results || []}
        answer={searchResults.answer || ""}
      />
    );
  }

  if (parsedParts.length === 0 && !children) {
    return null;
  }

  return (
    <div className={`prose prose-invert max-w-none ${textSize} font-sans`}>
      {parsedParts.map((part, index) => {
        if (part.type === "tool") {
          // Web search and web fetch are already consolidated into the single
          // top-level WebSearchAnimation component for this assistant turn.
          // Suppress inline duplicate components from appearing in the markdown body.
          if (part.toolName === "web_search" || part.toolName === "web_fetch" || part.query || part.url) {
            return null;
          }
          return (
            <ToolCallAccordion
              key={index}
              content={part.content}
              toolName={part.toolName}
              isStreaming={isStreaming}
            />
          );
        }
        return (
          <ReactMarkdown
            key={index}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeHighlight, {}]]}
            components={components}
          >
            {part.content}
          </ReactMarkdown>
        );
      })}
      {children}
    </div>
  );
}

export default MessageContent;
