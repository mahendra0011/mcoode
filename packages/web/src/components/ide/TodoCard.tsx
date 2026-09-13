import React from 'react';
import { motion } from 'framer-motion';
import { Circle } from 'lucide-react';

interface TodoItem {
  id?: string | number;
  title?: string;
  description?: string;
  status?: string;
}
export interface TodoCardProps {
  plan?: {
    todos?: TodoItem[];
    summary?: string;
    designSystem?: {
      colors: Record<string, string>;
      fonts: { heading: string; body: string; mono?: string };
      spacingScale?: string;
      componentStyle?: string;
      tone?: string;
    };
  };
}

export function TodoCard({ plan }: TodoCardProps) {
  if (!plan || !plan.todos) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="w-full mb-6 bg-[#111] rounded-xl border border-white/10 overflow-hidden shadow-lg"
    >
      <div className="p-3 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border-b border-white/5 flex items-center gap-2">
        <span className="text-xs font-semibold text-white/90">📋 Plan</span>
        <span className="text-xs text-white/50 truncate flex-1">{plan.summary}</span>
      </div>

      {plan.designSystem && (
        <div className="px-3 py-2.5 border-b border-white/5">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Design System</div>
          {plan.designSystem.colors && (
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(plan.designSystem.colors).map(([name, hex]) => (
                <div key={name} className="flex items-center gap-1.5 bg-white/5 rounded-full pl-1 pr-2 py-0.5">
                  <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: hex }} />
                  <span className="text-[10px] text-white/60">{name}</span>
                  <span className="text-[9px] text-white/30 font-mono">{hex}</span>
                </div>
              ))}
            </div>
          )}
          {plan.designSystem.fonts && (
            <div className="flex gap-3 text-[11px] text-white/50">
              {plan.designSystem.fonts.heading && (
                <span>Heading: <span className="text-white/70">{plan.designSystem.fonts.heading}</span></span>
              )}
              {plan.designSystem.fonts.body && (
                <span>Body: <span className="text-white/70">{plan.designSystem.fonts.body}</span></span>
              )}
            </div>
          )}
          {plan.designSystem.tone && (
            <div className="text-[11px] text-white/40 mt-1 italic">"{plan.designSystem.tone}"</div>
          )}
        </div>
      )}

      <div className="p-2 flex flex-col gap-1">
        {plan.todos.map((todo, idx) => {
          const isDone = todo.status === 'done';
          const isRunning = todo.status === 'in_progress';

          return (
            <div key={todo.id != null && String(todo.id).trim() ? String(todo.id) : `todo-item-${idx}`} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  >
                    <motion.svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-emerald-400 w-4 h-4"
                    >
                      <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        d="M5 12.5l5 5 9-9"
                      />
                    </motion.svg>
                  </motion.div>
                ) : isRunning ? (
                  <motion.div
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-4 h-4 rounded-full bg-blue-400"
                  />
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
