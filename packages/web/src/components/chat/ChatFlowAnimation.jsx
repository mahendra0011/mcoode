import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, BrainCircuit, Globe, Edit3, Save, CheckCircle2 } from 'lucide-react';

/**
 * ChatFlowAnimation — Perplexity/Claude-style step indicator for Chat mode.
 *
 * Shows sequential steps ONLY while the AI is processing:
 *   1. Assembling system context  (instant → done)          ~600ms
 *   2. Understanding user intent  (active until tools start) ~1500ms
 *   3. Searching the web          (only if web_search tool)   ~3000ms
 *   4. Drafting response           (tools done, no text yet) ~4500ms
 *   5. Updating memory (Save)      (response drafted)
 *
 * Each step animates in sequentially with staggered delays matching the
 * documented ZCode timing. Steps that are "active" have a rotating dashed
 * border + bouncing dots; completed steps show a check.
 *
 * Self-guards: returns null if any assistant reply already exists in the
 * current turn, so even if the parent condition has a race issue, this
 * component will never persist after a response starts appearing.
 */
export function ChatFlowAnimation({ messages = [] }) {
  // Find the last user message — everything after it is the current turn
  const lastUserIdx = messages.findLastIndex(m => m.role === 'user');
  const turnMessages = lastUserIdx >= 0 ? messages.slice(lastUserIdx + 1) : [];

  // ── SAFETY: If ANY assistant reply exists in this turn, hide completely ──
  const hasAssistantReply = turnMessages.some(
    m => m.role === 'assistant' || m.kind === 'stream'
  );
  if (hasAssistantReply) return null;

  // If there are no messages at all, nothing to show
  if (messages.length === 0) return null;

  const activeTools = turnMessages.filter(m => m.kind === 'tool' && m.status === 'running');
  const doneTools = turnMessages.filter(m => m.kind === 'tool' && m.status === 'done');
  const hasToolActivity = activeTools.length > 0 || doneTools.length > 0;

  const steps = [];

  // Step 1: Context — always done (instantaneous, ~600ms in reference timing)
  steps.push({
    id: 'context',
    label: 'Assembling system context',
    icon: Database,
    status: 'done',
    delay: 0
  });

  // Step 2: Intent — done once tools start, otherwise active (~1500ms timing)
  steps.push({
    id: 'intent',
    label: 'Understanding user intent',
    icon: BrainCircuit,
    status: hasToolActivity ? 'done' : 'active',
    delay: 0.6
  });

  // Step 3: Tool execution (ONLY if backend actually triggered a tool, ~3000ms)
  let toolStep = null;
  if (hasToolActivity) {
    const isToolActive = activeTools.length > 0;
    let toolLabel = 'Executing tools';
    let ToolIcon = Globe;

    // Perplexity-style specific labels
    const allTools = [...activeTools, ...doneTools];
    if (allTools.some(t => t.tool === 'web_search')) {
      toolLabel = 'Searching the web';
    } else if (allTools.some(t => t.tool === 'memory_write' || t.tool === 'memory_read')) {
      toolLabel = 'Accessing memory';
      ToolIcon = Save;
    }

    toolStep = {
      id: 'tools',
      label: toolLabel,
      icon: ToolIcon,
      status: isToolActive ? 'active' : 'done',
      delay: 1.5
    };
    steps.push(toolStep);

    // Step 4: Drafting — only when tools are done (~4500ms)
    if (!isToolActive) {
      steps.push({
        id: 'drafting',
        label: 'Drafting response',
        icon: Edit3,
        status: 'active',
        delay: 3
      });

      // Step 5: Updating memory — after response is drafted (final step)
      steps.push({
        id: 'memory',
        label: 'Updating memory',
        icon: Save,
        status: 'active',
        delay: 4.5
      });
    }
  }

  return (
    <div className="flex flex-col gap-2 py-1 w-full max-w-lg">
      {steps.map((step) => {
        const isActive = step.status === 'active';
        const Icon = step.icon;

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10, height: 0 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            transition={{
              duration: 0.25,
              ease: [0.4, 0, 0.2, 1],
              delay: step.delay
            }}
            className="flex items-center gap-2.5"
          >
            {/* Icon */}
            <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
              {isActive ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 border-[1.5px] border-dashed border-emerald-500/40 rounded-full"
                  />
                  <Icon className="w-3 h-3 text-emerald-400" />
                </>
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-white/15" />
              )}
            </div>

            {/* Label + bouncing dots */}
            <span
              className={`text-[13px] font-medium ${
                isActive ? 'text-white/80' : 'text-white/25'
              }`}
            >
              {step.label}
            </span>
            {isActive && (
              <span className="flex items-end gap-[2px] ml-0.5 mb-[1px]">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] h-[3px] bg-emerald-400 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                    transition={{
                      duration: 0.55,
                      repeat: Infinity,
                      delay: i * 0.12,
                    }}
                  />
                ))}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
