import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export function PermissionModal({ request, onAnswer }) {
  const isVisible = request && request.status === 'running';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="w-full mb-4"
        >
          <div className="w-full bg-[#1e1a0a] border border-[#eab308]/30 rounded-xl p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#eab308] flex-shrink-0 mt-0.5" />
        <div className="flex flex-col gap-3 w-full">
          <div>
            <span className="text-sm font-semibold text-[#eab308]">Run this command?</span>
            <div className="mt-2 bg-black/40 p-2 rounded-lg border border-white/5 font-mono text-xs text-white/80 overflow-x-auto whitespace-pre">
              {request.command}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onAnswer(request.requestId, 'no')}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition"
            >
              Deny
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onAnswer(request.requestId, 'yes')}
              className="px-3 py-1.5 rounded-lg bg-[#eab308]/20 hover:bg-[#eab308]/30 text-[#eab308] text-xs font-medium transition"
            >
              Allow Once
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onAnswer(request.requestId, 'always')}
              className="px-3 py-1.5 rounded-lg bg-[#eab308] hover:bg-[#eab308]/90 text-black text-xs font-bold transition"
            >
              Always Allow
            </motion.button>
          </div>
        </div>
      </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
