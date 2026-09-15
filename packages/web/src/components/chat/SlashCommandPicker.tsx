import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  SLASH_CATEGORIES,
  getAvailableSlashCommands,
  getGroupedSlashCommands,
} from '../../lib/slashCommands';

export interface SlashCommandPickerProps {
  activeTab: string;
  prompt: string;
  selectedCmdIndex: number;
  setSelectedCmdIndex: React.Dispatch<React.SetStateAction<number>>;
  onSelectCommand: (cmdName: string) => void;
  onClose: () => void;
  className?: string;
}

export const SlashCommandPicker: React.FC<SlashCommandPickerProps> = ({
  activeTab,
  prompt,
  selectedCmdIndex,
  setSelectedCmdIndex,
  onSelectCommand,
  onClose,
  className = '',
}) => {
  // Modes category is the default active view so user sees only all 14 modes first
  const [activeCategory, setActiveCategory] = useState<string>('modes');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Extract query from prompt (e.g. "/gi" -> "gi", "/" -> "")
  const query = prompt.startsWith('/') ? prompt.slice(1).trim() : prompt.trim();

  // If user is actively searching with letters, search across 'all' so they don't miss matches
  const effectiveCategory = query.length > 0 ? 'all' : activeCategory;

  // Get filtered commands and categorized groups
  const { filtered, groups } = useMemo(() => {
    return getGroupedSlashCommands(activeTab, query, effectiveCategory);
  }, [activeTab, query, effectiveCategory]);

  // Ensure selectedCmdIndex stays within bounds
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedCmdIndex(0);
    } else if (selectedCmdIndex >= filtered.length) {
      setSelectedCmdIndex(0);
    }
  }, [filtered.length, selectedCmdIndex, setSelectedCmdIndex]);

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current.get(selectedCmdIndex);
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedCmdIndex]);

  // Count commands by category
  const allCommands = useMemo(() => getAvailableSlashCommands(activeTab), [activeTab]);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allCommands.length };
    for (const cat of SLASH_CATEGORIES) {
      counts[cat.id] = allCommands.filter((c: any) => c.category === cat.id).length;
    }
    return counts;
  }, [allCommands]);

  let globalIndexCounter = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute bottom-full left-0 mb-3 w-[420px] sm:w-[500px] max-h-[460px] bg-[#0d0e12]/98 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(245,158,11,0.08)] flex flex-col z-50 overflow-hidden text-left ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar: Title + Category Tabs */}
      <div className="px-3 pt-3 pb-2.5 border-b border-white/10 bg-white/[0.03] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Command Palette
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold border border-amber-500/30">
              {filtered.length} {filtered.length === 1 ? 'command' : 'commands'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-white/50 hover:text-white transition px-2 py-0.5 rounded-md hover:bg-white/10 font-mono"
          >
            Esc
          </button>
        </div>

        {/* Category Pills (Modes first) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {SLASH_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id && query.length === 0;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSelectedCmdIndex(0);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 shrink-0 text-xs font-semibold cursor-pointer border ${
                  isActive
                    ? `${cat.badge} shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40`
                    : 'text-white/60 hover:text-white hover:bg-white/10 border-white/5'
                }`}
                title={cat.description}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
                  {count}
                </span>
              </button>
            );
          })}

          {/* All tab */}
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setSelectedCmdIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 shrink-0 text-xs font-medium cursor-pointer border ${
              activeCategory === 'all' && query.length === 0
                ? 'bg-white/20 text-white border-white/40 shadow-sm font-semibold'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5 border-transparent'
            }`}
          >
            <span>✨ All</span>
            <span className="text-[10px] opacity-70">({categoryCounts.all || 0})</span>
          </button>
        </div>
      </div>

      {/* Main Command List grouped by category */}
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto max-h-[330px] p-2 space-y-3 divide-y divide-white/5"
      >
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-white/40 text-xs">
            <span className="text-2xl block mb-2">🔍</span>
            No matching commands found for <span className="text-white/80 font-mono">/{query}</span>
          </div>
        ) : (
          groups.map((group) => {
            const isModesGroup = group.category.id === 'modes';

            return (
              <div key={group.category.id} className="pt-2 first:pt-0">
                {/* Category Header */}
                <div className={`flex items-center justify-between px-2.5 py-1.5 mb-1.5 rounded-lg ${
                  isModesGroup ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/[0.02]'
                }`}>
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                    <span className="text-sm">{group.category.icon}</span>
                    <span className={isModesGroup ? 'text-amber-300' : 'text-white/70'}>
                      {group.category.label}
                    </span>
                    {isModesGroup && (
                      <span className="text-[10px] font-normal lowercase tracking-normal text-amber-400/80 px-1.5 py-0.2 rounded bg-amber-400/10">
                        autonomous execution
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/40 font-mono">
                    {group.commands.length} {group.commands.length === 1 ? 'mode' : 'modes'}
                  </span>
                </div>

                {/* Commands in this category */}
                <div className="space-y-1">
                  {group.commands.map((c: any) => {
                    const currentIndex = globalIndexCounter++;
                    const isSelected = currentIndex === selectedCmdIndex;

                    return (
                      <button
                        key={c.cmd}
                        ref={(el) => {
                          if (el) itemRefs.current.set(currentIndex, el);
                          else itemRefs.current.delete(currentIndex);
                        }}
                        type="button"
                        onMouseEnter={() => setSelectedCmdIndex(currentIndex)}
                        onClick={() => {
                          onSelectCommand(c.cmd);
                          onClose();
                          setSelectedCmdIndex(0);
                        }}
                        className={`w-full text-left rounded-xl px-3 py-2 transition-all duration-150 flex items-center gap-3 group cursor-pointer border ${
                          isSelected
                            ? isModesGroup
                              ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-white border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                              : 'bg-gradient-to-r from-emerald-500/20 via-white/10 to-transparent text-white border-emerald-500/40 shadow-sm'
                            : 'text-white/80 hover:bg-white/5 hover:text-white border-transparent'
                        }`}
                      >
                        {/* Icon badge */}
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 shadow-inner border ${
                          isModesGroup
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            : 'bg-white/5 border-white/10'
                        }`}>
                          {c.icon}
                        </span>

                        {/* Middle info: Name + Command + Description */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white group-hover:text-amber-200 transition-colors">
                              {c.name || c.cmd}
                            </span>
                            <span className="font-mono text-[11px] text-emerald-400/90 font-medium px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                              /{c.cmd}
                            </span>
                          </div>
                          <span className="text-[11px] text-white/50 group-hover:text-white/80 truncate mt-0.5">
                            {c.desc}
                          </span>
                        </div>

                        {/* Tag & Selection shortcut */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          {isModesGroup ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-amber-500/15 text-amber-300 border-amber-500/30">
                              MODE
                            </span>
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${group.category.badge}`}>
                              {group.category.label}
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded hidden sm:inline-block">
                              ↵ Enter
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer shortcut hints */}
      <div className="px-3.5 py-2 bg-black/60 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
        <div className="flex items-center gap-3">
          <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white/70">↑↓</kbd> Select</span>
          <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white/70">↵</kbd> Run</span>
          <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white/70">Esc</kbd> Close</span>
        </div>
        <span className="text-amber-400/70 font-medium hidden sm:inline">
          💡 14 Autonomous Modes Available
        </span>
      </div>
    </motion.div>
  );
};
