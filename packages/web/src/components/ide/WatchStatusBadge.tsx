import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

export interface WatchStatusBadgeProps {
  active: boolean;
  scansRun: number;
  fixesApplied: number;
  onClick: () => void;
}

export function WatchStatusBadge({ active, scansRun, fixesApplied, onClick }: WatchStatusBadgeProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
        active
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-white/5 text-white/40 border-white/5 hover:text-white/60'
      }`}
      title={active ? `Watch daemon running — ${scansRun} scans, ${fixesApplied} fixes` : 'Watch daemon inactive'}
    >
      <span className="relative flex h-2 w-2">
        {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-emerald-400' : 'bg-white/30'}`} />
      </span>
      {active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      {active && <span>{fixesApplied} fixed</span>}
    </motion.button>
  );
}
