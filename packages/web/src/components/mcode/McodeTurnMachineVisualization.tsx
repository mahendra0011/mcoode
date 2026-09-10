import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Activity, GitBranch, Play, Pause, ChevronRight,
  Zap, Terminal, Send, Loader2, CheckCircle2, AlertCircle,
  MousePointerClick, Workflow
} from 'lucide-react';

/**
 * mcode Turn Machine — 10-phase agent protocol visualization.
 *
 * Mirrors the `Si` / `TurnMachineImpl` from the mcode CLI exactly:
 *   Idle → ProcessingInput → AwaitingModelResponse → Streaming
 *     → SchedulingTools → ExecutingTools → AggregatingResults
 *       (loop back to AwaitingModelResponse | schedule new | Completing | Error)
 *
 * Shows the live phase, elapsed time, transition history, and an
 * interactive flow diagram with Framer Motion animations matching
 * mcode's [0.4, 0, 0.2, 1] easing and spring (stiffness:500, damping:20).
 */

export type TurnPhase =
  | 'idle'
  | 'processing_input'
  | 'awaiting_model_response'
  | 'streaming'
  | 'scheduling_tools'
  | 'executing_tools'
  | 'aggregating_results'
  | 'awaiting_permission'
  | 'completing'
  | 'error';

export interface TurnTransition {
  from: TurnPhase;
  to: TurnPhase;
  timestamp: number;
  durationMs: number;
}

export interface SubagentInfo {
  todoId: string;
  domain?: string;
  status: string;
  message?: string;
  progress?: number;
  model?: string;
  title?: string;
}

export interface WaveInfo {
  wave: number;
  total: number;
  completed: number;
  status: string;
  subagentIds?: string[];
}

export interface TurnMachineState {
  currentPhase: TurnPhase;
  phaseStartedAt: number;
  transitions: TurnTransition[];
  turnNumber: number;
  traceId: string;
  input?: string;
  toolCalls?: number;
  toolResults?: number;
  waves?: WaveInfo[];
  subagents?: Record<string, SubagentInfo>;
}

const PHASES: Array<{
  id: TurnPhase;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  duration?: string;
}> = [
  {
    id: 'idle',
    label: 'Idle',
    description: 'Waiting for user input',
    icon: MousePointerClick,
    color: '#6b7280',
  },
  {
    id: 'processing_input',
    label: 'Processing Input',
    description: 'Analyzing prompt and assembling context',
    icon: Workflow,
    color: '#3b82f6',
    duration: '~50ms',
  },
  {
    id: 'awaiting_model_response',
    label: 'Awaiting Model',
    description: 'Request sent to model provider',
    icon: Send,
    color: '#8b5cf6',
  },
  {
    id: 'streaming',
    label: 'Streaming',
    description: 'Receiving model output token-by-token',
    icon: Activity,
    color: '#10b981',
  },
  {
    id: 'scheduling_tools',
    label: 'Scheduling Tools',
    description: 'Planning tool calls from model response',
    icon: GitBranch,
    color: '#f59e0b',
  },
  {
    id: 'executing_tools',
    label: 'Executing Tools',
    description: 'Running tools (shell, file, web search)',
    icon: Terminal,
    color: '#f97316',
  },
  {
    id: 'aggregating_results',
    label: 'Aggregating Results',
    description: 'Collecting and merging all tool outputs',
    icon: Zap,
    color: '#06b6d4',
  },
  {
    id: 'awaiting_permission',
    label: 'Awaiting Permission',
    description: 'User approval required for tool action',
    icon: MousePointerClick,
    color: '#eab308',
  },
  {
    id: 'completing',
    label: 'Completing',
    description: 'Finalizing response and updating state',
    icon: CheckCircle2,
    color: '#22c55e',
    duration: '~100ms',
  },
  {
    id: 'error',
    label: 'Error',
    description: 'An error occurred during the turn',
    icon: AlertCircle,
    color: '#ef4444',
  },
];

const PHASE_ORDER: TurnPhase[] = PHASES.map(p => p.id);

function getPhaseInfo(phase: TurnPhase) {
  return PHASES.find(p => p.id === phase) || PHASES[0];
}

function isPhaseActive(phase: TurnPhase, current: TurnPhase, completed: Set<TurnPhase>): boolean {
  if (phase === current) return true;
  return completed.has(phase);
}

function isPhaseCompleted(phase: TurnPhase, current: TurnPhase, completed: Set<TurnPhase>): boolean {
  // A phase is "completed" (past) if it comes before the current phase in the cycle
  // or if it's in the completed set
  const phaseIdx = PHASE_ORDER.indexOf(phase);
  const currentIdx = PHASE_ORDER.indexOf(current);
  if (phase === current) return false;
  if (phase === 'error') return current === 'error';
  // For the normal flow, completed phases are those before current
  if (current !== 'error' && current !== 'idle') {
    return phaseIdx < currentIdx;
  }
  return completed.has(phase);
}

/**
 * mcodeTurnMachineVisualization — full-screen overlay showing the turn machine.
 * Can be embedded in SettingsPage as a reference or shown as overlay in the agent view.
 */
