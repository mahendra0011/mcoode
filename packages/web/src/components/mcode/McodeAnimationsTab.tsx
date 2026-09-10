import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Zap, Sparkles, Code, BarChart3, CheckCircle,
  Terminal as TerminalIcon, GitBranch, Activity, Timer,
  ChevronDown, Play, Pause, Square, MousePointerClick
} from 'lucide-react';

/**
 * mcodeAnimationsTab — Sections 13 (Animation Systems) + 15 (Terminal CLI Animations).
 *
 * Covers the 4-layer animation architecture:
 *   Layer 1: CSS keyframes (mcode-stream-text-in, collapsible, reaction burst)
 *   Layer 2: Tailwind utilities (.animate-spin-slow, .animate-in, etc.)
 *   Layer 3: Framer Motion patterns (message stagger, button springs, ThinkingIndicator)
 *   Layer 4: CLI Terminal Animations (shared 80ms ticker, blocks, hooks)
 *
 * Also includes the 16-color xterm terminal theme.
 */
export function McodeAnimationsTab() {
  const [activeLayer, setActiveLayer] = useState(0);
  const [bouncing, setBouncing] = useState(true);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Animation Systems</h2>
        <p className="text-sm text-white/40">4-layer architecture: CSS keyframes → Tailwind utilities → Framer Motion → CLI terminal ticker. Plus the 16-color xterm theme.</p>
      </div>

      {/* Layer Switcher */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { id: 0, label: 'Layer 1: CSS Keyframes' },
          { id: 1, label: 'Layer 2: Tailwind' },
          { id: 2, label: 'Layer 3: Framer Motion' },
          { id: 3, label: 'Layer 4: CLI Terminal' },
          { id: 4, label: 'Terminal Theme (xterm)' },
          { id: 5, label: 'UI Elements & CSS' },
        ].map((layer) => (
          <motion.button
            key={layer.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveLayer(layer.id)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeLayer === layer.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,223,0.2)]'
                : 'bg-[#0e0e0e] text-white/40 border border-white/5 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            {layer.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Layer 1: CSS Keyframes */}
        {activeLayer === 0 && (
          <motion.div
            key="layer1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-6"
          >
            <CssKeyFrame name="mcode-stream-text-in" duration="0.9s" easing="cubic-bezier(0.16, 1, 0.3, 1)" code={`@keyframes mcode-stream-text-in {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}`} desc="Fade-in for stream text, tool stream, and chat loading elements. Applied via data attributes: [data-mcode-stream-animate=true], [data-mcode-tool-stream-animate=true], [data-mcode-chat-loading-animate=true]." />

            <CssKeyFrame name="mcode-stream-marker-in" duration="0.9s" easing="cubic-bezier(0.16, 1, 0.3, 1)" code={`@keyframes mcode-stream-marker-in {
  0%   { color: #0000; }
  100% { color: inherit; }
}`} desc="List marker color transition. Supports --mcode-stream-animation-delay custom property for staggered markers." />

            <CssKeyFrame name="mcode-collapsible-up" duration="0.3s" easing="ease-in-out" code={`@keyframes mcode-collapsible-up {
  0%  { height: var(--radix-collapsible-content-height); }
  to  { height: 0; }
}
@keyframes mcode-collapsible-fade-out {
  0%  { opacity: 1; }
  to  { opacity: 0; }
}`} desc="Collapsible close animation for tool call cards and expandable sections." />

            <CssKeyFrame name="mcode-reaction-pop" duration="0.25s" easing="cubic-bezier(0.16, 1, 0.3, 1)" code={`@keyframes mcode-reaction-pop {
  0%   { transform: scale(0); }
  100% { transform: scale(1); }
}
@keyframes mcode-reaction-particles {
  0% {
    opacity: 0;
    box-shadow: 7.7px 2.1px, 2.1px 7.7px, -5.7px 5.7px,
                -7.7px -2.1px, -2.1px -7.7px, 5.7px -5.7px;
  }
}`} desc="Reaction burst effect — pop (scale 0→1) + 6 particles radiating from center." />

            <CssKeyFrame name="startup-logo-pop" duration="0.72s" easing="cubic-bezier(0.22, 1, 0.36, 1)" code={`@keyframes startup-logo-pop {
  0%   { opacity: 0; transform: scale(0.72); }
  38%  { opacity: 1; transform: scale(1.045); }
  58%  { transform: scale(0.985); }
  76%  { transform: scale(1.008); }
  100% { opacity: 1; transform: scale(1); }
}`} desc="mcode desktop app logo animation — overshoot pop with settle." />

            <CssKeyFrame name="pulse-caret" duration="1s" easing="step-end infinite" code={`@keyframes pulse-caret {
  0%, 50%, 100% { opacity: 1; }
  25%, 75%       { opacity: 0.3; }
}`} desc="Blinking caret for syntax highlight cursor in editor." />
          </motion.div>
        )}

        {/* Layer 2: Tailwind */}
        {activeLayer === 1 && (
          <motion.div
            key="layer2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TailwindAnim name=".animate-spin-slow" desc="3s linear infinite rotation for loading spinners" />
              <TailwindAnim name=".animate-ping" desc="Scale up + fade for notification indicators" />
              <TailwindAnim name=".animate-pulse" desc="Opacity 50% at 50% for skeleton loaders" />
              <TailwindAnim name=".animate-in" desc="Custom enter animation via Tailwind utilities" />
              <TailwindAnim name=".animate-spin" desc="360° rotation (default Tailwind)" />
              <TailwindAnim name="[data-mcode-stream-animate]" desc="CSS keyframe trigger for stream text fade-in" />
              <TailwindAnim name="[data-slot=progress-indicator]" desc="Update charge sweep animation for progress bars" />
              <TailwindAnim name=".browser-use-operation-breathe" desc="0.5 opacity + 0.9 scale breathe for browser operations" />
            </div>
          </motion.div>
        )}

        {/* Layer 3: Framer Motion */}
        {activeLayer === 2 && (
          <motion.div
            key="layer3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] } }
            className="space-y-6"
          >
            <FramerMotionPattern
              name="Message Appearance (ChatMessage)"
              code={`initial={{ opacity: 0, y: 4 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -4 }}
transition={{
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1],
  delay: idx * 0.02  // stagger per message
}}`}
              desc="Each chat message fades in from bottom with 20ms stagger per message index."
            />
            <FramerMotionPattern
              name="Stagger Lists (variants)"
              code={`variants={{
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 }
  }
}}
initial="hidden"
animate="show"
// Children: initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}`}
              desc="Staggered fade-in for list items — used in todo lists, tool results, search results."
            />
            <FramerMotionPattern
              name="Button Interactions"
              code={`whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.92 }}
transition={{
  type: "spring",
  stiffness: 500,
  damping: 20
}}`}
              desc="Subtle hover scale + spring tap. Tab nav uses scale 1.05 for inactive tabs. Checkmarks use spring pop."
            />
            <FramerMotionPattern
              name="ThinkingIndicator Dots"
              code={`// 3 bouncing dots
y: [0, -4, 0]
duration: 0.6
repeat: Infinity
delay: i * 0.12  // stagger per dot
color: emerald-400`}
              desc="Chat mode thinking indicator — 3 emerald dots bouncing with 120ms stagger."
            />
            <FramerMotionPattern
              name="ChatFlowAnimation Steps"
              code={`// 5-step sequential flow
initial={{ opacity: 0, x: -10, height: 0 }}
animate={{ opacity: 1, x: 0, height: "auto" }}
// Timing per step:
// 600ms  - Assembling system context
// 1500ms - Understanding user intent
// 3000ms - Searching web & executing tools
// 4500ms - Drafting response
// Final  - Updating memory`}
              desc="Chat mode flow animation — each step slides in with dashed rotating border."
            />
          </motion.div>
        )}

        {/* Layer 4: CLI Terminal */}
        {activeLayer === 3 && (
          <motion.div
            key="layer4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-6"
          >
            <CliTickerCard />
            <CliHookCard />
            <CliBlockCard />
            <CliBlockDetails />
          </motion.div>
        )}

        {/* Terminal Theme */}
        {activeLayer === 4 && (
          <motion.div
            key="xterm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-6"
          >
            <XTermTheme />
          </motion.div>
        )}

        {/* Layer 5: UI Elements & CSS Classes */}
        {activeLayer === 5 && (
          <motion.div
            key="uielements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-6"
          >
            {/* Platform-Specific Classes */}
            <motion.div className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">Platform-Specific Classes</h3>
              <p className="text-xs text-white/40 mb-3">Applied to document.documentElement based on navigator.userAgent.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <UIClass name=".platform-mac-desktop" desc="macOS styling — traffic light buttons, blur backdrop" />
                <UIClass name=".platform-windows-desktop" desc="Windows styling — caption buttons, window chrome" />
                <UIClass name=".platform-linux-desktop" desc="Linux styling — window manager hints" />
              </div>
            </motion.div>

            {/* Theme System */}
            <motion.div className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">Theme System</h3>
              <p className="text-xs text-white/40 mb-3">Theme switching: localStorage 'mcode-theme' → 'system' | 'light' | 'dark' | 'zai-light' | 'zai-dark'.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <UIClass name=".theme-zai-light" desc="Light theme — bg: #f8f8f9, text: #1e1e1e" />
                <UIClass name=".theme-zai-dark" desc="Dark theme (default) — bg: #0d0e12, text: #e6e6ea" />
              </div>
            </motion.div>

            {/* UI Color Variables */}
            <motion.div className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">UI Color Variables</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ColorVar name="--color-brand" value="#3b82f6" label="Primary brand" />
                <ColorVar name="--color-bg" value="#0d0e12" label="Main bg" />
                <ColorVar name="--color-panel" value="#16171d" label="Panel bg" />
                <ColorVar name="--color-border" value="#26272f" label="Borders" />
                <ColorVar name="--color-text" value="#e6e6ea" label="Primary text" />
                <ColorVar name="--color-text-dim" value="#8b8d98" label="Dimmed text" />
                <ColorVar name="--color-green" value="#3ecf8e" label="Success" />
                <ColorVar name="--color-red" value="#ff6b6b" label="Error" />
                <ColorVar name="--color-yellow" value="#f5c451" label="Warning" />
                <ColorVar name="--color-accent" value="#6c8cff" label="Accent" />
              </div>
            </motion.div>

            {/* Core UI Classes */}
            <motion.div className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">Core UI Element Classes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <UIClass name=".accent-body" desc="Base body wrapper with accent styling" />
                <UIClass name=".browser-use-viewport" desc="Container for web preview/browser automation" />
                <UIClass name=".browser-use-operation-breathe" desc="0.9s breathe animation for browser ops" />
                <UIClass name=".task-search-result-highlight" desc="1.2s oklab brand-color highlight for search hits" />
                <UIClass name=".task-title-marquee-track" desc="will-change transform for title scrolling" />
                <UIClass name=".workspace-remote-connecting-pulse" desc="Infinite pulse for remote workspace connection" />
                <UIClass name=".mcode-update-charge-progress" desc="Update download progress bar with charge sweep" />
                <UIClass name=".terminal-xterm-shell" desc="xterm.js terminal container with 16-color theme" />
                <UIClass name=".scrollbar-hide" desc="Hides scrollbar (both webkit and firefox)" />
                <UIClass name="[data-mcode-pptx-render-surface]" desc="PPTX slide preview — scrollbar hidden" />
                <UIClass name=".prose, .prose-sm" desc="Tailwind Typography for markdown content" />
                <UIClass name=".katex, .katex-display" desc="LaTeX/Math rendering via KaTeX" />
              </div>
            </motion.div>

            {/* Startup Loading Animation */}
            <motion.div className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">Startup Loading Animation</h3>
              <div className="space-y-2 text-xs">
                <p className="text-white/40">Sequence: logo shell animation → 1000ms timeout OR animationend → show app → 500ms → remove loading overlay</p>
                <UIClass name="#root" desc="opacity:0 → opacity:1 via .mcode-startup-ready class (160ms ease)" />
                <UIClass name="#loading" desc="Fixed overlay z-index:2147483647, fades to opacity:0 on startup ready" />
                <UIClass name=".startup-logo-shell" desc="96×96px gradient shell, 24px radius, shadow" />
              </div>
            </motion.div>

            {/* Animation Timing Reference Table */}
            <motion.div className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">Animation Timing &amp; Easing Reference</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-1.5 text-white/60 font-mono">Element</th>
                      <th className="text-left py-1.5 text-white/60 font-mono">Duration</th>
                      <th className="text-left py-1.5 text-white/60 font-mono">Easing</th>
                      <th className="text-left py-1.5 text-white/60 font-mono">Trigger</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5"><td className="py-1 text-white/70">Stream text</td><td className="py-1 font-mono">900ms</td><td className="py-1 font-mono">cubic-bezier(0.16,1,0.3,1)</td><td className="py-1">data-mcode-stream-animate</td></tr>
                    <tr className="border-b border-white/5"><td className="py-1 text-white/70">Stream marker</td><td className="py-1 font-mono">900ms</td><td className="py-1 font-mono">cubic-bezier(0.16,1,0.3,1)</td><td className="py-1">data-mcode-stream-marker-animate</td></tr>
                    <tr className="border-b border-white/5"><td className="py-1 text-white/70">Collapsible close</td><td className="py-1 font-mono">300ms</td><td className="py-1 font-mono">ease-in-out</td><td className="py-1">data-mcode-collapsible-animate-close</td></tr>
                    <tr className="border-b border-white/5"><td className="py-1 text-white/70">Update charge sweep</td><td className="py-1 font-mono">1.15s</td><td className="py-1 font-mono">cubic-bezier(0.65,0,0.35,1)</td><td className="py-1">infinite</td></tr>
                    <tr className="border-b border-white/5"><td className="py-1 text-white/70">Task highlight</td><td className="py-1 font-mono">1.2s</td><td className="py-1 font-mono">ease-out</td><td className="py-1">search results</td></tr>
                    <tr className="border-b border-white/5"><td className="py-1 text-white/70">Browser breathe</td><td className="py-1 font-mono">0.9s</td><td className="py-1 font-mono">cubic-bezier(0.16,1,0.3,1)</td><td className="py-1">browser operations</td></tr>
                    <tr className="border-b border-white/5"><td className="py-1 text-white/70">Connecting pulse</td><td className="py-1 font-mono">infinite</td><td className="py-1 font-mono">ease-in-out</td><td className="py-1">remote workspace</td></tr>
                    <tr className="border-b border-white/5"><td className="py-1 text-white/70">App startup transition</td><td className="py-1 font-mono">160ms</td><td className="py-1 font-mono">ease</td><td className="py-1">#root</td></tr>
                    <tr className="border-b border-white/5"><td className="py-1 text-white/70">Logo pop</td><td className="py-1 font-mono">720ms</td><td className="py-1 font-mono">cubic-bezier(0.22,1,0.36,1)</td><td className="py-1">.startup-logo-shell</td></tr>
                    <tr><td className="py-1 text-white/70">ChatMessage entry</td><td className="py-1 font-mono">250ms</td><td className="py-1 font-mono">ease [0.4,0,0.2,1]</td><td className="py-1">initial/animate/exit</td></tr>
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Animation Summary by UI Area */}
            <AnimSummary />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CssKeyFrame({ name, duration, easing, code, desc }: {
  name: string; duration: string; easing: string; code: string; desc: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Play className="w-3.5 h-3.5 text-emerald-400" />
        <code className="text-xs font-mono text-emerald-400">{name}</code>
        <span className="text-xs text-white/40">({duration}, {easing})</span>
      </div>
      <div className="bg-[#050505] border border-white/5 rounded-lg p-3 font-mono text-xs overflow-x-auto mb-2">
        <code className="text-white/70 whitespace-pre">{code}</code>
      </div>
      <p className="text-xs text-white/40">{desc}</p>
    </motion.div>
  );
}

function TailwindAnim({ name, desc }: { name: string; desc: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4 flex items-center gap-3"
    >
      <Layers className="w-5 h-5 text-blue-400 flex-shrink-0" />
      <div>
        <code className="text-xs font-mono text-blue-400 block">{name}</code>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
    </motion.div>
  );
}

function FramerMotionPattern({ name, code, desc }: { name: string; code: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-sm font-medium text-white">{name}</span>
      </div>
      <div className="bg-[#050505] border border-white/5 rounded-lg p-3 font-mono text-xs overflow-x-auto">
        <code className="text-white/70 whitespace-pre">{code}</code>
      </div>
      <p className="text-xs text-white/40 mt-2">{desc}</p>
    </motion.div>
  );
}

function CliTickerCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Timer className="w-4 h-4 text-amber-400" />
        <code className="text-xs font-mono text-amber-400">useTicker.js — 80ms shared ticker</code>
      </div>
      <code className="text-xs text-white/70 block bg-[#050505] border border-white/5 rounded-lg p-3 font-mono whitespace-pre">
{`const TICK_RATE_MS = 80;  // 80ms per tick
const subscribers = new Set();
let tickCount = 0;
let intervalId = null;

function tick() { tickCount++; for (const fn of subscribers) fn(tickCount); }
function subscribe(fn) {
  subscribers.add(fn);
  if (subscribers.size === 1) intervalId = setInterval(tick, TICK_RATE_MS);
  fn(tickCount);  // immediate sync
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) clearInterval(intervalId);
  };
}`}
      </code>
    </motion.div>
  );
}

function CliHookCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-medium text-white">CLI UI Hooks</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CliHookRow name="useTicker" file="useTicker.js" ticker="80ms" purpose="Global tick counter (lazy setInterval)" />
        <CliHookRow name="useAnimatedProgress" file="useAnimatedProgress.js" ticker="20ms, 8 frames" purpose="Percentage interpolation" />
        <CliHookRow name="useEntrance" file="useEntrance.js" ticker="80ms ticks" purpose="Progressive line reveal" />
        <CliHookRow name="useFlashOnMount" file="blocks.jsx" ticker="400ms timeout" purpose="Green flash for new content" />
      </div>
    </motion.div>
  );
}

