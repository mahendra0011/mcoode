import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Box, Plus, Edit2, Trash2, Eye, EyeOff, Loader2, Plug } from 'lucide-react';
import { getAuthHeaders } from '../../lib/api';

export function ModelSettingsModal({ isOpen, onClose }) {
  const [providers, setProviders] = useState([]);
  const [keys, setKeys] = useState([]);
  const [activeProviderId, setActiveProviderId] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [provRes, keyRes] = await Promise.all([
        fetch('/api/v1/settings/providers').then(r => r.ok ? r.json() : { providers: [] }),
        fetch('/api/v1/keys', { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : { keys: [] })
      ]);
      const provList = provRes.providers || [];
      const savedKeys = keyRes.keys || [];
      setProviders(provList);
      setKeys(savedKeys);
      // Default to first saved provider, or first available
      if (!activeProviderId) {
        const firstSaved = savedKeys.length > 0 ? savedKeys[0].providerId : null;
        setActiveProviderId(firstSaved || (provList.length > 0 ? provList[0].id : null));
      }
    } catch (e) {
      console.error('Failed to load provider data:', e);
    }
    setLoading(false);
  }, [activeProviderId]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setNewKey('');
      setShowApiKey(false);
    }
  }, [isOpen, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSave = async () => {
    if (!newKey || !activeProviderId) return;
    setSaving(true);
    try {
      const provider = providers.find(p => p.id === activeProviderId);
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          providerId: activeProviderId,
          envVar: provider?.envVar || `${activeProviderId.toUpperCase()}_API_KEY`,
          displayName: provider?.displayName || activeProviderId,
          apiKey: newKey
        })
      });
      const data = await res.json();
      if (data.ok) {
        setNewKey('');
        setShowApiKey(false);
        await fetchData();
        window.dispatchEvent(new CustomEvent('mcode:reload-models'));
      }
    } catch (e) {
      console.error('Failed to save key:', e);
    }
    setSaving(false);
  };

  const handleRemove = async (keyId) => {
    try {
      await fetch(`/api/v1/keys/${keyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      await fetchData();
      window.dispatchEvent(new CustomEvent('mcode:reload-models'));
    } catch (e) {
      console.error('Failed to remove key:', e);
    }
  };

  if (!isOpen) return null;

  const activeProvider = providers.find(p => p.id === activeProviderId);
  const existingKey = keys.find(k => k.providerId === activeProviderId);

  // Only show providers that have a saved key in the sidebar
  const configuredProviders = keys.map(k => {
    const prov = providers.find(p => p.id === k.providerId);
    return prov ? { ...prov, keyId: k.id } : { id: k.providerId, displayName: k.displayName || k.providerId, keyId: k.id };
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '85vh' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-8 pt-8 pb-4">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">Model settings</h2>
              <p className="text-sm text-white/50">Manage custom model providers. Once configured, they can be selected during chat.</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-white/50 hover:text-white transition disabled:opacity-50"
                title="Refresh providers"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={onClose} className="text-white/50 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden border-t border-white/5 mx-8 mb-8 rounded-xl bg-[#252525]">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/5 flex flex-col py-4 overflow-y-auto custom-scrollbar">
              {/* Providers header */}
              <div className="mb-6">
                <div className="px-4 text-xs font-medium text-white/40 mb-2">Providers</div>
                <button className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-white text-black rounded flex items-center justify-center font-bold text-xs">Z</div>
                    <span className="text-sm text-white/80 group-hover:text-white">Z.ai</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                </button>
              </div>

              {/* Custom (configured) providers */}
              <div>
                <div className="px-4 text-xs font-medium text-white/40 mb-2">Custom providers</div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                  </div>
                ) : (
                  configuredProviders.map((provider) => {
                    const isActive = activeProviderId === provider.id;
                    return (
                      <button
                        key={provider.id}
                        onClick={() => {
                          setActiveProviderId(provider.id);
                          setNewKey('');
                          setShowApiKey(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2 transition ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Box className="w-4 h-4 text-white/60 flex-shrink-0" />
                          <span className={`text-sm text-left truncate ${isActive ? 'text-white font-medium' : 'text-white/80'}`}>
                            {provider.displayName}
                          </span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0 ml-2" />
                      </button>
                    );
                  })
                )}

                {/* Add provider button — opens a provider picker */}
                <AddProviderButton
                  providers={providers}
                  configuredIds={configuredProviders.map(p => p.id)}
                  onSelect={(id) => {
                    setActiveProviderId(id);
                    setNewKey('');
                    setShowApiKey(false);
                  }}
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                </div>
              ) : activeProvider ? (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-white">{activeProvider.displayName}</h3>
                      <button className="text-white/40 hover:text-white transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {existingKey ? (
                        <>
                          <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                            Enabled
                          </div>
                          <button
                            onClick={() => handleRemove(existingKey.id)}
                            className="px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition border border-white/5"
                          >
                            Disable
                          </button>
                        </>
                      ) : (
                        <div className="px-2.5 py-0.5 rounded-full bg-white/5 text-white/50 text-xs font-medium border border-white/10">
                          Not Configured
                        </div>
                      )}
                    </div>
                    {existingKey && (
                      <button
                        onClick={() => handleRemove(existingKey.id)}
                        className="text-white/40 hover:text-red-400 transition p-2 rounded-lg hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-6">
                    {/* API Key */}
                    <div>
                      <label className="block text-sm text-white/50 mb-2">API key</label>
                      <div className="flex items-start gap-3">
                        <div className="relative flex-1">
                          <input
                            type={showApiKey ? "text" : "password"}
                            value={existingKey ? (existingKey.masked || '••••••••••••••••••••••••') : newKey}
                            onChange={(e) => { if (!existingKey) setNewKey(e.target.value); }}
                            readOnly={!!existingKey}
                            placeholder={`Enter your ${activeProvider.displayName} API key...`}
                            className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition font-mono pr-10"
                          />
                          <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {!existingKey && (
                          <button
                            onClick={handleSave}
                            disabled={!newKey || saving}
                            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm rounded-xl transition shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Save
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Model list */}
                    <div>
                      <label className="block text-sm text-white/50 mb-2">Model list</label>
                      <div className="space-y-2">
                        {/* Model Item */}
                        <div className="flex items-center justify-between bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 group hover:border-white/20 transition">
                          <span className="text-sm text-white/90 font-mono">{activeProviderId}/laguna-s-2.1</span>
                          <div className="flex items-center gap-3">
                            <div className="px-2 py-0.5 rounded-md bg-white/5 text-white/50 text-[10px] font-mono border border-white/10">
                              262.1K
                            </div>
                            <div className="w-px h-4 bg-white/10 mx-1"></div>
                            <button className="text-white/30 hover:text-white transition">
                              <Plug className="w-3.5 h-3.5" />
                            </button>
                            <button className="text-white/30 hover:text-white transition">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button className="text-white/30 hover:text-red-400 transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Add Model Button */}
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition w-fit border border-white/5">
                          <Plus className="w-4 h-4 opacity-50" />
                          Add model
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-white/30 text-sm">
                  Click &ldquo;+ Add provider&rdquo; to configure your first provider
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── "Add provider" inline picker ── */
function AddProviderButton({ providers, configuredIds, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const unconfigured = providers.filter(p => !configuredIds.includes(p.id));
  const filtered = search
    ? unconfigured.filter(p => (p.displayName || p.id).toLowerCase().includes(search.toLowerCase()))
    : unconfigured;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition mt-2 group"
      >
        <Plus className="w-4 h-4 text-white/50 group-hover:text-white" />
        <span className="text-sm font-medium text-white/80 group-hover:text-white">Add provider</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute left-2 right-2 bottom-full mb-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-white/5">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search providers..."
                autoFocus
                className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-white/20 transition"
              />
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-xs text-white/30">No providers found</div>
              ) : (
                filtered.slice(0, 20).map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelect(p.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition text-left"
                  >
                    <Box className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                    <span className="truncate">{p.displayName}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
