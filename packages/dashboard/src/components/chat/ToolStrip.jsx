import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolCallCard } from './MessageList.jsx';
import { Wrench, X } from 'lucide-react';

/**
 * Right sidebar strip — shows live tool calls during agent mode.
 * Uses the animated ToolCallCard from MessageList for consistent styling.
 * Auto-collapses when idle.
 */
export function ToolStrip() {
  const toolCalls = useSelector((s) => s.chat.toolCalls || []);
  const messages = useSelector((s) => s.chat.messages || []);
  const isGenerating = useSelector((s) => s.chat.isGenerating);

  // Show completed tool results from messages too
  const recentTools = messages
    .filter((m) => m.kind === 'tool' && (m.status === 'done' || m.status === 'failed'))
    .slice(-5)
    .reverse();

  const hasLive = toolCalls.some((t) => t.status === 'running');

  if (toolCalls.length === 0 && recentTools.length === 0) return null;

  return (
    <motion.aside
      className="w-64 shrink-0 border-l border-mcode-border bg-mcode-panel/20 overflow-y-auto"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 256, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
    >
      <div className="p-2 font-mono text-xs text-gray-600 border-b border-mcode-border flex items-center justify-between">
        <span>TOOLS {hasLive && <span className="text-mcode-green">(running)</span>}</span>
        <Wrench className="h-3 w-3 text-gray-500" />
      </div>

      <div className="p-2 space-y-2">
        <AnimatePresence>
          {toolCalls.map((tc) => (
            <ToolCallCard key={tc.replaceKey} call={tc} />
          ))}
        </AnimatePresence>

        {/* Recent completed tools */}
        {recentTools.length > 0 && (
          <div className="border-t border-mcode-border pt-2 mt-2">
            <div className="font-mono text-[10px] text-gray-600 mb-1.5">Recent</div>
            <AnimatePresence>
              {recentTools.map((m) => (
                <motion.div
                  key={m.replaceKey}
                  className="rounded-md border border-mcode-border bg-mcode-bg/50 p-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className={`text-xs ${m.status === 'done' ? 'text-mcode-green' : 'text-mcode-red'}`}>
                      {m.status === 'done' ? '✓' : '✗'}
                    </span>
                    <span className="text-gray-300">{m.tool}</span>
                    <span className="text-gray-500 truncate max-w-[120px]" title={m.args}>
                      {m.args}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