export function McodeTurnMachineVisualization({
  state,
  showOverlay = false,
  onClose,
}: {
  state?: Partial<TurnMachineState>;
  showOverlay?: boolean;
  onClose?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [selectedPhase, setSelectedPhase] = useState<TurnPhase | null>(null);

  const currentPhase = state?.currentPhase || 'idle';
  const phaseStartedAt = state?.phaseStartedAt || Date.now();
  const transitions = state?.transitions || [];
  const turnNumber = state?.turnNumber || 0;
  const traceId = state?.traceId || '';

  useEffect(() => {
    if (currentPhase === 'idle') {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => {
      setElapsed(Date.now() - phaseStartedAt);
    }, 100);
    return () => clearInterval(id);
  }, [currentPhase, phaseStartedAt]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const completedPhases = new Set<TurnPhase>();
  let seenCurrent = false;
  for (const t of transitions) {
    if (t.from && t.from !== currentPhase) completedPhases.add(t.from);
    if (seenCurrent && t.from === currentPhase) break;
    if (t.to === currentPhase) seenCurrent = true;
  }

  const containerClass = showOverlay
    ? 'fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-auto'
    : 'w-full';

  return (
    <div className={containerClass} onClick={showOverlay ? onClose : undefined}>
      <motion.div
        layout
        initial={showOverlay ? { opacity: 0, scale: 0.95 } : { opacity: 0 }}
        animate={showOverlay ? { opacity: 1, scale: 1 } : { opacity: 1 }}
        exit={showOverlay ? { opacity: 0, scale: 0.95 } : { opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="relative max-w-5xl w-full mx-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <Workflow className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Turn Machine — Phase {turnNumber}</h2>
            {traceId && <span className="text-xs text-white/30 font-mono">trace:{traceId.slice(0, 8)}</span>}
          </div>
          {showOverlay && onClose && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition flex items-center justify-center"
            >
              ×
            </motion.button>
          )}
        </div>

        {/* Current Phase Status Bar */}
        <div className="bg-[#151515] border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <motion.div
                key={currentPhase}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getPhaseInfo(currentPhase).color }}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              />
              <span className="text-sm font-medium text-white">
                {getPhaseInfo(currentPhase).label}
              </span>
              <span className="text-xs text-white/40">
                {getPhaseInfo(currentPhase).description}
              </span>
            </div>

            {currentPhase !== 'idle' && currentPhase !== 'error' && (
              <motion.div
                key={currentPhase}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm"
              >
                <Clock className="w-3.5 h-3.5 text-white/40" />
                <span className="text-white/60 font-mono">{formatTime(elapsed)}</span>
              </motion.div>
            )}

            {currentPhase === 'executing_tools' && state?.toolCalls !== undefined && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 text-xs text-white/40"
              >
                <span>{state.toolCalls} tool calls queued</span>
                {state.toolResults !== undefined && <span>· {state.toolResults} results</span>}
              </motion.div>
            )}
          </div>
        </div>

        {/* Flow Diagram — 10 phases in a horizontal scrollable chain */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-6 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-[800px]">
            {PHASES.map((phase, idx) => {
              const isActive = phase.id === currentPhase;
              const isCompleted = isPhaseCompleted(phase.id, currentPhase, completedPhases);
              const Icon = phase.icon;

              const nodeVariants = {
                inactive: { scale: 1, opacity: 0.5 },
                active: { scale: 1.05, opacity: 1 },
                completed: { scale: 1, opacity: 0.85 },
              };

              const getPhaseStatus = (): 'inactive' | 'active' | 'completed' => {
                if (isActive) return 'active';
                if (isCompleted) return 'completed';
                return 'inactive';
              };

              return (
                <React.Fragment key={phase.id}>
                  {/* Phase node */}
                  <motion.div
                    layout
                    key={phase.id}
                    variants={nodeVariants}
                    initial="inactive"
                    animate={getPhaseStatus()}
                    transition={{
                      type: isActive ? 'spring' : 'tween',
                      stiffness: isActive ? 500 : undefined,
                      damping: isActive ? 20 : undefined,
                      duration: 0.25,
                    }}
                    className="flex flex-col items-center"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedPhase(phase.id)}
                      className={`relative w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-200 ${
                        isActive
                          ? 'border-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                          : isCompleted
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-white/10 bg-[#1a1a1a]'
                      }`}
                      style={isActive ? { backgroundColor: `${phase.color}20` } : {}}
                    >
                      <Icon className="w-5 h-5" style={{ color: phase.color }} />

                      {/* Active pulse ring */}
                      {isActive && currentPhase !== 'idle' && currentPhase !== 'error' && (
                        <motion.div
                          className="absolute inset-0 rounded-xl"
                          style={{ borderColor: phase.color, borderWidth: 1 }}
                          initial={{ opacity: 0.8, scale: 1.2 }}
                          animate={{ opacity: 0, scale: 1.5 }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </motion.button>

                    <motion.span
                      className="mt-2 text-xs font-medium text-center"
                      style={{
                        color: isActive ? '#fff' : isCompleted ? '#6ee7b6' : '#6b7280',
                      }}
                    >
                      {phase.label}
                    </motion.span>
                    {phase.duration && (
                      <span className="text-[9px] text-white/20">{phase.duration}</span>
                    )}

                    {/* Phase info tooltip on hover */}
                    <AnimatePresence>
                      {selectedPhase === phase.id && !showOverlay && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute top-full mt-2 w-48 bg-[#1e1e1e] border border-white/10 rounded-lg p-3 text-xs shadow-xl z-10"
                        >
                          <div className="font-medium text-white/80 mb-1">{phase.label}</div>
                          <p className="text-white/40">{phase.description}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Arrow connector (skip last) */}
                  {idx < PHASES.length - 1 && (
                    <motion.div
                      className="flex items-center"
                      initial={{ opacity: 0.4 }}
                      animate={isActive ? { opacity: 1 } : { opacity: 0.4 }}
                    >
                      <ChevronRight className="w-4 h-4 text-white/20" />
                    </motion.div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Transition History */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          {/* Transition Log */}
          <div className="bg-[#151515] border border-white/10 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Transition Log
            </h3>
            {transitions.length === 0 ? (
              <div className="text-xs text-white/30 py-3">No transitions yet — submit a prompt to begin.</div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {transitions.slice().reverse().map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="text-white/30 font-mono">{formatTime(t.durationMs)}</span>
                    <span className="text-white/50">{getPhaseInfo(t.from).label}</span>
                    <ChevronRight className="w-3 h-3 text-white/20" />
                    <span className="text-white/80">{getPhaseInfo(t.to).label}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Phase Details */}
          <div className="bg-[#151515] border border-white/10 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Current Phase Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Phase ID</span>
                <span className="text-white/80 font-mono">{currentPhase}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Elapsed</span>
                <span className="text-white/80 font-mono">
                  {currentPhase === 'idle' ? '—' : formatTime(elapsed)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Turn #</span>
                <span className="text-white/80">{turnNumber}</span>
              </div>
              {transitions.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/40">Total transitions</span>
                  <span className="text-white/80">{transitions.length}</span>
                </div>
              )}
              {traceId && (
                <div className="flex justify-between">
                  <span className="text-white/40">Trace ID</span>
                  <span className="text-xs text-white/60 font-mono truncate max-w-[120px]">
                    {traceId.slice(0, 16)}...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subagent Waves (God-Mode Parallel Execution) */}
        {state?.waves && state.waves.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 bg-[#151515] border border-white/10 rounded-xl p-4"
          >
            <h4 className="text-xs font-semibold text-white/80 mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              God-Mode Waves (parallel subagents)
            </h4>
            <div className="space-y-3">
              {state.waves.map((wave) => {
                const waveSubagents = wave.subagentIds || [];
                const waveSubs = waveSubagents.map(id => state.subagents?.[id]).filter(Boolean);

                return (
                  <div key={`wave-${wave.wave}`} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 font-mono">Wave {wave.wave} · {wave.completed}/{wave.total} done</span>
                      <div className="flex gap-1">
                        {waveSubagents.map((id) => {
                          const sub = state.subagents?.[id];
                          if (!sub) return null;
                          const statusColors = {
                            pending: 'bg-white/10 text-white/40',
                            running: 'bg-blue-500/20 text-blue-400',
                            done: 'bg-emerald-500/20 text-emerald-400',
                            failed: 'bg-red-500/20 text-red-400',
                          };
                          return (
                            <span key={id} className={`px-1.5 py-0.5 rounded text-[9px] ${statusColors[sub.status as keyof typeof statusColors]}`}>
                              {sub.title || id.slice(0, 8)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#0e0e0e] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(wave.completed / wave.total) * 100}%` }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>

                    {/* Live subagent list for this wave */}
                    {waveSubagents.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {waveSubagents.map((id) => {
                          const sub = state.subagents?.[id];
                          if (!sub) return null;
                          return (
                            <motion.div
                              key={id}
                              className="bg-[#0e0e0e] border border-white/5 rounded-lg p-2.5"
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  sub.status === 'done' ? 'bg-emerald-400' :
                                  sub.status === 'running' ? 'bg-blue-400 animate-pulse' :
                                  sub.status === 'failed' ? 'bg-red-400' : 'bg-white/20'
                                }`} />
                                <span className="text-xs font-medium text-white/80 truncate">{sub.model || 'agent'}</span>
                              </div>
                              {sub.message && (
                                <p className="text-[10px] text-white/40 mt-1 truncate">{sub.message}</p>
                              )}
                              {sub.progress !== undefined && (
                                <div className="text-[10px] text-white/30 mt-0.5">{Math.round(sub.progress)}% progress</div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Input preview */}
        {state?.input && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 bg-[#151515] border border-white/10 rounded-xl p-4"
          >
            <h4 className="text-xs font-semibold text-white/60 mb-2">Prompt</h4>
            <p className="text-sm text-white/70 break-words">{state.input}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export { PHASES, PHASE_ORDER, getPhaseInfo };
