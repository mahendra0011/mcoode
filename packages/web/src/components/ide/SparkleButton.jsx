import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Play, Pause } from 'lucide-react';

const SUGGESTIONS = [
  'Build a React dashboard',
  'Create a REST API',
  'Write unit tests',
  'Fix TypeScript errors',
  'Refactor this component',
  'Add dark mode support',
];

export function SparkleButton({ setPrompt, advancedMode, watchMode, onToggleWatch }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition text-xs font-medium border backdrop-blur-md ${
          open
            ? 'bg-gradient-to-r from-[#eab308]/10 to-[#f59e0b]/10 text-[#fcd34d] border-[#eab308]/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-amber-400'
        }`}
        title="Quick prompt suggestions"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 w-52 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 z-50"
          >
            {SUGGESTIONS.map((s, i) => (
              <motion.button
                key={i}
                onClick={() => { setPrompt(s); setOpen(false); }}
                className="w-full text-left text-xs text-white/60 hover:text-white hover:bg-white/5 px-3 py-2 rounded-lg transition flex items-center gap-2"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                {s}
              </motion.button>
            ))}
            {advancedMode && (
              <motion.button
                key="watch"
                onClick={() => { onToggleWatch?.(); setOpen(false); }}
                className="w-full text-left text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-3 py-2 rounded-lg transition flex items-center gap-2"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: SUGGESTIONS.length * 0.03 }}
              >
                {watchMode ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {watchMode ? 'Stop watching' : 'Watch this project'}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
