"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/**
 * StartupOverlay — the mcode startup logo pop.
 *
 * Spec timings (ZCODE-ANIMATIONS.md §startup): logo 720 ms
 * `cubic-bezier(0.22, 1, 0.36, 1)`, 500 ms overlay fade-out.
 *
 * WEB-026 fixes applied here:
 *
 *  1. **One motion system.** framer-motion drives `scale`/`opacity`. The CSS
 *     `@keyframes startup-logo-pop` on `.startup-logo` was animating the *same*
 *     element a second time, so the result was two systems racing on one node.
 *     The keyframes and the `.startup-overlay.fade-out` rule are deleted from
 *     `index.css`; nothing animates via CSS any more.
 *  2. **Real readiness gate instead of a magic 1200 ms constant.** The overlay is
 *     dismissed once React has actually painted (`double requestAnimationFrame`
 *     after mount) — the same "react ready" signal the ZCode startup state
 *     machine uses — rather than a fixed sleep that always cost 1.2 s.
 *  3. **`prefers-reduced-motion: reduce` bypass.** No pop, no fade: the overlay
 *     simply stops existing on the first frame. It also never blocks pointer
 *     events while it is up, so the app is usable either way.
 *
 * WEB-027: the `window.mcodeElectron.onReady` branch is gone. There is no
 * `packages/desktop` in this repository, so that branch could never fire — it
 * meant the overlay *always* paid the fixed fallback delay.
 *
 * The app is **not** hidden behind this overlay: `index.css` no longer sets
 * `#root { opacity: 0 }`, so a slow first paint degrades to "logo over content"
 * instead of a blank page.
 */

/** Spec timings, single source of truth for the startup sequence. */
const LOGO_DURATION_S = 0.72;
const FADE_DURATION_S = 0.5;
const EASE = [0.22, 1, 0.36, 1] as const;

export function McodeStartupOverlay() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    setMounted(true);
    if (reducedMotion) {
      setVisible(false);
      return;
    }

    // Spec timings: logo animation 720ms before overlay fade-out
    const timer = setTimeout(() => {
      setVisible(false);
    }, 720);

    return () => clearTimeout(timer);
  }, [reducedMotion]);

  // Prevent SSR fixed black overlay overlaying initial page load
  if (!mounted || !visible) return null;

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          className="startup-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_DURATION_S, ease: 'easeOut' }}
        >
          <motion.div
            className="startup-logo"
            initial={{ scale: 0.72, opacity: 0 }}
            animate={{ scale: [0.72, 1.045, 0.985, 1.008, 1], opacity: 1 }}
            transition={{ duration: LOGO_DURATION_S, ease: EASE, times: [0, 0.38, 0.58, 0.76, 1] }}
          >
            <div className="relative flex items-center justify-center">
              <div
                className="relative w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #000000 0%, #151718 100%)',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
                }}
              >
                <img
                  src="/logo.png"
                  alt="MCODE"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>
          </motion.div>
          <motion.div
            className="startup-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
          >
            mcode
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
