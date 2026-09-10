import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Terminal, MousePointerClick, Clock, AlertCircle, CheckCircle, XCircle, PauseCircle, Code, FileText, ExternalLink } from 'lucide-react';

/**
 * mcodeHooksTab — Section 8 (Hooks System).
 *
 * Shows the 7 hook event types, hook outcomes, execution points,
 * hook config schema, hook types (process/command), and the
 * in-memory hook runner.
 */
export function McodeHooksTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Hooks System</h2>
        <p className="text-sm text-white/40">7 hook points with matchers, outcomes, and an in-memory runner. Disabled by default (<code className="text-white/50">hooks.enabled = false</code>).</p>
      </div>

      {/* Hook Events */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Hook Event Types (7)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <HookCard
            event="SessionStart"
            icon={Zap}
            color="#3b82f6"
            when="Session begins"
            context="{session, workspace, model}"
          />
          <HookCard
            event="UserPromptSubmit"
            icon={MousePointerClick}
            color="#8b5cf6"
            when="User submits prompt"
            context="{userPrompt, messages, model}"
          />
          <HookCard
            event="PreToolUse"
            icon={Shield}
            color="#f59e0b"
            when="Before tool execution"
            context="{toolName, toolInput, riskLevel, sideEffectScope, actorKind}"
          />
          <HookCard
            event="PermissionRequest"
            icon={PauseCircle}
            color="#eab308"
            when="Tool needs approval"
            context="{toolName, toolInput, permissionDecision}"
          />
          <HookCard
            event="PostToolUse"
            icon={CheckCircle}
            color="#10b981"
            when="Tool succeeded"
            context="{toolName, toolInput, toolResponse, toolResultPreview}"
          />
          <HookCard
            event="PostToolUseFailure"
            icon={AlertCircle}
            color="#ef4444"
            when="Tool failed"
            context="{toolName, toolInput, error, isInterrupt}"
          />
          <HookCard
            event="Stop"
            icon={PauseCircle}
            color="#6b7280"
            when="Session stopped"
            context="{responseText, responsePreview, toolCallCount, stopHookActive}"
          />
        </div>
      </motion.div>

      {/* Hook Outcomes */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Hook Outcomes</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <OutcomeCard label="Success" value="success" color="#10b981" icon={CheckCircle} />
          <OutcomeCard label="Blocked" value="blocked" color="#ef4444" icon={PauseCircle} />
          <OutcomeCard label="Failed" value="failed" color="#ef4444" icon={AlertCircle} />
          <OutcomeCard label="Cancelled" value="cancelled" color="#6b7280" icon={XCircle} />
          <OutcomeCard label="Timed Out" value="timed_out" color="#f59e0b" icon={Clock} />
        </div>
      </motion.div>

      {/* Hook Config Schema */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Hook Config Schema</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code className="text-white/70">
{`{
  "enabled": boolean,
  "timeoutMs": 60000,          // 60s default
  "maxOutputBytes": 32768,     // 32KB default
  "events": {
    "SessionStart": [{ matcher, hooks }],
    "UserPromptSubmit": [{ matcher, hooks }],
    "PreToolUse": [{ matcher, hooks }],
    "PermissionRequest": [{ matcher, hooks }],
    "PostToolUse": [{ matcher, hooks }],
    "PostToolUseFailure": [{ matcher, hooks }],
    "Stop": [{ matcher, hooks }]
  }
}`}
          </code>
        </div>
      </motion.div>

      {/* Hook Types */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Hook Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-white">Process Hook</span>
            </div>
            <code className="text-white/50 block mb-1">{`{ "type": "process", "command": "string", "timeout": "number" }`}</code>
            <p className="text-white/40">Runs a command/script via child_process.spawn.</p>
          </div>
          <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-4 h-4 text-purple-400" />
              <span className="font-medium text-white">Command Hook</span>
            </div>
            <code className="text-white/50 block mb-1">{`{ "type": "command", "command": "string", "timeout": "number" }`}</code>
            <p className="text-white/40">Runs a built-in mcode command.</p>
          </div>
        </div>
      </motion.div>

      {/* Template Variables */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Template Variables (for hook scripts)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
          <TemplateVar name="{user_prompt}" desc="Full user prompt text" />
          <TemplateVar name="{tool_name}" desc="Tool being invoked" />
          <TemplateVar name="{tool_input}" desc="JSON string of tool args" />
          <TemplateVar name="{session_id}" desc="Current session UUID" />
        </div>
      </motion.div>

      {/* In-Memory Hook Runner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">In-Memory Hook Runner</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code className="text-white/70">
{`class InMemoryHookRunner {
  async run(event, context = {}) {
    const hooks = this.hooks.filter(h =>
      h.event === event.hookEventName && matcherMatches(context, h.matcher)
    );
    const outputs = { additionalContexts: [] };
    for (const [i, hook] of hooks.entries()) {
      if (hook.async) { this.runBackgroundHook(...); continue; }
      try {
        const result = await this.runCallbackWithTimeout(hook, event, i, context.signal);
        const output = processHookOutput(event.hookEventName, result);
        mergeHookOutput(outputs, output);
        if (output.permissionBehavior === "deny" || output.preventContinuation) { /* blocked */ }
      } catch (error) {
        const outcome = resolveHookFailureOutcome(error);
        // emit HookRunFailed
      }
    }
    return outputs;
  }
}`}
          </code>
        </div>
      </motion.div>
    </div>
  );
}

function HookCard({ event, icon: Icon, color, when, context }: {
  event: string; icon: any; color: string; when: string; context: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      layout
      className="bg-[#0e0e0e] border border-white/5 rounded-xl overflow-hidden"
    >
      <motion.button
        layout
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5"
      >
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">{event}</div>
          <div className="text-xs text-white/40">{when}</div>
        </div>
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          <ExternalLink className="w-3.5 h-3.5 text-white/30" />
        </motion.div>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 py-3 border-t border-white/5">
              <div className="text-xs">
                <span className="text-white/50">When:</span> <span className="text-white/80">{when}</span>
              </div>
              <div className="mt-1.5 text-xs">
                <span className="text-white/50">Context:</span>
                <code className="text-white/70 ml-1">{context}</code>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function OutcomeCard({ label, value, color, icon: Icon }: {
  label: string; value: string; color: string; icon: any;
}) {
  return (
    <div className="flex items-center gap-2 bg-[#0e0e0e] border border-white/5 rounded-lg px-3 py-2">
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
        <Icon className="w-3 h-3" style={{ color }} />
      </div>
      <div>
        <span className="text-white/80 font-medium">{label}</span>
        <span className="text-white/30 font-mono">="{value}"</span>
      </div>
    </div>
  );
}

function TemplateVar({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-2.5">
      <code className="text-xs text-white/70 font-mono block">{name}</code>
      <span className="text-[10px] text-white/40">{desc}</span>
    </div>
  );
}
