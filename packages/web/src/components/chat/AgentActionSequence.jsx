import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";
import { ToolCallCard, StepPulse } from "./ZCodeUX";

/**
 * AgentActionSequence — compact agent "working" indicator for the IDE chat pane.
 *
 * Combines three ZCode patterns into one cohesive block:
 * 1. StepPulse — emerald pulsing indicator for active work
 * 2. Elapsed timer — "Working for Xs" (mirrors WorkingHeader)
 * 3. ToolCallCard — "Exploring context" with collapsible animation
 *
 * Shown while isStreaming is true and no assistant message has appeared yet.
 */
export const AgentActionSequence = () => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const start = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setElapsedMs(Date.now() - start.current), 250);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(1, Math.round(elapsedMs / 1000));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col py-2 w-full max-w-lg gap-2"
    >
      {/* Header row: pulse dot + "Working for Xs" */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <StepPulse active={true} />
        <BrainCircuit size={14} style={{ color: 'var(--zc-text-dim, #8b8d98)' }} />
        <span style={{ fontWeight: 500, color: 'var(--zc-text-dim, #8b8d98)' }}>
          Working for {seconds}s
        </span>
      </div>

      {/* Collapsible ToolCallCard: "Exploring context" */}
      <ToolCallCard type="explored" label="Exploring context" summary="Analyzing project structure..." active={true} defaultOpen={true}>
        <div style={{ color: 'var(--zc-text-dim, #8b8d98)', fontSize: 12.5, fontFamily: 'var(--zc-mono)' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            Scanning workspace…
          </motion.div>
        </div>
      </ToolCallCard>
    </motion.div>
  );
};