function CliHookRow({ name, file, ticker, purpose }: { name: string; file: string; ticker: string; purpose: string }) {
  return (
    <div className="bg-[#050505] border border-white/5 rounded-lg p-2.5">
      <div className="flex items-center justify-between">
        <code className="text-xs text-white/70 font-mono">{name}</code>
        <span className="text-xs text-white/40">{file}</span>
      </div>
      <div className="text-[10px] text-white/40 mt-1">Ticker: {ticker} · {purpose}</div>
    </div>
  );
}

function CliBlockCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <TerminalIcon className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-white">CLI Block Types (blocks.jsx, 661 lines)</span>
      </div>
      <code className="text-xs text-white/70 block bg-[#050505] border border-white/5 rounded-lg p-3 font-mono">
{`const SPIN_FRAMES = ['●', '◐', '◓', '◑', '◒'];  // 5-frame spinner
const TOOL_VERBS = {
  read_file: 'Reading…', write_file: 'Writing…', edit_file: 'Writing…',
  run_shell: 'Running…', run_tests: 'Running tests…',
  list_files: 'Finding files…', search_code: 'Searching…',
  git_status: 'Checking git…'
};
const TOOL_LABELS = {
  read_file: 'Read', write_file: 'Wrote', edit_file: 'Edit',
  run_shell: 'Run', run_tests: 'Run tests', list_files: 'Glob',
  search_code: 'Grep', git_status: 'Git status'
};
const READ_MAX = 15, CMD_MAX = 10;`}
      </code>
    </motion.div>
  );
}

