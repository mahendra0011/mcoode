import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, CheckCircle, Monitor, Cpu, Wifi, Rocket, Sparkles } from 'lucide-react';

/**
 * mcodeStartupTab — Section 4 (Startup Animation Flow).
 *
 * Shows the complete 2-stage startup: logo pop animation → React ready → fade.
 * Includes the CSS keyframes, JS state machine, and timing table.
 */
export function McodeStartupTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Startup Animation Flow</h2>
        <p className="text-sm text-white/40">mcode Desktop App v3.7.6 — 2-stage startup with logo pop → React ready → fade-out</p>
      </div>

      {/* Flow Diagram */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Complete Flow</h3>
        <div className="space-y-3">
          {[
            {
              step: 1,
              label: 'Electron app starts → app.whenReady()',
              desc: 'Sets up protocol handlers, spawns scheduler, configures auto-updater, applies network policy, sets up tray/deep links, single-instance lock.',
              icon: Rocket,
            },
            {
              step: 2,
              label: 'ensurePrimaryWindow("app-ready") → createWindow()',
              desc: 'new BrowserWindow(1200×800), loads index.html immediately (no show:false).',
              icon: Monitor,
            },
            {
              step: 3,
              label: 'Renderer: index.html loads',
              desc: '#loading overlay visible (z-index: 2147483647), startup-logo-shell plays startup-logo-pop (720ms), listens for animationend (1s fallback) and mcode-react-startup-ready (3s fallback).',
              icon: Play,
            },
            {
              step: 4,
              label: 'React mounts → $() dispatches "mcode-react-startup-ready"',
              desc: 'P = true → F() fires transition gate.',
              icon: Sparkles,
            },
            {
              step: 5,
              label: 'F() — Transition gate fires',
              desc: 'Checks M || !N || !P → waits for BOTH flags. Then: document.body.classList.add("mcode-startup-ready"), setTimeout(() => loadingEl.remove(), 500) (160ms fade-out).',
              icon: CheckCircle,
            },
            {
              step: 6,
              label: 'Main: dom-ready handler',
              desc: 'Windows: window.show() + window.focus(). Spawns host process, creates MessagePort pair, posts "mcode:service-port".',
              icon: Cpu,
            },
            {
              step: 7,
              label: 'Renderer: service-port handler',
              desc: 'Receives MessagePort from main, creates service bridge (ChannelClient), initializes all 37 services, createRoot().render() → dispatches mcode-react-startup-ready.',
              icon: Cpu,
            },
            {
              step: 8,
              label: 'Host: InitLocal message received',
              desc: 'tY() creates local services (37 services), Ym() exposes via ChannelServer on MessagePort, posts "local services ready".',
              icon: Wifi,
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3"
              >
                <div className="flex flex-col items-center flex-shrink-0">
                  <motion.div
                    className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    <Icon className="w-3.5 h-3.5 text-blue-400" />
                  </motion.div>
                  {i < 7 && (
                    <div className="w-px h-10 bg-white/5 mt-1" />
                  )}
                </div>
                <div className="pb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-mono text-white/40">0{i + 1}.</span>
                    <span className="text-sm font-medium text-white">{item.label.split(' → ')[0]}</span>
                    {item.label.includes('→') && (
                      <span className="text-xs text-white/50">→ {item.label.split(' → ')[1]}</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Startup CSS */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Startup Animation CSS</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code className="text-white/70">
{`#root { opacity: 0; transition: opacity 0.16s ease; }
body.mcode-startup-ready #root { opacity: 1; }
#loading { position: fixed; inset: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.16s ease; }
body.mcode-startup-ready #loading { pointer-events: none; opacity: 0; }

.startup-logo-shell {
  width: 96px; height: 96px; border-radius: 24px;
  background: linear-gradient(180deg, #000 0%, #151718 100%);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2);
  transform: scale(0.72); opacity: 0;
  animation: startup-logo-pop 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  transform-origin: center;
}

@keyframes startup-logo-pop {
  0%   { opacity: 0; transform: scale(0.72); }
  38%  { opacity: 1; transform: scale(1.045); }
  58%  { transform: scale(0.985); }
  76%  { transform: scale(1.008); }
  100% { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .startup-logo-shell { opacity: 1; transform: scale(1); animation: none; }
}`}
          </code>
        </div>
      </motion.div>

      {/* Startup JS State Machine */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Startup Animation JS</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code className="text-white/70">
{`var logo = document.querySelector(".startup-logo-shell"),
    loading = document.getElementById("loading"),
    isUpdateStatus = new URLSearchParams(window.location.search).get("windowKind") === "update-status",
    prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    transitionFired = false,  // M
    logoDone = false,         // N
    reactReady = false;       // P

function fireTransition() {
  if (transitionFired || !logoDone || !reactReady) return;
  transitionFired = true;
  document.body.classList.add("mcode-startup-ready");
  setTimeout(() => loading?.remove(), 500);
}

function onLogoAnimationEnd() { logoDone = true; fireTransition(); }
function onReactReady() { reactReady = true; fireTransition(); }

isUpdateStatus
  ? (transitionFired = true, document.body.classList.add("mcode-startup-ready"), loading?.remove())
  : window.addEventListener("mcode-react-startup-ready", onReactReady, {once: true});

// Logo animation with fallbacks
isUpdateStatus || prefersReduced || !logo
  ? onLogoAnimationEnd()
  : (logo.addEventListener("animationend", onLogoAnimationEnd, {once: true}),
     setTimeout(onLogoAnimationEnd, 1000));  // 1s fallback

// React ready fallback
isUpdateStatus || setTimeout(onReactReady, 3000);  // 3s fallback`}
          </code>
        </div>
      </motion.div>

      {/* Timing Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Timing Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 text-white/60 font-medium">Phase</th>
                <th className="text-left py-2 text-white/60 font-medium">Duration</th>
                <th className="text-left py-2 text-white/60 font-medium">Easing</th>
                <th className="text-left py-2 text-white/60 font-medium">Fallback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-2 text-white/80">Logo <code className="text-white/50">startup-logo-pop</code></td>
                <td className="py-2 text-white/60 font-mono">720ms</td>
                <td className="py-2 text-white/60 font-mono">cubic-bezier(0.22, 1, 0.36, 1)</td>
                <td className="py-2 text-white/50">—</td>
              </tr>
              <tr>
                <td className="py-2 text-white/80">Logo <code className="text-white/50">animationend</code> listener</td>
                <td className="py-2 text-white/60 font-mono">—</td>
                <td className="py-2 text-white/60 font-mono">—</td>
                <td className="py-2 text-white/50 font-mono">1000ms setTimeout</td>
              </tr>
              <tr>
                <td className="py-2 text-white/80">React startup ready</td>
                <td className="py-2 text-white/60 font-mono">—</td>
                <td className="py-2 text-white/60 font-mono">—</td>
                <td className="py-2 text-white/50 font-mono">3000ms setTimeout</td>
              </tr>
              <tr>
                <td className="py-2 text-white/80"><code className="text-white/50">#loading</code> fade-out</td>
                <td className="py-2 text-white/60 font-mono">160ms</td>
                <td className="py-2 text-white/60 font-mono">ease</td>
                <td className="py-2 text-white/50">—</td>
              </tr>
              <tr>
                <td className="py-2 text-white/80"><code className="text-white/50">#root</code> fade-in</td>
                <td className="py-2 text-white/60 font-mono">160ms</td>
                <td className="py-2 text-white/60 font-mono">ease</td>
                <td className="py-2 text-white/50">—</td>
              </tr>
              <tr>
                <td className="py-2 text-white/80">Loading element removal</td>
                <td className="py-2 text-white/60 font-mono">—</td>
                <td className="py-2 text-white/60 font-mono">—</td>
                <td className="py-2 text-white/50 font-mono">500ms after ready</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
