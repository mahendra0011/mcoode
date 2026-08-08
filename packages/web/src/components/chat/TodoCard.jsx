import React from 'react';
import { motion } from 'framer-motion';
import { Circle } from 'lucide-react';

export const TodoCard = ({ plan }) => {
  if (!plan || !plan.todos || plan.todos.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#18181b] border border-white/10 rounded-xl overflow-hidden shadow-lg mb-4"
    >
      <div className="bg-white/5 px-4 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider border-b border-white/5 flex items-center justify-between">
        <span>Execution Plan</span>
        <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full">{plan.todos.filter(t => t.status === 'done').length} / {plan.todos.length}</span>
      </div>
      
      {plan.summary && (
        <div className="px-4 py-3 text-sm text-white/80 border-b border-white/5 bg-black/20">
          {plan.summary}
        </div>
      )}
      
      <div className="p-2 flex flex-col gap-1">
        {plan.todos.map((todo, idx) => {
          const isDone = todo.status === 'done';
          const isRunning = todo.status === 'in_progress';

          return (
            <div key={todo.id || idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className="mt-0.5 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                {isDone ? (
                  // ✅ SVG draw-in animation for completed checkbox
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
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <motion.path
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      d="M5 12.5l5 5 9-9"
                    />
                  </motion.svg>
                ) : isRunning ? (
                  // ✅ Pulsing dot for in-progress
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
              <div className="flex-1 flex flex-col min-w-0">
                <span className={`text-sm ${isDone ? 'text-white/40 line-through' : 'text-white/90'}`}>
                  {todo.title}
                </span>
                {todo.files && todo.files.length > 0 && (
                  <span className="text-[10px] text-white/30 font-mono mt-1 break-all">
                    {todo.files.join(', ')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