function CliBlockDetails() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
    >
      <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">CLI Block Animation Details</h4>
      <div className="space-y-2 text-xs">
        <CliDetail name="SpinnerBlock" detail="SPIN_FRAMES[ticks % 5] at 80ms intervals" />
        <CliDetail name="RunningToolBlock" detail="Spinner + args preview + verb label" color="text-amber-400" />
        <CliDetail name="ThoughtBlock" detail="Dots cycle (400ms/dot), progressive reveal (~30ms/line), DAG arrows (→)" color="text-blue-400" />
        <CliDetail name="ReadBlock / WriteBlock" detail="~30ms/line reveal, 400ms green flash (#062012 bg, green border), max 15 lines" color="text-emerald-400" />
        <CliDetail name="DiffBlock" detail="add=16ms/line (fastest), context=30ms/line, remove=40ms/line (slowest)" color="text-purple-400" />
        <CliDetail name="CommandBlock" detail="~30ms/line reveal, $ prompt in green, max 10 lines" color="text-green-400" />
        <CliDetail name="TodoBlock" detail="160ms progress bar, 640ms checkbox draw-in (|→/→✓), 2560ms running pulse, 400ms flash" color="text-cyan-400" />
        <CliDetail name="PermissionBlock" detail="Flash-on-mount, ? pending (orange), ✓ approved (green), ✗ denied (red)" color="text-amber-400" />
      </div>
    </motion.div>
  );
}

