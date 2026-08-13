import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check, ChevronDown, Cpu } from 'lucide-react';
import { SearchResultBlock } from './SearchAnimation';

/**
 * ThinkingAccordion — minimal collapsible for tool execution display.
 * No motion animations, just simple expand/collapse.
 */
function ThinkingAccordion({ content, isStreaming }) {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef(null);

  // Set the CSS var the zcode-collapsible-up keyframe reads for its
  // close animation (mirrors --radix-collapsible-content-height).
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.setProperty(
        '--radix-collapsible-content-height',
        `${contentRef.current.scrollHeight}px`
      );
    }
  }, [isOpen, content]);

  const formattedContent = content
    .replace(/<arg_key>/g, '  ')
    .replace(/<\/arg_key>/g, ': ')
    .replace(/<arg_value>/g, '')
    .replace(/<\/arg_value>/g, '\n')
    .replace(/<tool_call>/g, '')
    .trim();

  return (
    <div className="my-3 flex flex-col border border-white/10 rounded-lg overflow-hidden bg-transparent">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-transparent hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex-1 flex items-center gap-2">
          {isStreaming ? (
            <div className="relative flex items-center justify-center w-4 h-4">
              <div className="absolute inset-0 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              <Cpu className="w-2.5 h-2.5 text-emerald-400" />
            </div>
          ) : (
            <Cpu className="w-3 h-3 text-white/50" />
          )}
          <span className={`text-xs ${isStreaming ? 'text-emerald-400' : 'text-white/60'}`}>
            {isStreaming ? 'Agent is thinking...' : 'Tool Execution'}
          </span>
        </div>
        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <div
        ref={contentRef}
        data-state={isOpen ? 'open' : 'closed'}
        data-zcode-collapsible-animate-close="true"
        className="border-t border-white/5"
        style={{ display: isOpen ? 'block' : 'none' }}
      >
        <div className="p-2.5 text-[11px] font-mono text-white/70 bg-transparent whitespace-pre-wrap break-all overflow-y-auto max-h-[200px]">
          {formattedContent}
        </div>
      </div>
    </div>
  );
}

/**
 * parseToolCalls — extract  tool execution blocks from text
 */
function parseToolCalls(text) {
  const regex = /<tool_call>([\s\S]*?)(?:<\/tool_call>|$)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      let rawText = text.slice(lastIndex, match.index);
      rawText = rawText.replace(/<\/tool_call>/g, '');
      if (rawText.trim()) parts.push({ type: 'text', content: rawText });
    }
    parts.push({ type: 'tool', content: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    let rawText = text.slice(lastIndex);
    rawText = rawText.replace(/<\/tool_call>/g, '');
    if (rawText.trim()) parts.push({ type: 'text', content: rawText });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text.replace(/<\/tool_call>/g, '') }];
}

/**
 * MessageContent — renders messages as Markdown with syntax highlighting.
 * No framer-motion for internal elements, just simple rendering.
 */
export function MessageContent({ msg, text, size = 'md', isStreaming = false, children }) {
  const [copied, setCopied] = useState(false);
  const textSize = size === 'sm' ? 'text-[13px]' : 'text-[15px]';

  const components = useMemo(() => ({
    code({ inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = inline || !match;

      if (isInline) {
        return (
          <code
            className={`px-1.5 py-0.5 rounded bg-black/30 text-emerald-300 font-mono text-[0.9em] whitespace-pre-wrap`}
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <div className="relative my-3 group">
          <pre
            className={`text-sm rounded-lg bg-[#121212] border border-white/5 overflow-hidden`}
          >
            <div className="overflow-x-auto max-w-[calc(100vw-4rem)]">
              <code className={className} {...props}>
                {children}
              </code>
            </div>
            <button
              type="button"
              onClick={() => {
                const codeText = String(children).replace(/\n$/, '');
                navigator.clipboard.writeText(codeText).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-white/10 text-white/50 hover:text-white"
              title="Copy code"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </pre>
        </div>
      );
    },
    p({ children, ...props }) {
      return <p className="mb-3 last:mb-0 leading-relaxed" {...props}>{children}</p>;
    },
    h1({ children, ...props }) {
      return <h1 className="text-xl font-bold mb-3 mt-4 text-white" {...props}>{children}</h1>;
    },
    h2({ children, ...props }) {
      return <h2 className="text-lg font-bold mb-2 mt-4 text-white/95" {...props}>{children}</h2>;
    },
    h3({ children, ...props }) {
      return <h3 className="text-md font-semibold mb-2 mt-3 text-white/90" {...props}>{children}</h3>;
    },
    h4({ children, ...props }) {
      return <h4 className="text-sm font-semibold mb-1 mt-3 text-white/80" {...props}>{children}</h4>;
    },
    ul({ children, ...props }) {
      return <ul className="mb-3 pl-5 list-disc space-y-0.5" {...props}>{children}</ul>;
    },
    ol({ children, ...props }) {
      return <ol className="mb-3 pl-5 list-decimal space-y-0.5" {...props}>{children}</ol>;
    },
    li({ children, ...props }) {
      return <li className="text-white/85 leading-relaxed" {...props}>{children}</li>;
    },
    blockquote({ children, ...props }) {
      return (
        <blockquote
          className="border-l-2 border-emerald-400/30 pl-3 py-1 my-3 italic text-white/70 bg-emerald-500/5 rounded-r"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    table({ children, ...props }) {
      return (
        <div className="overflow-x-auto my-3 rounded border border-white/5">
          <table className="border-collapse w-full text-sm" {...props}>
            {children}
          </table>
        </div>
      );
    },
    th({ children, ...props }) {
      return <th className="border border-white/10 px-2 py-1.5 text-left font-semibold text-white/80 bg-[#1a1a1a]" {...props}>{children}</th>;
    },
    td({ children, ...props }) {
      return <td className="border border-white/10 px-2 py-1.5 text-white/85" {...props}>{children}</td>;
    },
    a({ href, children, ...props }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline transition-colors"
          {...props}
        >
          {children}
        </a>
      );
    },
    hr({ ...props }) {
      return <hr className="border-t border-white/10 my-3" {...props} />;
    },
  }), [copied, isStreaming]);

  const parsedParts = useMemo(() => parseToolCalls(text || ''), [text]);

  // Handle search results - render ZCode-style SearchResultBlock
  if (msg?.searchResults) {
    return (
      <SearchResultBlock
        query={msg.searchResults.query || ''}
        phase={msg.searchResults.phase || 'done'}
        sources={msg.searchResults.results || []}
        answer={msg.searchResults.answer || ''}
      />
    );
  }

  return (
    <div className={`prose prose-invert max-w-none ${textSize} font-sans`}>
      {parsedParts.map((part, index) => {
        if (part.type === 'tool') {
          // The model's raw <tool_call> declaration is an internal
          // implementation detail — the actual tool-result message
          // (rendered via StepCard/SearchResultBlock elsewhere in the
          // chat) already shows the user what happened. Rendering both
          // produced a duplicate "Tool Execution" box on top of the real
          // card. Suppress the raw declaration entirely.
          return null;
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