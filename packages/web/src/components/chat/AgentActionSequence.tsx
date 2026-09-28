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
 * AgentActionSequence — main chat/agent loading indicator.
 *
 * Adheres strictly to the single source of truth rule (Spec §1):
 * Never fabricates phases on a local timer. Displays "Thinking" with animated
 * gradient text (or a real backend statusLabel when supplied), StepPulse dot,
 * BrainCircuit icon, 80ms SpinnerBlock, and elapsed timer.
 */
export const AgentActionSequence = ({ startedAt, statusLabel }: AgentActionSequenceProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const start = useRef(startedAt || Date.now());

  useEffect(() => {
    const id = setInterval(() => setElapsedMs(Date.now() - start.current), 100);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(1, Math.round(elapsedMs / 1000));
  const displayLabel = statusLabel || "Thinking";

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
