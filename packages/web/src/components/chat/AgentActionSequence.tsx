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
   * name / phase actually being executed). The moment this is present it
   * always wins over the client-side cycling phase below — we never
   * override real data with a fabricated one.
   */
  statusLabel?: string | null;
}

/**
 * Client-side phase cycle shown ONLY while there is no real backend
 * statusLabel yet. This exists purely to make the "gap before the first
 * real event" feel like continuous IDE activity instead of a frozen
 * "Thinking...Xs" counter — matching ZCode's always-animated feel.
 * As soon as a real statusLabel arrives, this cycle is abandoned and the
 * real label is shown instead (see render logic below).
 */
const PHASES = [
  "Thinking",
  "Planning",
  "Analyzing project",
  "Scanning workspace",
  "Reading files",
  "Searching code",
  "Inspecting dependencies",
  "Checking configuration",
  "Understanding architecture",
];

const PHASE_INTERVAL_MS = 2000;

/**
 * AgentActionSequence — main chat/agent loading indicator.
 *
 * Behavior:
 *  - While no real backend event has arrived yet, cycles through PHASES
 *    client-side every PHASE_INTERVAL_MS so the UI always feels alive
 *    (never frozen on a single static word).
 *  - The instant a real `statusLabel` is provided by the caller (forwarded
 *    from `chat:tool_call` / `chat:todo_plan`), that real label is shown
 *    immediately and the fake cycle stops — real data always wins, we
 *    never contradict or override it with a fabricated phase.
 *  - Separate real ToolCallCard / TodoPlan messages still render below
 *    this component as before (see AIChatPage.tsx `showThinkingIndicator`).
 */
export const AgentActionSequence = ({ startedAt, statusLabel }: AgentActionSequenceProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const start = useRef(startedAt || Date.now());

  useEffect(() => {
    const id = setInterval(() => setElapsedMs(Date.now() - start.current), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Only cycle while we don't have a real label to show yet.
    if (statusLabel) return;
    const id = setInterval(() => {
      setPhaseIndex((i) => (i + 1) % PHASES.length);
    }, PHASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [statusLabel]);

  const seconds = Math.max(1, Math.round(elapsedMs / 1000));
  const displayLabel = statusLabel || PHASES[phaseIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="flex items-center gap-2 py-1.5 w-full max-w-lg text-[13px] select-none font-sans"
    >
      <StepPulse active={true} />
      <BrainCircuit size={15} className="text-[var(--mcode-green,#3ecf8e)] flex-shrink-0" />

      <span className="font-semibold flex items-center gap-1.5">
        <motion.span
          key={displayLabel}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="animated-gradient-text"
        >
          {displayLabel}
        </motion.span>
        <SpinnerBlock label="" size="sm" color="emerald" active={true} />
      </span>

      <span className="text-white/40 text-xs font-mono ml-auto">{seconds}s</span>
    </motion.div>
  );
};

export default AgentActionSequence;