function CliDetail({ name, detail, color = 'text-white/60' }: { name: string; detail: string; color?: string }) {
  return (
    <div className="flex items-start gap-2 bg-[#050505] border border-white/5 rounded-lg p-2.5">
      <span className={`font-medium ${color}`}>{name}:</span>
      <span className="text-white/40">{detail}</span>
    </div>
  );
}

function XTermTheme() {
  const colors = [
    { name: 'Black (background)', value: '#0a0a0a', var: '--xterm-color-0' },
    { name: 'Red (errors)', value: '#f871f1', var: '--xterm-color-1' },
    { name: 'Green (additions)', value: '#10b981', var: '--xterm-color-2' },
    { name: 'Yellow (warnings)', value: '#eab308', var: '--xterm-color-3' },
    { name: 'Blue (info)', value: '#3b82f6', var: '--xterm-color-4' },
    { name: 'Magenta (debug)', value: '#a855f7', var: '--xterm-color-5' },
    { name: 'Cyan (system)', value: '#2dd367', var: '--xterm-color-6' },
    { name: 'White (text)', value: '#e5e5e5', var: '--xterm-color-7' },
    { name: 'Bright Black (dimmed)', value: '#27272a', var: '--xterm-color-8' },
    { name: 'Bright Red', value: '#fb6b6b', var: '--xterm-color-9' },
    { name: 'Bright Green', value: '#2dd677', var: '--xterm-color-10' },
    { name: 'Bright Yellow', value: '#fbbf24', var: '--xterm-color-11' },
    { name: 'Bright Blue', value: '#60a5fa', var: '--xterm-color-12' },
    { name: 'Bright Magenta', value: '#c084fc', var: '--xterm-color-13' },
    { name: 'Bright Cyan', value: '#4feda8', var: '--xterm-color-14' },
    { name: 'Bright White', value: '#f4f4f5', var: '--xterm-color-15' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <TerminalIcon className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-white">mcode xterm Terminal Theme (16 colors)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {colors.map((c) => (
          <motion.div
            key={c.var}
            className="flex items-center gap-3 bg-[#050505] border border-white/5 rounded-lg px-3 py-2"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: c.value }} />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-white/60">{c.name}</span>
              <div className="font-mono text-xs text-white/40">{c.value}</div>
            </div>
            <div className="text-xs text-white/30 font-mono">{c.var}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function UIClass({ name, desc }: { name: string; desc: string }) {
  return (
    <motion.div className="bg-[#050505] border border-white/5 rounded-lg p-2.5">
      <div className="flex items-center gap-2">
        <Layers className="w-3 h-3 text-blue-400 flex-shrink-0" />
        <code className="text-xs font-mono text-white/70 break-all">{name}</code>
      </div>
      <p className="text-xs text-white/40 mt-0.5">{desc}</p>
    </motion.div>
  );
}

function ColorVar({ name, value, label }: { name: string; value: string; label: string }) {
  return (
    <motion.div
      className="flex items-center gap-2 bg-[#050505] border border-white/5 rounded-lg p-2"
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: value }} />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-mono text-white/60 block">{name}</span>
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <span className="text-xs text-white/50 font-mono">{value}</span>
    </motion.div>
  );
}

