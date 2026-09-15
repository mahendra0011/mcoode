import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";
import { StepPulse } from "./mcodeUX";
import { SpinnerBlock } from "./SpinnerBlock";

export interface AgentActionSequenceProps {
  startedAt?: number;
  mode?: string;
  /**
   * Optional real-status label coming from the backend (e.g. current tool
   * name / phase actually being executed). When absent, we show a plain
   * "Thinking" state — we never fabricate a phase we can't verify.
   */
  statusLabel?: string | null;
}

/**
 * AgentActionSequence — minimal "Thinking…" indicator.
 *
 * IMPORTANT: this component intentionally does NOT invent fake progress
 * phases ("Analyzing workspace…", "Preparing execution pipeline…") on a
 * hardcoded timer. Real backend progress (tool calls, search, file reads,
 * todo plans) is already streamed via `chat:tool_call` / `chat:todo_plan`
 * and rendered as separate ToolCallCard / TodoPlan messages in the chat
 * list above this component (see AIChatPage.tsx `showThinkingIndicator`).
 *
 * This indicator only fills the gap *before* the first real event arrives,
 * so it must never claim to know what the model/backend is doing — it just
 * shows elapsed time + a spinner, optionally echoing a real `statusLabel`
 * if the caller has one (e.g. "Reading file…" forwarded from the latest
 * chat:tool_call). If no real label is available, it stays neutral.
 */
export const AgentActionSequence = ({ startedAt, statusLabel }: AgentActionSequenceProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const start = useRef(startedAt || Date.now());

  useEffect(() => {
    const id = setInterval(() => setElapsedMs(Date.now() - start.current), 100);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(1, Math.round(elapsedMs / 1000));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="flex items-center gap-2 py-1.5 w-full max-w-lg text-[13px] select-none font-sans"
    >
      <StepPulse active={true} />
      <BrainCircuit size={15} className="text-emerald-400 flex-shrink-0" />

      <span className="font-semibold text-white/95 flex items-center gap-1.5">
        <span>{statusLabel || "Thinking"}</span>
        <SpinnerBlock label="" size="sm" color="emerald" active={true} />
      </span>

      <span className="text-white/40 text-xs font-mono ml-auto">{seconds}s</span>
    </motion.div>
  );
};

export default AgentActionSequence;
