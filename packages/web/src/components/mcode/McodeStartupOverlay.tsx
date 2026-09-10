"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * StartupOverlay — replicates mcode's 2-stage startup animation.
 *
 * Stage 1: The logo and title pop in (720ms, cubic-bezier(0.22, 1, 0.36, 1)).
 * Stage 2: After the app signals "ready" (via window.mcodeElectron.onReady
 *   in Electron, or a short timeout in browser), the overlay fades out.
 *
 * The overlay is dismissed imperatively so it never blocks route changes
 * once the React tree has committed.
 */
export function McodeStartupOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hide = () => setVisible(false);

    if (typeof window !== 'undefined' && window.mcodeElectron?.onReady) {
      // Electron path: wait for the main process to confirm the React app is ready
      window.mcodeElectron.onReady(hide);
    } else {
      // Browser / Vite dev: fade out after a brief delay
      const timer = setTimeout(hide, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="startup-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="startup-logo"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <motion.rect
                width="100"
                height="100"
                rx="18"
                initial={{ fill: '#0c0c0c' }}
                animate={{ fill: '#10b981' }}
                transition={{ delay: 0.3, duration: 0.4 }}
              />
              <motion.path
                d="M30 50l10 10 30-30"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
              />
            </svg>
          </motion.div>
          <motion.div
            className="startup-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            mcode
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