function AnimSummary() {
  const areas = [
    {
      name: 'Chat / IDE',
      items: [
        { label: 'Stream text', anim: 'mcode-stream-text-in', duration: '900ms', trigger: 'data-mcode-stream-animate' },
        { label: 'Stream markers', anim: 'mcode-stream-marker-in', duration: '900ms', trigger: 'data-mcode-stream-marker-animate' },
        { label: 'Message appearance', anim: 'FM opacity+y slide', duration: '250ms', trigger: 'initial/animate/exit' },
      ],
    },
    {
      name: 'Tool Cards',
      items: [
        { label: 'Collapsible open/close', anim: 'mcode-collapsible-up', duration: '300ms', trigger: 'data-mcode-collapsible-animate-close' },
        { label: 'Search highlight', anim: 'task-search-result-highlight', duration: '1.2s', trigger: '.task-search-result-highlight' },
        { label: 'Task countdown', anim: 'mcode-task-interaction-countdown', duration: 'var(--mcode-interaction-remaining-ms)', trigger: '.mcode-task-interaction-countdown-fill' },
      ],
    },
    {
      name: 'Updates',
      items: [
        { label: 'Progress sweep', anim: 'mcode-update-charge-sweep', duration: '1.15s', trigger: '[data-slot=progress-indicator]' },
        { label: 'Reaction pop', anim: 'mcode-reaction-pop', duration: '250ms', trigger: '.mcode-reaction-pop' },
        { label: 'Reaction particles', anim: 'mcode-reaction-particles', duration: '500ms', trigger: '.mcode-reaction-particles' },
      ],
    },
    {
      name: 'Browser/Remote',
      items: [
        { label: 'Connecting breathe', anim: 'workspace-remote-connecting-breathe', duration: 'infinite', trigger: '.workspace-remote-connecting-breathe' },
        { label: 'Operation breathe', anim: 'browser-use-operation-breathe', duration: '900ms', trigger: '.browser-use-operation-breathe' },
      ],
    },
    {
      name: 'Startup',
      items: [
        { label: 'Logo shell pop', anim: 'startup-logo-pop', duration: '720ms', trigger: '.startup-logo-shell' },
        { label: 'Root fade-in', anim: 'opacity transition', duration: '160ms', trigger: '#root' },
        { label: 'Loading overlay', anim: 'opacity transition', duration: '160ms', trigger: '#loading' },
      ],
    },
  ];

  return (
    <motion.div
      className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">Animation Summary by UI Area</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {areas.map((area) => (
          <div key={area.name} className="bg-[#050505] border border-white/5 rounded-lg p-3">
            <div className="text-xs font-medium text-white/80 mb-2">{area.name}</div>
            <div className="space-y-1.5">
              {area.items.map((item) => (
                <div key={item.label} className="text-[10px] text-white/50">
                  <div className="font-mono text-white/70">{item.label}</div>
                  <div className="mt-0.5">
                    {item.duration} · {item.trigger}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
