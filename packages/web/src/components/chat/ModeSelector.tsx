import React from 'react';
import { motion } from 'framer-motion';
import { Bot, MessageSquare, Lightbulb } from 'lucide-react';
import { GodModeToggle } from './mcodeUX';

export interface ModeSelectorProps {
  mode: string;
  onModeChange: (mode: 'chat' | 'agent' | 'explain') => void;
  godMode?: boolean;
  onGodModeChange?: (godMode: boolean) => void;
  size?: 'sm' | 'xs';
  showGodMode?: boolean;
  className?: string;
  compact?: boolean;
}

export function ModeSelector({
  mode,
  onModeChange,
  godMode = false,
  onGodModeChange,
  size = 'xs',
  showGodMode = true,
  className = '',
  compact = false,
}: ModeSelectorProps) {
  const isXs = size === 'xs';

  return (
    <div className={`flex items-center gap-1 flex-nowrap flex-shrink-0 ${className}`}>
      {/* Segmented Mode Control */}
      <div
        role="radiogroup"
        aria-label="AI Mode Selection"
        className="flex items-center bg-[#141416] border border-white/10 rounded-lg p-0.5 shadow-inner flex-nowrap flex-shrink-0"
      >
        {/* Agent Mode */}
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'agent'}
          onClick={() => onModeChange('agent')}
          className={`relative flex items-center gap-1 rounded-md font-semibold transition-all cursor-pointer select-none whitespace-nowrap flex-shrink-0 ${
            isXs
              ? (compact && mode !== 'agent' ? 'p-1 text-[10.5px]' : 'px-1.5 py-0.5 text-[10.5px]')
              : (compact && mode !== 'agent' ? 'p-1.5 text-xs' : 'px-2.5 py-1 text-xs')
          } ${
            mode === 'agent'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-sm'
              : 'text-white/45 hover:text-white/90 hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Agent Mode: Autonomous execution — creates files, edits code, runs builds & tests"
        >
          <Bot className={isXs ? 'w-2.5 h-2.5 text-emerald-400' : 'w-3.5 h-3.5 text-emerald-400'} />
          {(!compact || mode === 'agent') && <span>Agent</span>}
        </button>

        {/* Chat Mode */}
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'chat'}
          onClick={() => onModeChange('chat')}
          className={`relative flex items-center gap-1 rounded-md font-medium transition-all cursor-pointer select-none whitespace-nowrap flex-shrink-0 ${
            isXs
              ? (compact && mode !== 'chat' ? 'p-1 text-[10.5px]' : 'px-1.5 py-0.5 text-[10.5px]')
              : (compact && mode !== 'chat' ? 'p-1.5 text-xs' : 'px-2.5 py-1 text-xs')
          } ${
            mode === 'chat'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/35 shadow-sm font-semibold'
              : 'text-white/45 hover:text-white/90 hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Chat Mode: Conversational assistant — Q&A, brainstorming, architecture exploration"
        >
          <MessageSquare className={isXs ? 'w-2.5 h-2.5 text-blue-400' : 'w-3.5 h-3.5 text-blue-400'} />
          {(!compact || mode === 'chat') && <span>Chat</span>}
        </button>

        {/* Explain Mode */}
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'explain'}
          onClick={() => onModeChange('explain')}
          className={`relative flex items-center gap-1 rounded-md font-medium transition-all cursor-pointer select-none whitespace-nowrap flex-shrink-0 ${
            isXs
              ? (compact && mode !== 'explain' ? 'p-1 text-[10.5px]' : 'px-1.5 py-0.5 text-[10.5px]')
              : (compact && mode !== 'explain' ? 'p-1.5 text-xs' : 'px-2.5 py-1 text-xs')
          } ${
            mode === 'explain'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 shadow-sm font-semibold'
              : 'text-white/45 hover:text-white/90 hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Explain Mode: In-depth code logic and architecture explanations (read-only)"
        >
          <Lightbulb className={isXs ? 'w-2.5 h-2.5 text-cyan-400' : 'w-3.5 h-3.5 text-cyan-400'} />
          {(!compact || mode === 'explain') && <span>Explain</span>}
        </button>
      </div>

      {/* God Mode toggle (visible when Agent mode is active and handler provided) */}
      {showGodMode && mode === 'agent' && onGodModeChange && (
        <div className="flex-shrink-0 whitespace-nowrap">
          <GodModeToggle
            value={godMode}
            onChange={onGodModeChange}
            size={isXs ? 'xs' : 'sm'}
          />
        </div>
      )}
    </div>
  );
}
