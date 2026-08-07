import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronDown, Plus, Key, Check, X, Loader2 } from 'lucide-react';
import { setSelectedModel } from '../../store/chatSlice';

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'mistral', label: 'Mistral' }
];

export function ModelSelector({ compact = false }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyForm, setKeyForm] = useState({ providerId: '', apiKey: '', displayName: '' });
  const dropdownRef = useRef(null);

  const { models, selectedModel, keysError } = useSelector((state) => state.chat);
  const hasKeys = keys.length > 0;

  useEffect(() => {
    fetch('/api/v1/keys')
      .then((res) => res.ok ? res.json() : { keys: [] })
      .then((data) => setKeys(data.keys || []))
      .catch(() => setKeys([]));
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
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keyForm)
      });
      const data = await res.json();
      if (data.ok) {
        const newKey = { providerId: keyForm.providerId, envVar: keyForm.providerId.toUpperCase() + '_API_KEY', displayName: keyForm.displayName || keyForm.providerId };
        setKeys([...keys, newKey]);
        setShowKeyModal(false);
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

  const selectedLabel = selectedModel
    ? models.find((m) => m.ref === selectedModel)?.name || selectedModel
    : 'Choose model';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`rounded-lg flex items-center gap-2 transition text-xs font-medium border backdrop-blur-md ${
            compact
              ? 'w-7 h-7 p-0 justify-center'
              : 'px-3 h-8'
          } ${
            keysError
              ? 'bg-red-500/10 border-red-500/50 text-red-400'
              : hasKeys
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90'
                : 'bg-red-500/10 border-red-500/50 text-red-400'
          }`}
          title={keysError || (hasKeys ? undefined : 'Add an API key to get started')}
        >
          <Key className="w-3.5 h-3.5" />
          {!compact && (
            <>
              <span className="truncate max-w-[140px]">{selectedLabel}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </>
          )}
        </button>

        {open && (
          <div className={`absolute ${compact ? 'top-full right-0' : 'top-full left-0'} mt-1 w-64 max-h-80 overflow-y-auto bg-[#151515] border border-white/10 rounded-xl shadow-2xl z-50 custom-scrollbar`}>
            <div className="p-2 text-[10px] font-semibold text-white/40 uppercase tracking-wider px-3 py-2">
              Select Model
            </div>
            {hasKeys && Object.keys(modelsByProvider).length > 0 ? (
              Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className="text-[10px] font-semibold text-white/30 px-3 py-1">{provider}</div>
                  {providerModels.map((m) => (
                    <button
                      key={m.ref}
                      onClick={() => handleSelectModel(m.ref)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-white/5 transition ${
                        selectedModel === m.ref ? 'text-emerald-400 bg-emerald-500/5' : 'text-white/80'
                      }`}
                    >
                      <span>{m.name}</span>
                      {selectedModel === m.ref && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="p-3 text-xs text-white/40">No models available</div>
            )}

            <div className="border-t border-white/5 mt-1">
              <button
                onClick={() => { setOpen(false); setShowKeyModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-white/5 text-white/80 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add API key
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#151515] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Add API Key</h2>
            <form onSubmit={handleAddKey} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Provider</label>
                <select
                  value={keyForm.providerId}
                  onChange={(e) => setKeyForm({ ...keyForm, providerId: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  required
                >
                  <option value="">Select a provider</option>
                  {PROVIDER_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="My OpenAI key"
                  value={keyForm.displayName}
                  onChange={(e) => setKeyForm({ ...keyForm, displayName: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={keyForm.apiKey}
                  onChange={(e) => setKeyForm({ ...keyForm, apiKey: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 font-mono"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowKeyModal(false); setKeyForm({ providerId: '', apiKey: '', displayName: '' }); }}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-medium text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !keyForm.providerId || !keyForm.apiKey}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
