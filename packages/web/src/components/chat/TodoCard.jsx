import React from 'react';
import { motion } from 'framer-motion';
import { Check, CircleDashed, Loader2 } from 'lucide-react';

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
        {plan.todos.map((todo, idx) => (
          <div 
            key={todo.id || idx}
            className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
              todo.status === 'done' ? 'bg-green-500/5' : 
              todo.status === 'in_progress' ? 'bg-blue-500/10' : 'hover:bg-white/5'
            }`}
          >
            <div className="mt-0.5">
              {todo.status === 'done' ? (
                <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-green-400" />
                </div>
              ) : todo.status === 'in_progress' ? (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              ) : (
                <CircleDashed className="w-4 h-4 text-white/20" />
              )}
            </div>
            <div className="flex-1 flex flex-col">
              <span className={`text-sm ${todo.status === 'done' ? 'text-white/40 line-through' : 'text-white/90'}`}>
                {todo.title}
              </span>
              {todo.files && todo.files.length > 0 && (
                <span className="text-[10px] text-white/30 font-mono mt-1 break-all">
                  {todo.files.join(', ')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
