import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronDown, Plus, Key, Check, X, Loader2, Circle, ChevronRight, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { setSelectedModel } from '../../store/chatSlice';
import { getAuthHeaders } from '../../lib/api';

/** All CLI providers are fetched from the backend — this just seeds the
 * initial dropdown while the API call is in flight. */
const FALLBACK_PROVIDERS = [
  { id: 'openai', displayName: 'OpenAI', envVar: 'OPENAI_API_KEY' },
  { id: 'anthropic', displayName: 'Anthropic', envVar: 'ANTHROPIC_API_KEY' },
  { id: 'google', displayName: 'Google', envVar: 'GOOGLE_API_KEY' },
  { id: 'openrouter', displayName: 'OpenRouter', envVar: 'OPENROUTER_API_KEY' },
  { id: 'deepseek', displayName: 'DeepSeek', envVar: 'DEEPSEEK_API_KEY' },
  { id: 'mistral', displayName: 'Mistral', envVar: 'MISTRAL_API_KEY' }
];

export function ModelSelector({ compact = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hoveredProvider, setHoveredProvider] = useState(null);
  const [keys, setKeys] = useState([]);
  const [providers, setProviders] = useState(FALLBACK_PROVIDERS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyForm, setKeyForm] = useState({ providerId: '', apiKey: '', displayName: '' });
  const dropdownRef = useRef(null);

  const { models, selectedModel, keysError, isStreaming } = useSelector((state) => state.chat);
  const hasKeys = keys.length > 0;

  // Fetch saved API keys (with auth token)
  useEffect(() => {
    const tokens = JSON.parse(localStorage.getItem('mcode_tokens') || '{}');
    fetch('/api/v1/keys', {
      headers: { Authorization: `Bearer ${tokens.access || ''}` }
    })
      .then((res) => res.ok ? res.json() : { keys: [] })
      .then((data) => setKeys(data.keys || []))
      .catch(() => setKeys([]));
  }, []);

  // Fetch all available providers from the backend (same list as CLI)
  useEffect(() => {
    fetch('/api/v1/settings/providers')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.providers?.length) setProviders(data.providers);
      })
      .catch(() => {
        /* keep fallback list */
      });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddKey = async (e) => {
    e.preventDefault();
    if (!keyForm.providerId || !keyForm.apiKey) return;
    setSaving(true);
    try {
      const provider = providers.find((p) => p.id === keyForm.providerId);
      const envVar = provider?.envVar || `${keyForm.providerId.toUpperCase()}_API_KEY`;
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          providerId: keyForm.providerId,
          envVar,
          displayName: keyForm.displayName || provider?.displayName || keyForm.providerId,
          apiKey: keyForm.apiKey
        })
      });
      const data = await res.json();
      if (data.ok) {
        const newKey = { providerId: keyForm.providerId, envVar, displayName: keyForm.displayName || provider?.displayName || keyForm.providerId };
        setKeys([...keys, newKey]);
        setKeyForm({ providerId: '', apiKey: '', displayName: '' });
        // Refresh models from backend
        window.dispatchEvent(new CustomEvent('mcode:reload-models'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectModel = (modelRef) => {
    dispatch(setSelectedModel(modelRef));
    setOpen(false);
  };

  // Group models by provider for the dropdown
  const modelsByProvider = models.reduce((acc, m) => {
    const p = m.provider || 'unknown';
    if (!acc[p]) acc[p] = [];
    acc[p].push(m);
    return acc;
  }, {});

  const selectedModelObj = selectedModel
    ? models.find((m) => m.ref === selectedModel)
    : null;
  const selectedLabel = selectedModelObj
    ? `${selectedModelObj.name} (${selectedModelObj.provider})`
    : (selectedModel || 'Choose model');

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setOpen(!open)}
          className={`rounded-[10px] flex items-center gap-2 transition text-[13px] font-medium backdrop-blur-md ${
            compact
              ? 'w-7 h-7 p-0 justify-center bg-white/5 hover:bg-white/10 border border-white/10'
              : 'px-3 h-8 bg-[#202020] hover:bg-[#282828] border border-white/5'
          } ${
            keysError
              ? 'border-red-500/50 text-red-400'
              : hasKeys
                ? (compact ? 'text-white/90' : 'text-[#f2bc8a]')
                : 'border-red-500/50 text-red-400'
          }`}
          title={keysError || (hasKeys ? undefined : 'Add an API key to get started')}
        >
          {compact ? (
            <Key className="w-3.5 h-3.5 text-white/70" />
          ) : (
            isStreaming ? (
              <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
            ) : (
              <Circle className="w-4 h-4 text-white/40" strokeWidth={3} />
            )
          )}
          {!compact && (
            <>
              <span className="truncate max-w-[200px] font-mono">{selectedLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-40 ml-1" />
            </>
          )}
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className={`absolute ${compact ? 'bottom-full right-0' : 'bottom-full left-0'} mb-2 w-52 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 py-1.5`}
              onMouseLeave={() => setHoveredProvider(null)}
            >
              {hasKeys && Object.keys(modelsByProvider).length > 0 ? (
                Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                  <div
                    key={provider}
                    className="relative"
                    onMouseEnter={() => setHoveredProvider(provider)}
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-white/80 hover:bg-white/10 transition"
                    >
                      <span className="capitalize">{provider}</span>
                      <div className="flex items-center gap-1">
                        {selectedModelObj?.provider === provider && (
                          <Check className="w-3.5 h-3.5 text-white/50" />
                        )}
                        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                      </div>
                    </button>
                    
                    {/* Submenu for models */}
                    <AnimatePresence>
                      {hoveredProvider === provider && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-0 left-full ml-1 w-64 max-h-80 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 custom-scrollbar py-1.5"
                        >
                          {providerModels.map((m) => (
                            <button
                              key={m.ref}
                              onClick={(e) => { e.stopPropagation(); handleSelectModel(m.ref); }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-[13px] text-left hover:bg-white/10 transition ${
                                selectedModel === m.ref ? 'text-white' : 'text-white/70'
                              }`}
                            >
                              <span className="truncate pr-2">{m.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-[13px] text-white/40">No models available</div>
              )}

              <div className="h-px bg-white/10 my-1 mx-2" />
              
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/settings?tab=keys'); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left hover:bg-white/10 text-emerald-400 transition"
              >
                Manage models
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
