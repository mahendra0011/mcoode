import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ChevronUp, Zap, Sparkles, MoveHorizontal } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setOutputLength, type OutputLength } from '../../store/chatSlice';

export interface OutputLengthLevel {
  id: OutputLength;
  label: string;
  shortLabel: string;
  tokens: number;
  badge: string;
  desc: string;
  color: string;
  glowColor: string;
}

export const OUTPUT_LENGTH_LEVELS: OutputLengthLevel[] = [
  {
    id: 'very_low',
    label: 'Very Low',
    shortLabel: 'V-Low',
    tokens: 512,
    badge: '512',
    desc: 'Ultra-fast bullet points & micro snippets',
    color: '#38bdf8', // sky-400
    glowColor: 'rgba(56, 189, 248, 0.35)',
  },
  {
    id: 'low',
    label: 'Low',
    shortLabel: 'Low',
    tokens: 1024,
    badge: '1K',
    desc: 'Concise answers & single functions',
    color: '#60a5fa', // blue-400
    glowColor: 'rgba(96, 165, 250, 0.35)',
  },
  {
    id: 'mid',
    label: 'Mid',
    shortLabel: 'Mid',
    tokens: 2048,
    badge: '2K',
    desc: 'Standard balanced code & explanations',
    color: '#34d399', // emerald-400
    glowColor: 'rgba(52, 211, 153, 0.35)',
  },
  {
    id: 'high',
    label: 'High',
    shortLabel: 'High',
    tokens: 4096,
    badge: '4K',
    desc: 'Detailed multi-function implementations',
    color: '#2dd4bf', // teal-400
    glowColor: 'rgba(45, 212, 191, 0.35)',
  },
  {
    id: 'xhigh',
    label: 'X-High',
    shortLabel: 'X-High',
    tokens: 8192,
    badge: '8K',
    desc: 'Full multi-component files & styling',
    color: '#a855f7', // purple-500
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  {
    id: 'max',
    label: 'Max',
    shortLabel: 'Max',
    tokens: 16384,
    badge: '16K',
    desc: 'Comprehensive multi-file projects',
    color: '#ec4899', // pink-500
    glowColor: 'rgba(236, 72, 153, 0.4)',
  },
  {
    id: 'ultra',
    label: 'Ultra',
    shortLabel: 'Ultra',
    tokens: 32768,
    badge: '32K',
    desc: 'Massive full-stack architecture & systems',
    color: '#f59e0b', // amber-500
    glowColor: 'rgba(245, 158, 11, 0.45)',
  },
];

export interface OutputLengthSelectorProps {
  compact?: boolean;
  className?: string;
}

export function OutputLengthSelector({ compact = false, className = '' }: OutputLengthSelectorProps) {
  const dispatch = useAppDispatch();
  const currentLengthId = useAppSelector((s) => s.chat.outputLength || 'xhigh');
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sliderBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const activeLevel = OUTPUT_LENGTH_LEVELS.find((l) => l.id === currentLengthId) || OUTPUT_LENGTH_LEVELS[4];
  const activeIndex = OUTPUT_LENGTH_LEVELS.findIndex((l) => l.id === currentLengthId);

  // Close popup on click outside (only when not dragging)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (isDraggingRef.current) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = useCallback((id: OutputLength) => {
    dispatch(setOutputLength(id));
  }, [dispatch]);

  // Update target index continuously based on clientX position
  const updateIndexFromPointer = useCallback((clientX: number) => {
    const targetElement = trackRef.current || sliderBarRef.current;
    if (!targetElement) return;
    const rect = targetElement.getBoundingClientRect();
    if (rect.width <= 0) return;

    const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = relativeX / rect.width;
    const count = OUTPUT_LENGTH_LEVELS.length;
    const index = Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
    const targetLevel = OUTPUT_LENGTH_LEVELS[index];
    if (targetLevel) {
      dispatch(setOutputLength(targetLevel.id));
    }
  }, [dispatch]);

  // Global pointer move and pointer up listeners during active slide/drag
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      updateIndexFromPointer(e.clientX);
    };

    const handleGlobalPointerUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [isDragging, updateIndexFromPointer]);

  // Start swipe / drag interaction
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary mouse button or touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isDraggingRef.current = true;
    setIsDragging(true);

    const el = e.currentTarget;
    if (typeof el.setPointerCapture === 'function') {
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {
        void err;
      }
    }
    updateIndexFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updateIndexFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      const el = e.currentTarget;
      if (typeof el.releasePointerCapture === 'function') {
        try {
          if (el.hasPointerCapture(e.pointerId)) {
            el.releasePointerCapture(e.pointerId);
          }
        } catch (err) {
          void err;
        }
      }
    }
  };

  // Keyboard navigation when popup is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = Math.max(0, activeIndex - 1);
        handleSelect(OUTPUT_LENGTH_LEVELS[prev].id);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = Math.min(OUTPUT_LENGTH_LEVELS.length - 1, activeIndex + 1);
        handleSelect(OUTPUT_LENGTH_LEVELS[next].id);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, handleSelect]);

  // Wheel scrub support
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY > 0 || e.deltaX > 0) {
      const next = Math.min(OUTPUT_LENGTH_LEVELS.length - 1, activeIndex + 1);
      handleSelect(OUTPUT_LENGTH_LEVELS[next].id);
    } else if (e.deltaY < 0 || e.deltaX < 0) {
      const prev = Math.max(0, activeIndex - 1);
      handleSelect(OUTPUT_LENGTH_LEVELS[prev].id);
    }
  };

  const progressPercent = Math.round((activeIndex / (OUTPUT_LENGTH_LEVELS.length - 1)) * 100);

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1 rounded-lg border transition-all cursor-pointer font-mono whitespace-nowrap ${
          compact ? 'px-1.5 py-1 text-[11px] h-7' : 'px-2.5 py-1 text-xs h-8'
        } ${
          isOpen
            ? 'bg-white/[0.08] border-white/20 text-white shadow-sm'
            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-white/20 text-white/70 hover:text-white'
        }`}
        title={`Output Length: ${activeLevel.label} (${activeLevel.badge} tokens) — Click to slide/change`}
      >
        <SlidersHorizontal
          className="w-3 h-3 flex-shrink-0 transition-colors"
          style={{ color: activeLevel.color }}
        />
        {!compact && (
          <span className="font-semibold text-white/90">
            {activeLevel.shortLabel}
          </span>
        )}
        <span
          className="px-1 py-0.2 rounded text-[9.5px] font-semibold border flex-shrink-0 transition-colors"
          style={{
            backgroundColor: `${activeLevel.color}15`,
            borderColor: `${activeLevel.color}35`,
            color: activeLevel.color,
          }}
        >
          {activeLevel.badge}
        </span>
        <ChevronUp
          className={`w-2.5 h-2.5 text-white/40 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Codex-Style Swipe Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute bottom-full ${
              compact
                ? '-right-[95px] sm:-right-[100px] w-[265px] sm:w-[275px]'
                : 'right-0 w-[330px] sm:w-[360px]'
            } mb-2.5 z-50 p-3 rounded-2xl bg-[#121217]/98 border border-white/15 backdrop-blur-xl shadow-2xl font-mono select-none max-w-[calc(100vw-24px)]`}
            style={{
              boxShadow: `0 20px 40px -15px rgba(0,0,0,0.8), 0 0 35px -10px ${activeLevel.glowColor}`,
            }}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ backgroundColor: `${activeLevel.color}20` }}
                >
                  <Zap size={11} style={{ color: activeLevel.color }} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-white tracking-wide leading-tight">
                    Output Length
                  </div>
                  <div className="text-[9px] text-white/40 leading-none">
                    Codex Swipe Control
                  </div>
                </div>
              </div>

              {/* Active Pill Badge */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-all"
                  style={{
                    backgroundColor: `${activeLevel.color}20`,
                    borderColor: `${activeLevel.color}40`,
                    color: activeLevel.color,
                    boxShadow: `0 0 10px ${activeLevel.glowColor}`,
                  }}
                >
                  {activeLevel.label} · {activeLevel.badge}
                </span>
              </div>
            </div>

            {/* Description Text */}
            <p className="text-[10px] text-white/60 mb-2 leading-snug line-clamp-2">
              {activeLevel.desc}
            </p>

            {/* Interactive Codex Segmented Swipe Track */}
            <div
              ref={trackRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
              style={{ touchAction: 'none' }}
              className={`relative p-0.5 rounded-xl bg-[#0a0a0e] border shadow-inner flex items-center justify-between transition-all select-none touch-none ${
                isDragging
                  ? 'border-white/30 cursor-grabbing ring-1 ring-white/20'
                  : 'border-white/10 cursor-grab hover:border-white/20'
              }`}
            >
              {/* Background Ambient Active Glow */}
              <div
                className="absolute inset-y-0.5 left-0.5 rounded-lg transition-all duration-300 opacity-20 pointer-events-none"
                style={{
                  width: `${((activeIndex + 1) / OUTPUT_LENGTH_LEVELS.length) * 100}%`,
                  background: `linear-gradient(90deg, #38bdf8, ${activeLevel.color})`,
                }}
              />

              {/* Segmented Options with Smooth Sliding Pill */}
              {OUTPUT_LENGTH_LEVELS.map((level, idx) => {
                const isSelected = level.id === currentLengthId;
                return (
                  <div
                    key={level.id}
                    role="button"
                    tabIndex={0}
                    onDragStart={(e) => e.preventDefault()}
                    onClick={() => handleSelect(level.id)}
                    onPointerEnter={() => {
                      if (isDraggingRef.current && level.id !== currentLengthId) {
                        handleSelect(level.id);
                      }
                    }}
                    className={`relative z-10 flex-1 py-1 px-0.5 text-center transition-all select-none cursor-pointer rounded-lg ${
                      isSelected ? 'text-white font-bold' : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    {/* Active Sliding Indicator (Codex Animation) */}
                    {isSelected && (
                      <motion.div
                        layoutId="active-length-pill"
                        transition={{ type: 'spring', stiffness: 550, damping: 36 }}
                        className="absolute inset-0 rounded-lg shadow-lg border"
                        style={{
                          backgroundColor: `${level.color}25`,
                          borderColor: `${level.color}65`,
                          boxShadow: `0 0 14px ${level.glowColor}`,
                        }}
                      />
                    )}

                    <div className="relative z-20 flex flex-col items-center pointer-events-none">
                      <span className="text-[9px] tracking-tight whitespace-nowrap">
                        {level.shortLabel}
                      </span>
                      <span className="text-[8px] opacity-60 font-semibold leading-tight">
                        {level.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Continuous Slider Rail with Draggable Glowing Thumb */}
            <div
              ref={sliderBarRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
              style={{ touchAction: 'none' }}
              className={`relative mt-2.5 px-1 py-1 select-none touch-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              {/* Rail Track Background */}
              <div className="relative h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                {/* Gradient Fill connecting to active thumb */}
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, #38bdf8 0%, ${activeLevel.color} 100%)`,
                    boxShadow: `0 0 8px ${activeLevel.glowColor}`,
                  }}
                  animate={{
                    width: `${progressPercent}%`,
                  }}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              </div>

              {/* Step Tick Marks */}
              <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none px-0.5">
                {OUTPUT_LENGTH_LEVELS.map((lvl, idx) => (
                  <div
                    key={lvl.id}
                    className={`w-1 h-1 rounded-full transition-all duration-200 ${
                      idx <= activeIndex ? 'bg-white shadow-sm scale-110' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>

              {/* Draggable Glowing Slider Handle / Thumb */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full border-2 border-white bg-[#0f0f13] flex items-center justify-center shadow-xl pointer-events-none"
                style={{
                  borderColor: activeLevel.color,
                  boxShadow: `0 0 12px ${activeLevel.glowColor}, inset 0 0 4px ${activeLevel.color}`,
                }}
                animate={{
                  left: `calc(4px + ${(activeIndex / (OUTPUT_LENGTH_LEVELS.length - 1))} * (100% - 8px))`,
                  scale: isDragging ? 1.3 : 1,
                }}
                transition={{ type: 'spring', stiffness: 550, damping: 34 }}
              >
                <div
                  className="w-1 h-1 rounded-full transition-colors"
                  style={{ backgroundColor: activeLevel.color }}
                />
              </motion.div>
            </div>

            {/* Helper Footer */}
            <div className="flex items-center justify-between mt-1.5 pt-1.5 text-[9.5px] text-white/40 border-t border-white/[0.04]">
              <span className="flex items-center gap-1">
                <MoveHorizontal size={11} className="text-emerald-400" />
                <span>Swipe, drag or click to switch</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/10 font-semibold"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
