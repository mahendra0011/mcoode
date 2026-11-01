import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, X, AlertTriangle, ChevronDown, ChevronUp, Palette } from 'lucide-react';

interface TodoItem {
  id?: string | number;
  title?: string;
  description?: string;
  status?: string;
  error?: string | null;
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
  defaultCollapsed?: boolean;
}

export function TodoCard({ plan, defaultCollapsed }: TodoCardProps) {
  const userInteractedRef = useRef(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof defaultCollapsed === 'boolean') return defaultCollapsed;
    return false;
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDesignSystem, setShowDesignSystem] = useState(false);

  useEffect(() => {
    if (!userInteractedRef.current && typeof defaultCollapsed === 'boolean') {
      setIsCollapsed(defaultCollapsed);
    }
  }, [defaultCollapsed]);

  if (!plan || !plan.todos || plan.todos.length === 0) return null;

  const todos = plan.todos;
  const totalCount = todos.length;
  const doneCount = todos.filter((t) => t.status === 'done').length;
  const inProgressTodo = todos.find((t) => t.status === 'in_progress');
  const failedCount = todos.filter((t) => t.status === 'failed').length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleToggleCollapse = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    userInteractedRef.current = true;
    setIsCollapsed((prev) => !prev);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    userInteractedRef.current = true;
    setIsDismissed(true);
  };

  // If dismissed, render a small restore pill so user can get 100% chat view
  if (isDismissed) {
    return (
      <div className="w-full flex items-center justify-between mb-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            userInteractedRef.current = true;
            setIsDismissed(false);
            setIsCollapsed(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-[11px] text-emerald-400 font-medium transition cursor-pointer shadow-sm"
          title="Restore plan card"
        >
          <span>📋 Show Plan ({doneCount}/{totalCount})</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Collapsed compact bar (takes only ~34px height)
  if (isCollapsed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleToggleCollapse}
        className="w-full mb-2 bg-[#121215] hover:bg-[#16161a] border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 flex items-center justify-between cursor-pointer transition select-none shadow-md group flex-shrink-0"
        title="Click to expand plan"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5 flex-shrink-0">
            📋 Plan
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium font-mono flex-shrink-0">
            {doneCount}/{totalCount}
          </span>
          <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden flex-shrink-0 hidden xs:block">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-[11px] text-white/50 truncate flex-1">
            {inProgressTodo ? (
              <span className="text-emerald-300/90 font-medium flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {inProgressTodo.title}
              </span>
            ) : (
              plan.summary || 'Build tasks'
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="flex items-center gap-1 text-[10.5px] font-medium text-white/50 group-hover:text-white transition cursor-pointer"
          >
            <span>Expand</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-md text-white/30 hover:text-white/80 hover:bg-white/10 transition cursor-pointer"
            title="Hide plan card"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Expanded card (capped height, never blocks whole screen)
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="w-full mb-2 bg-[#111114] rounded-xl border border-white/10 overflow-hidden shadow-lg flex-shrink-0"
    >
      {/* Header */}
      <div
        onClick={handleToggleCollapse}
        className="p-2.5 px-3 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent border-b border-white/5 flex items-center justify-between gap-2 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-semibold text-white/90 flex-shrink-0">📋 Plan</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium font-mono flex-shrink-0">
            {doneCount}/{totalCount}
          </span>
          <span className="text-xs text-white/50 truncate flex-1">{plan.summary}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {plan.designSystem && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDesignSystem((v) => !v);
              }}
              className={`p-1 rounded-md transition cursor-pointer ${
                showDesignSystem
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Design System"
            >
              <Palette className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Collapse plan"
          >
            <span>Collapse</span>
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Hide plan card"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Optional Collapsible Design System */}
      <AnimatePresence>
        {showDesignSystem && plan.designSystem && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 py-2 border-b border-white/5 bg-black/20 overflow-hidden"
          >
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Design System</div>
            {plan.designSystem.colors && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {Object.entries(plan.designSystem.colors).map(([name, hex]) => (
                  <div key={name} className="flex items-center gap-1 bg-white/5 rounded-full pl-1 pr-2 py-0.5">
                    <div className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ background: hex }} />
                    <span className="text-[9.5px] text-white/60">{name}</span>
                  </div>
                ))}
              </div>
            )}
            {plan.designSystem.fonts && (
              <div className="flex gap-2 text-[10px] text-white/50">
                {plan.designSystem.fonts.heading && (
                  <span>Heading: <span className="text-white/70">{plan.designSystem.fonts.heading}</span></span>
                )}
                {plan.designSystem.fonts.body && (
                  <span>Body: <span className="text-white/70">{plan.designSystem.fonts.body}</span></span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Todos List — Bounded height with scrollbar so it NEVER pushes chat out of view */}
      <div className="p-1.5 flex flex-col gap-0.5 max-h-[190px] overflow-y-auto custom-scrollbar">
        {todos.map((todo, idx) => {
          const isDone = todo.status === 'done';
          const isRunning = todo.status === 'in_progress';
          const isFailed = todo.status === 'failed';
          const isNeedsReview = todo.status === 'needs_review';

          return (
            <div
              key={todo.id != null && String(todo.id).trim() ? String(todo.id) : `todo-item-${idx}`}
              className={`flex items-start gap-2.5 p-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors border ${
                isRunning
                  ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                  : isFailed
                  ? 'border-red-500/30 bg-red-500/[0.03]'
                  : isNeedsReview
                  ? 'border-amber-500/30 bg-amber-500/[0.03]'
                  : 'border-transparent'
              }`}
              title={isFailed && todo.error ? todo.error : undefined}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-emerald-400 w-3.5 h-3.5"
                    >
                      <path d="M5 12.5l5 5 9-9" />
                    </svg>
                  </motion.div>
                ) : isRunning ? (
                  <div className="w-3.5 h-3.5 flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75 inline-block" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 absolute inline-block" />
                  </div>
                ) : isFailed ? (
                  <X className="w-3.5 h-3.5 text-red-400" />
                ) : isNeedsReview ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-white/20" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span
                  className={`text-xs font-medium flex items-center gap-1.5 leading-snug ${
                    isDone
                      ? 'text-white/40 line-through'
                      : isRunning
                      ? 'text-emerald-300 font-semibold'
                      : isFailed
                      ? 'text-red-400'
                      : 'text-white/80'
                  }`}
                >
                  <span className="truncate">{todo.title}</span>
                  {isNeedsReview && (
                    <span className="text-[8.5px] uppercase tracking-wider font-semibold px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0">
                      Review
                    </span>
                  )}
                </span>
                {(todo.description || (isFailed && todo.error)) && (
                  <span className="text-[10px] text-white/40 truncate leading-tight mt-0.5">
                    {isFailed && todo.error ? todo.error : todo.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Hint */}
      <div
        onClick={handleToggleCollapse}
        className="px-3 py-1 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[10px] text-white/30 hover:text-white/60 cursor-pointer select-none"
      >
        <span>{percent}% completed ({doneCount}/{totalCount})</span>
        <span className="flex items-center gap-1">Click to collapse <ChevronUp className="w-2.5 h-2.5" /></span>
      </div>
    </motion.div>
  );
}
