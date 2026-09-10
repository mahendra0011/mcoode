import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Clock, Zap, Terminal, Send, CheckCircle2, AlertCircle, MousePointerClick, Workflow, Search, ChevronRight } from 'lucide-react';
import { PHASES, PHASE_ORDER, McodeTurnMachineVisualization, type TurnPhase } from './McodeTurnMachineVisualization';

/**
 * mcodeTurnMachineTab — Section 7 (Agent Protocol & Turn Machine).
 *
 * Shows the TurnMachineImpl (`Si` class), 10-phase turn machine with
 * interactive visualization, state transitions, turn state fields, and
 * key methods — all extracted from the mcode CLI reference.
 */
export function McodeTurnMachineTab() {
  const [demoPhase, setDemoPhase] = useState<TurnPhase>('idle');
  const [elapsed, setElapsed] = useState(0);

  React.useEffect(() => {
    if (demoPhase === 'idle') { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(Date.now() - Date.now()), 100);
    return () => clearInterval(id);
  }, [demoPhase]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Agent Protocol &amp; Turn Machine</h2>
        <p className="text-sm text-white/40">The <code className="text-white/60">TurnMachineImpl</code> ({`'Si'`} class) drives every conversation turn through 10 phases.</p>
      </div>

      {/* Phase Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Turn Phases (10)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 text-white/60 font-medium">Phase</th>
                <th className="text-left py-2 text-white/60 font-medium">Value</th>
                <th className="text-left py-2 text-white/60 font-medium">Icon</th>
                <th className="text-left py-2 text-white/60 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {PHASES.map((p, i) => {
                const Icon = p.icon;
                return (
                  <tr key={p.id}>
                    <td className="py-2 text-white/80 font-mono">{i + 1}. {p.label}</td>
                    <td className="py-2"><code className="text-white/50">"{p.id}"</code></td>
                    <td className="py-2"><Icon className="w-4 h-4" style={{ color: p.color }} /></td>
                    <td className="py-2 text-white/40">{p.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Interactive Flow Diagram */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Interactive Phase Flow</h3>
        <p className="text-xs text-white/40 mb-4">Click a phase to set it as the current demo state — the diagram below highlights the path taken.</p>

        {/* Demo phase selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PHASES.map((p) => {
            const Icon = p.icon;
            const isActive = demoPhase === p.id;
            return (
              <motion.button
                key={p.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setDemoPhase(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-white/5'
                }`}
                style={isActive ? { borderColor: p.color + '40' } : {}}
              >
                <Icon className="w-3 h-3" style={{ color: isActive ? p.color : undefined }} />
                {p.label}
              </motion.button>
            );
          })}
        </div>

        {/* Flow diagram */}
        <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-4 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-[760px]">
            {PHASES.map((phase, idx) => {
              const Icon = phase.icon;
              const isCurrent = phase.id === demoPhase;
              const phaseIdx = PHASE_ORDER.indexOf(phase.id);
              const currentIdx = PHASE_ORDER.indexOf(demoPhase);
              const isPast = phaseIdx < currentIdx && demoPhase !== 'idle' && demoPhase !== 'error';
              const isFuture = phaseIdx > currentIdx && demoPhase !== 'idle' && demoPhase !== 'error';
              const showDot = isCurrent || isPast;

              return (
                <React.Fragment key={phase.id}>
                  <div className="flex flex-col items-center">
                    <motion.div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                        isCurrent
                          ? 'border-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                          : isPast
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : isFuture
                          ? 'border-white/10 bg-[#1a1a1a]'
                          : 'border-white/10 bg-[#1a1a1a]'
                      }`}
                      style={{ backgroundColor: isCurrent ? `${phase.color}20` : undefined }}
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{
                        scale: isCurrent ? 1.1 : 1,
                        opacity: isCurrent ? 1 : isPast ? 0.85 : isFuture ? 0.4 : 0.5,
                      }}
                      transition={{ type: isCurrent ? 'spring' : 'tween', stiffness: 500, damping: 20 }}
                    >
                      <Icon className="w-4 h-4" style={{ color: phase.color }} />
                    </motion.div>
                    <motion.span
                      className="mt-1 text-xs text-center max-w-[80px]"
                      style={{
                        color: isCurrent ? '#fff' : isPast ? '#6ee7b6' : isFuture ? '#6b7280' : '#6b7280',
                      }}
                    >
                      {phase.label}
                    </motion.span>
                    {showDot && (
                      <motion.div
                        className="mt-0.5 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: phase.color }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      />
                    )}
                  </div>
                  {idx < PHASES.length - 1 && (
                    <motion.div
                      className="flex-1 h-px bg-white/10"
                      initial={{ backgroundColor: '#374151' }}
                      animate={{ backgroundColor: isCurrent || (isPast && phase.id === demoPhase) ? '#10b981' : '#374151' }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* State Transitions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">State Transitions</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code className="text-white/70 whitespace-pre">
{`Idle → ProcessingInput → AwaitingModelResponse → Streaming
  → SchedulingTools → ExecutingTools → AggregatingResults
    (→ AwaitingModelResponse)  ← loop back for next tool round
    → SchedulingTools          ← schedule new tools
    → Completing
    → Error

Streaming → Completing
Streaming → Error
Streaming → AggregatingResults`}
          </code>
        </div>
      </motion.div>

      {/* Turn State Fields */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Turn State Fields</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <StateField name="id" type="string" desc="Turn UUID" />
          <StateField name="sessionId" type="string" desc="Parent session ID" />
          <StateField name="turnNumber" type="number" desc="0-based turn index" />
          <StateField name="phase" type="TurnPhase" desc="Current phase" />
          <StateField name="traceId" type="string" desc="Distributed tracing ID" />
          <StateField name="input" type="InputData" desc="User prompt + attachments" />
          <StateField name="streamingContent" type="TextDelta[]" desc="Accumulating model output" />
          <StateField name="toolCalls" type="ToolCallSpec[]" desc="Model tool call specs" />
          <StateField name="toolResults" type="ToolResult[]" desc="Resolved tool call results" />
          <StateField name="scheduledTools" type="ToolCall[]" desc="Queued for execution" />
          <StateField name="pendingInputs" type="InputData[]" desc="Queued during tool execution" />
          <StateField name="pendingPermissions" type="PermissionRequest[]" desc="Awaiting approval" />
          <StateField name="resolvedPermissions" type="PermissionDecision[]" desc="Resolved approvals" />
          <StateField name="resultType" type="string" desc="stop | tool_calls | recursion" />
          <StateField name="startedAt" type="Date" desc="ISO timestamp" />
        </div>
      </motion.div>

      {/* Key Methods */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Key Turn Machine Methods</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 text-white/60 font-medium">Method</th>
                <th className="text-left py-2 text-white/60 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr><td className="py-1.5 text-white/80 font-mono">create()</td><td className="py-1.5 text-white/50">Initialize new turn state</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">transition(phase)</td><td className="py-1.5 text-white/50">Move to new phase (validates transitions)</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">startModelRequest()</td><td className="py-1.5 text-white/50">Begin awaiting model response</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">receiveModelResponse()</td><td className="py-1.5 text-white/50">Model sent response</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">addStreamingContent(text)</td><td className="py-1.5 text-white/50">Append delta to accumulating content</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">scheduleTools(calls)</td><td className="py-1.5 text-white/50">Queue tool calls for execution</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">startToolExecution()</td><td className="py-1.5 text-white/50">Begin running tools</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">completeTool(result)</td><td className="py-1.5 text-white/50">One tool finished</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">requestPermission(toolCall)</td><td className="py-1.5 text-white/50">Request user approval</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">resolvePermission(approved)</td><td className="py-1.5 text-white/50">Resolve permission request</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">aggregateResults()</td><td className="py-1.5 text-white/50">Collect all tool results</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">complete()</td><td className="py-1.5 text-white/50">Finalize turn</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">fail(error)</td><td className="py-1.5 text-white/50">Error state</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">getNextPhase()</td><td className="py-1.5 text-white/50">Determine next valid phase</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">isComplete()</td><td className="py-1.5 text-white/50">Check if turn is done</td></tr>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Live Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Live Phase Viewer</h3>
        <p className="text-xs text-white/40 mb-4">Demo mode — the diagram above shows phase <strong className="text-white/80">{demoPhase}</strong> as active.</p>
        <McodeTurnMachineVisualization
          state={{
            currentPhase: demoPhase,
            phaseStartedAt: Date.now() - elapsed,
            transitions: [],
            turnNumber: 0,
            traceId: '',
            toolCalls: 3,
            toolResults: 2,
          }}
        />
      </motion.div>
    </div>
  );
}

function StateField({ name, type, desc }: { name: string; type: string; desc: string }) {
  return (
    <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <code className="text-xs text-white/80 font-mono">{name}</code>
        <span className="text-xs text-white/50 font-mono">: {type}</span>
      </div>
      <p className="text-[10px] text-white/40 mt-1">{desc}</p>
    </div>
  );
}
