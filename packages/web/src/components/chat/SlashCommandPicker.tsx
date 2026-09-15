import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [activeCategory, setActiveCategory] = useState<string>('modes');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const query = prompt.startsWith('/') ? prompt.slice(1).trim() : prompt.trim();
  const effectiveCategory = query.length > 0 ? 'all' : activeCategory;

  const { filtered, groups } = useMemo(() => {
    return getGroupedSlashCommands(activeTab, query, effectiveCategory);
  }, [activeTab, query, effectiveCategory]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedCmdIndex(0);
    } else if (selectedCmdIndex >= filtered.length) {
      setSelectedCmdIndex(0);
    }
  }, [filtered.length, selectedCmdIndex, setSelectedCmdIndex]);

  useEffect(() => {
    const el = itemRefs.current.get(selectedCmdIndex);
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedCmdIndex]);

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
    <div
      className={`absolute bottom-full left-0 mb-2 w-[580px] sm:w-[680px] max-h-[460px] bg-[#121316] border border-white/10 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden text-left text-xs ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Category Tabs (Single line, no text wrapping) */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between gap-3 bg-white/[0.02]">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap">
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
                className={`px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white/10 text-white font-medium border border-white/10 shadow-sm'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="text-[11px] text-white/30 font-mono">({count})</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setSelectedCmdIndex(0);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeCategory === 'all' && query.length === 0
                ? 'bg-white/10 text-white font-medium border border-white/10 shadow-sm'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span>All</span>
            <span className="text-[11px] text-white/30 font-mono">({categoryCounts.all || 0})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded font-mono shrink-0"
        >
          Esc
        </button>
      </div>

      {/* Commands List (Spacious with complete readable details) */}
      <div
        ref={scrollContainerRef}
        className="relative overflow-y-auto max-h-[380px] p-2 space-y-1"
      >
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-white/40 text-xs">
            No commands matching <span className="text-white/70 font-mono">/{query}</span>
          </div>
        ) : (
          groups.map((group) => {
            const showCategoryHeader = effectiveCategory === 'all' && groups.length > 1;

            return (
              <div key={group.category.id} className="space-y-1">
                {showCategoryHeader && (
                  <div className="px-2.5 pt-2.5 pb-1 text-[11px] font-semibold text-white/30 uppercase tracking-wider flex items-center gap-2">
                    <span>{group.category.icon}</span>
                    <span>{group.category.label}</span>
                  </div>
                )}

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
                      className={`w-full text-left rounded-xl px-3 py-2 transition flex items-start gap-3 cursor-pointer border ${
                        isSelected
                          ? 'bg-white/10 text-white border-white/10 shadow-sm'
                          : 'text-white/80 hover:bg-white/[0.04] border-transparent'
                      }`}
                    >
                      {/* Simple Icon Badge */}
                      <span className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center text-base shrink-0 mt-0.5">
                        {c.icon}
                      </span>

                      {/* Info & Full Details */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13px] text-white">
                            {c.name || c.cmd}
                          </span>
                          <span className="font-mono text-xs text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            /{c.cmd}
                          </span>
                        </div>

                        {/* Full Description — NO truncate, completely readable */}
                        <p className="text-xs text-white/50 leading-relaxed break-words whitespace-normal mt-1">
                          {c.desc}
                        </p>
                      </div>

                      {/* Enter hint */}
                      {isSelected && (
                        <span className="text-[11px] font-mono text-white/40 shrink-0 self-center px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                          ↵ Enter
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Minimal Footer */}
      <div className="px-3 py-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/30 bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <span><kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono">↵</kbd> select</span>
          <span><kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono">esc</kbd> close</span>
        </div>
        <span className="text-white/20 font-mono">
          {filtered.length} {filtered.length === 1 ? 'command' : 'commands'}
        </span>
      </div>
    </div>
  );
};
