import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { ChevronDown, Plus, Key, Check, Loader2, Sparkles, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { setSelectedModel } from '../../store/chatSlice';
import api from '../../lib/axios';
import { useProviderCatalog } from '../../hooks/useProviderCatalog';
import { CATALOG_STALE_NOTICE } from '../../lib/providerCatalog';

interface ModelOption {
  ref: string;
  name: string;
  provider?: string;
  model?: string;
  isDefault?: boolean;
  isCustom?: boolean;
  latency?: string;
  working?: boolean;
  free?: boolean;
  [k: string]: unknown;
}

export interface ModelSelectorProps {
  compact?: boolean;
  onAuthRequired?: () => void;
  onManageModels?: () => void;
}

const FALLBACK_DEFAULT_MODELS: ModelOption[] = [
  { ref: 'openrouter:openrouter/free', name: 'OpenRouter Free', provider: 'openrouter', model: 'openrouter/free', latency: '~700ms', isDefault: true, working: true, free: true },
  { ref: 'openrouter:cohere/north-mini-code:free', name: 'Cohere Code (Free)', provider: 'openrouter', model: 'cohere/north-mini-code:free', latency: '~600ms', isDefault: false, working: true, free: true },
  { ref: 'openrouter:meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', latency: '~525ms', isDefault: false, working: true },
  { ref: 'openrouter:openai/gpt-4o', name: 'GPT-4o', provider: 'openrouter', model: 'openai/gpt-4o', latency: '~730ms', isDefault: false, working: true },
  { ref: 'openrouter:openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openrouter', model: 'openai/gpt-4o-mini', latency: '~880ms', isDefault: false, working: true },
  { ref: 'openrouter:qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', provider: 'openrouter', model: 'qwen/qwen-2.5-coder-32b-instruct', latency: '~1400ms', isDefault: false, working: true },
  { ref: 'openrouter:google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'openrouter', model: 'google/gemini-2.5-flash', latency: '~2000ms', isDefault: false, working: true },
  { ref: 'openrouter:deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'openrouter', model: 'deepseek/deepseek-chat', latency: '~3600ms', isDefault: false, working: true },
];

export function ModelSelector({ compact = false, onAuthRequired, onManageModels }: ModelSelectorProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { isStale, refresh: reloadCatalog } = useProviderCatalog();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Field-level selectors: subscribing to the entire chat slice re-rendered
  // the selector on every streaming token (the messages array's identity
  // changes per token) even though only these four scalars are consumed.
  const models = useAppSelector((state: { chat: any }) => state.chat.models) as ModelOption[];
  const selectedModel = useAppSelector(
    (state: { chat: any }) => state.chat.selectedModel
  ) as string | null;
  const keysError = useAppSelector(
    (state: { chat: any }) => state.chat.keysError
  ) as string | null;
  const isStreaming = useAppSelector(
    (state: { chat: any }) => state.chat.isStreaming
  ) as boolean;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectModel = (modelRef: string) => {
    dispatch(setSelectedModel(modelRef));
    setOpen(false);
  };

  // Group models into:
  // 1. System Default Models (powered by mcode's OpenRouter API key)
  // 2. Custom Models (added by the user with their own API keys)
  const serverDefaultModels = models.filter((m) => Boolean(m.isDefault) || (!m.isCustom && m.provider === 'openrouter'));
  const defaultModels = serverDefaultModels.length > 0 ? serverDefaultModels : FALLBACK_DEFAULT_MODELS;
  const customModels = models.filter((m) => Boolean(m.isCustom) || (m.provider !== 'openrouter' && !m.isDefault));

  // Determine current active model
  const allAvailableModels = [...defaultModels, ...customModels];
  const selectedModelObj = selectedModel
    ? allAvailableModels.find((m) => m.ref === selectedModel) || models.find((m) => m.ref === selectedModel)
    : defaultModels[0];

  const currentRef = selectedModelObj?.ref || selectedModel || defaultModels[0].ref;
  const isCurrentDefault = defaultModels.some((m) => m.ref === currentRef);

  const selectedLabel = selectedModelObj
    ? (isCurrentDefault ? selectedModelObj.name : `${selectedModelObj.name} (${selectedModelObj.provider})`)
    : (selectedModel || 'Choose model');

  const navigateToSettings = () => {
    setOpen(false);
    const tokens = JSON.parse(localStorage.getItem('mcode_tokens') || '{}');
    if (!tokens.access && onAuthRequired) {
      onAuthRequired();
    } else if (onManageModels) {
      onManageModels();
    } else {
      router.push('/settings?tab=keys');
    }
  };

  return (
    <div className="relative inline-block flex-shrink min-w-0" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Select AI model, current: ${selectedLabel}`}
        onClick={() => setOpen(!open)}
        className={`rounded-lg flex items-center gap-1 transition-all font-medium backdrop-blur-md cursor-pointer ${
          compact
            ? 'px-1.5 py-1 h-7 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white text-[11px]'
            : 'px-2.5 h-8 bg-[#18181b] hover:bg-[#202023] border border-white/[0.08] hover:border-white/15 text-white/80 hover:text-white shadow-xs text-[12.5px]'
        }`}
        title={selectedLabel}
      >
        {isStreaming ? (
          <Loader2 className="w-3 h-3 text-white/40 animate-spin flex-shrink-0" />
        ) : (
          <Sparkles className="w-3 h-3 text-white/60 flex-shrink-0" />
        )}
        <span className={`truncate font-medium ${compact ? 'max-w-[48px] sm:max-w-[75px] text-[11px]' : 'max-w-[140px] text-[12.5px]'}`}>
          {selectedLabel}
        </span>
        <ChevronDown className="w-2.5 h-2.5 text-white/40 flex-shrink-0" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            aria-label="Available AI models"
            className={`absolute ${compact ? 'bottom-full right-0' : 'bottom-full left-0'} mb-2 w-64 bg-[#141416]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-50 p-1 flex flex-col gap-0.5 max-h-[460px] overflow-y-auto custom-scrollbar`}
          >
            {isStale && (
              <div className="px-2.5 py-1.5 border-b border-white/[0.06] mb-1 rounded-md bg-white/[0.03]">
                <p className="text-[11px] text-white/60 leading-snug">{CATALOG_STALE_NOTICE}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); reloadCatalog(); }}
                  className="mt-1 text-[11px] text-white/80 hover:text-white underline underline-offset-2"
                >
                  Reload catalog
                </button>
              </div>
            )}

            {/* SECTION 1: DEFAULT MODELS */}
            <div>
              <div className="px-2.5 pt-1.5 pb-1 flex items-center justify-between text-[10px] font-medium tracking-wider uppercase text-white/40">
                <span>Default Models</span>
                <span className="text-[9px] font-mono text-white/30 px-1 py-0.2 rounded bg-white/[0.04]">
                  Included
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {defaultModels.map((m) => {
                  const isSelected = currentRef === m.ref;
                  return (
                    <button
                      key={m.ref}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSelectModel(m.ref); }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors group cursor-pointer ${
                        isSelected
                          ? 'bg-white/[0.08] text-white font-medium'
                          : 'hover:bg-white/[0.04] text-white/70 hover:text-white'
                      }`}
                    >
                      <span className="text-[12.5px] truncate pr-2">{m.name}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {m.latency && (
                          <span className="text-[10px] font-mono text-white/30 group-hover:text-white/50">
                            {m.latency}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-white/90" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: CUSTOM MODELS (IF ANY) */}
            {customModels.length > 0 && (
              <>
                <div className="h-px bg-white/[0.06] my-1 mx-1" />
                <div>
                  <div className="px-2.5 pt-1 pb-1 flex items-center justify-between text-[10px] font-medium tracking-wider uppercase text-white/40">
                    <span>Custom Models</span>
                    <span className="text-[9px] font-mono text-white/30 px-1 py-0.2 rounded bg-white/[0.04]">
                      {customModels.length} active
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {customModels.map((m) => {
                      const isSelected = currentRef === m.ref;
                      return (
                        <button
                          key={m.ref}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSelectModel(m.ref); }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors group cursor-pointer ${
                            isSelected
                              ? 'bg-white/[0.08] text-white font-medium'
                              : 'hover:bg-white/[0.04] text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <span className="text-[12.5px] truncate">{m.name}</span>
                            <span className="text-[9px] font-mono uppercase text-white/30 group-hover:text-white/40">
                              {m.provider}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-white/90 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* FOOTER ACTIONS */}
            <div className="h-px bg-white/[0.06] my-1 mx-1" />

            <button
              type="button"
              onClick={navigateToSettings}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11.5px] text-white/50 hover:text-white/90 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Key className="w-3 h-3 text-white/40" />
                <span>Add custom API key</span>
              </div>
              <Plus className="w-3 h-3 text-white/40" />
            </button>

            <button
              type="button"
              onClick={navigateToSettings}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11.5px] text-white/50 hover:text-white/90 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Settings2 className="w-3 h-3 text-white/40" />
                <span>Manage models &amp; keys</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
