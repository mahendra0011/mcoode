import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, ChevronRight, FolderSearch, Sparkles, Cpu, Layers } from "lucide-react";
import { ToolCallCard, StepPulse } from "./mcodeUX";
import { SpinnerBlock } from "./SpinnerBlock";

export interface AgentActionSequenceProps {
  startedAt?: number;
  mode?: string;
}

/**
 * AgentActionSequence — Smart Engine Thinking & Action Sequence for ZCode.
 *
 * Implements the 4-layer animation architecture from docs/zcode-smart-engine.md:
 * - Layer 1 & 4: 80ms Unicode spinner rotation (SPIN_FRAMES: ['●', '◐', '◓', '◑', '◒'])
 * - StepPulse: CSS 1.1s emerald pulse animation
 * - Multi-phase state machine transitions:
 *   1. Phase 1 (0 - 2.2s): Thinking & Reasoning (prominent "Thinking..." + spinner + brain circuit)
 *   2. Phase 2 (2.2s - 4.8s): Architecture & Context Analysis ("Analyzing workspace & dependencies...")
 *   3. Phase 3 (4.8s+): Tool Preparation & Action Execution ("Preparing execution pipeline...")
 */
export const AgentActionSequence = ({ startedAt, mode = "agent" }: AgentActionSequenceProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const start = useRef(startedAt || Date.now());

  useEffect(() => {
    const id = setInterval(() => setElapsedMs(Date.now() - start.current), 100);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(1, Math.round(elapsedMs / 1000));

  // Progressive Smart Engine phases based on elapsed time:
  const isThinkingPhase = elapsedMs < 2200;
  const isContextPhase = elapsedMs >= 2200 && elapsedMs < 4800;
  const isExecutionPhase = elapsedMs >= 4800;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col py-1.5 w-full max-w-lg gap-2 font-sans"
    >
      {/* ── Top Header: Thinking indicator with 80ms Unicode spinner + timer ── */}
      <div className="flex items-center gap-2 text-[13px] select-none">
        <StepPulse active={true} />
        <BrainCircuit size={15} className="text-emerald-400 flex-shrink-0 animate-pulse" />
        
        <span className="font-semibold text-white/95 flex items-center gap-1.5">
          <span>Thinking</span>
          <SpinnerBlock label="" size="sm" color="emerald" active={true} />
        </span>

        <span className="text-white/40 text-xs font-mono ml-auto">
          {seconds}s
        </span>
      </div>

      {/* ── Phase 1: Pure Thinking & Reasoning (Displayed immediately on send) ── */}
      {isThinkingPhase && (
        <motion.div
          key="phase-thinking"
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 text-xs text-white/60 bg-white/[0.02] border border-white/5 px-3 py-2 rounded-xl backdrop-blur-sm"
        >
          <Sparkles size={13} className="text-emerald-400 flex-shrink-0" />
          <span>Reasoning prompt and formulating response strategy…</span>
        </motion.div>
      )}

      {/* ── Phase 2: Context & Architecture Analysis (After 2.2s) ── */}
      {isContextPhase && (
        <motion.div
          key="phase-context"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-1.5"
        >
          <div className="flex items-center gap-2 text-xs text-white/70 bg-white/[0.02] border border-white/5 px-3 py-2 rounded-xl backdrop-blur-sm">
            <FolderSearch size={13} className="text-blue-400 flex-shrink-0" />
            <span>Analyzing workspace context, file tree & dependencies…</span>
          </div>
        </motion.div>
      )}

      {/* ── Phase 3: Action Execution / Tool Preparation (After 4.8s) ── */}
      {isExecutionPhase && (
        <motion.div
          key="phase-execution"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <ToolCallCard
            type="explored"
            label="Workspace Context"
            summary="Analyzing structure & preparing tools"
            active={true}
            defaultOpen={true}
          >
            <div className="flex flex-col gap-1 text-[12px] text-white/60 font-mono">
              <div className="flex items-center gap-2">
                <Cpu size={12} className="text-emerald-400" />
                <span>Tech stack analyzed • Preparing execution plan…</span>
              </div>
            </div>
          </ToolCallCard>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AgentActionSequence;
