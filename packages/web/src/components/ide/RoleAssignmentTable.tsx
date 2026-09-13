import React from 'react';
import { motion } from 'framer-motion';
import { DOMAIN_COLORS, DOMAIN_BG } from './WaveProgress';

export interface RoleAssignment {
  domain: string;
  model: string;
  provider: string;
  todoCount: number;
}

export function RoleAssignmentTable({ assignments }: { assignments: RoleAssignment[] }) {
  if (!assignments || !assignments.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4 bg-[#111] rounded-xl border border-white/10 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-white/5 text-xs font-semibold text-white/70">Role Assignment</div>
      <div className="divide-y divide-white/5">
        {assignments.map((a) => (
          <div key={a.domain} className="flex items-center justify-between px-3 py-1.5 text-xs">
            <span className={`px-2 py-0.5 rounded-full ${DOMAIN_BG[a.domain] || 'bg-white/10'} ${DOMAIN_COLORS[a.domain] || 'text-white/60'} font-medium`}>
              {a.domain}
            </span>
            <span className="text-white/50 font-mono">{a.provider}/{a.model}</span>
            <span className="text-white/30">{a.todoCount} todo{a.todoCount !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
