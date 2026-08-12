import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check } from 'lucide-react';

/**
 * MessageContent — renders chat messages as Markdown with syntax-highlighted
 * code blocks. Built for the "Claude-like" chat structure the user asked for.
 *
 * Styling is intentionally framework-agnostic (plain CSS classes) so the same
 * component works in both the full-screen Chat tab and the narrow AI
 * Assistance pane.
 *
 * Props:
 *   text         — the message text (Markdown string)
 *   size         — 'sm' | 'md'  (font sizing for compact vs chat views)
 *   isStreaming  — when true, appends a blinking cursor for the last message
 *   children     — optional trailing node (e.g. the streaming cursor span)
 */
export function MessageContent({ text, size = 'md', isStreaming = false, children }) {
  const [copied, setCopied] = useState(false);

  const textSize = size === 'sm' ? 'text-[13px]' : 'text-[15px]';

  // Memoize the renderers so React doesn't recreate them on every render.
  const components = useMemo(() => ({
    // Code blocks with syntax highlighting + copy button
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

      // Block-level code — render with highlight.js + copy button
      return (
        <div className="relative my-3 group">
          <pre
            className={`text-sm rounded-lg bg-[#121212] border border-white/5 overflow-hidden ${
              isStreaming ? 'rehype-highlight-streaming' : ''
            }`}
          >
            <div className="overflow-x-auto max-w-[calc(100vw-4rem)]">
              <code className={className} {...props}>
                {children}
              </code>
            </div>
            {/* Copy button appears on hover */}
            <button
              type="button"
              onClick={() => {
                const codeText = String(children).replace(/\n$/, '');
                navigator.clipboard.writeText(codeText).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-white/10 text-white/50 hover:text-white"
              title="Copy code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </pre>
        </div>
      );
    },
    // Paragraphs
    p({ children, ...props }) {
      return <p className="mb-3 last:mb-0 leading-relaxed" {...props}>{children}</p>;
    },
    // Headers
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
    // Lists
    ul({ children, ...props }) {
      return <ul className="mb-3 pl-5 list-disc space-y-0.5" {...props}>{children}</ul>;
    },
    ol({ children, ...props }) {
      return <ol className="mb-3 pl-5 list-decimal space-y-0.5" {...props}>{children}</ol>;
    },
    li({ children, ...props }) {
      return <li className="text-white/85 leading-relaxed" {...props}>{children}</li>;
    },
    // Blockquote
    blockquote({ children, ...props }) {
      return (
        <blockquote
          className="border-l-2 border-emerald-400/30 pl-4 py-1 my-3 italic text-white/70 bg-emerald-500/5 rounded-r-lg"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    // Tables
    table({ children, ...props }) {
      return (
        <div className="overflow-x-auto my-3 rounded-lg border border-white/5">
          <table className="border-collapse w-full text-sm" {...props}>
            {children}
          </table>
        </div>
      );
    },
    th({ children, ...props }) {
      return <th className="border border-white/10 px-3 py-2 text-left font-semibold text-white/80 bg-[#1a1a1a]" {...props}>{children}</th>;
    },
    td({ children, ...props }) {
      return <td className="border border-white/10 px-3 py-2 text-white/85" {...props}>{children}</td>;
    },
    // Links
    a({ href, children, ...props }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-400/30 hover:decoration-emerald-300 transition-colors"
          {...props}
        >
          {children}
        </a>
      );
    },
    // Horizontal rule
    hr({ ...props }) {
      return <hr className="border-t border-white/10 my-4" {...props} />;
    },
  }), [copied, isStreaming]);

  return (
    <div className={`prose prose-invert max-w-none ${textSize} font-sans`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, {
            // Use a dark-friendly highlight.js theme; we'll override via CSS
            // to match the app's dark palette
          }],
        ]}
        components={components}
      >
        {text}
      </ReactMarkdown>
      {children}
    </div>
  );
}
