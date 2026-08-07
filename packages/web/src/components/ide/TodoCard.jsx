import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export function TodoCard({ plan }) {
  if (!plan || !plan.todos) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-6 bg-[#111] rounded-xl border border-white/10 overflow-hidden shadow-lg"
    >
      <div className="p-3 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border-b border-white/5 flex items-center gap-2">
        <span className="text-xs font-semibold text-white/90">📋 Plan</span>
        <span className="text-xs text-white/50 truncate flex-1">{plan.summary}</span>
      </div>
      <div className="p-2 flex flex-col gap-1">
        {plan.todos.map((todo) => {
          const isDone = todo.status === 'done';
          const isRunning = todo.status === 'in_progress';

          return (
            <div key={todo.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </motion.div>
                ) : isRunning ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                ) : (
                  <Circle className="w-4 h-4 text-white/20" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-medium ${isDone ? 'text-white/40 line-through' : 'text-white/80'}`}>
                  {todo.title}
                </span>
                <span className="text-[11px] text-white/40 truncate">
                  {todo.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
