import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Box, Plus, Edit2, Trash2, Eye, EyeOff, Loader2, Plug, ChevronDown } from 'lucide-react';
import api from '../../lib/axios';

export function ModelSettingsModal({ isOpen, onClose }) {
  const [providers, setProviders] = useState([]);
  const [keys, setKeys] = useState([]);
  const [activeProviderId, setActiveProviderId] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiFormat, setApiFormat] = useState('openai');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [provRes, keyRes] = await Promise.all([
        api.get('/api/v1/settings/providers', { timeout: 5000 }).then(r => r.data).catch(() => ({ providers: [] })),
        api.get('/api/v1/keys', { timeout: 5000 }).then(r => r.data).catch(() => ({ keys: [] }))
      ]);
      const provList = provRes.providers || [];
      const savedKeys = keyRes.keys || [];
      setProviders(provList);
      setKeys(savedKeys);
      // Default to first saved provider, or first available
      if (!activeProviderId) {
        const firstSaved = savedKeys.length > 0 ? savedKeys[0].providerId : null;
        const initialId = firstSaved || (provList.length > 0 ? provList[0].id : null);
        setActiveProviderId(initialId);
        if (initialId) {
           const existing = savedKeys.find(k => k.providerId === initialId);
           setBaseUrl(existing?.baseUrl || '');
           setApiFormat(existing?.apiFormat || 'openai');
        }
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
    if (!newKey && !baseUrl) return;
    if (!activeProviderId) return;
    setSaving(true);
    try {
      const provider = providers.find(p => p.id === activeProviderId);
      const res = await api.post('/api/v1/keys', {
        providerId: activeProviderId,
        envVar: provider?.envVar || `${activeProviderId.toUpperCase()}_API_KEY`,
        displayName: provider?.displayName || activeProviderId,
        apiKey: newKey || 'existing-key',
        baseUrl,
        apiFormat
      }, { timeout: 5000 });
      const data = res.data;
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
      await api.delete(`/api/v1/keys/${keyId}`);
      await fetchData();
      window.dispatchEvent(new CustomEvent('mcode:reload-models'));
    } catch (e) {
      console.error('Failed to remove key:', e);
    }
  };

  if (!isOpen) return null;

  const activeProvider = providers.find(p => p.id === activeProviderId);
  const existingKey = keys.find(k => k.providerId === activeProviderId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '85vh', height: '80vh' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-8 pt-8 pb-4 flex-shrink-0">
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
            <div className="w-64 border-r border-white/5 flex flex-col py-4 overflow-y-auto custom-scrollbar flex-shrink-0">
              <div className="px-4 text-[11px] font-semibold text-white/30 mb-2 uppercase tracking-wider">Providers</div>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                </div>
              ) : (
                providers.map((provider) => {
                  const isActive = activeProviderId === provider.id;
                  const isConfigured = keys.some(k => k.providerId === provider.id);
                  return (
                    <button
                      key={provider.id}
                      onClick={() => {
                        setActiveProviderId(provider.id);
                        const existing = keys.find(k => k.providerId === provider.id);
                        setNewKey('');
                        setBaseUrl(existing?.baseUrl || '');
                        setApiFormat(existing?.apiFormat || 'openai');
                        setShowApiKey(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2 transition ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Box className="w-4 h-4 text-white/60 flex-shrink-0" />
                        <span className={`text-sm text-left truncate ${isActive ? 'text-white font-medium' : 'text-white/80'}`}>
                          {provider.displayName || provider.id}
                        </span>
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-2 ${isConfigured ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/20'}`} />
                    </button>
                  );
                })
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                </div>
              ) : activeProvider ? (
                <div className="max-w-3xl">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-semibold text-white">{activeProvider.displayName || activeProvider.id}</h3>
                      <button className="text-white/40 hover:text-white transition">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {existingKey ? (
                        <>
                          <div className="px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-semibold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                            Enabled
                          </div>
                          <button
                            onClick={() => handleRemove(existingKey.id)}
                            className="px-4 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition border border-white/5"
                          >
                            Disable
                          </button>
                        </>
                      ) : (
                        <div className="px-3 py-1 rounded-full bg-white/5 text-white/50 text-xs font-medium border border-white/10">
                          Not Configured
                        </div>
                      )}
                    </div>
                    {existingKey && (
                      <button
                        onClick={() => handleRemove(existingKey.id)}
                        className="text-white/40 hover:text-red-400 transition p-2 rounded-lg hover:bg-red-400/10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-6">
                    {/* Base URL */}
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Base URL</label>
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition font-mono"
                      />
                    </div>

                    {/* API Format */}
                    <div>
                      <label className="block text-sm text-white/60 mb-2">API format</label>
                      <div className="relative">
                        <select 
                          value={apiFormat}
                          onChange={(e) => setApiFormat(e.target.value)}
                          className="w-full appearance-none bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition"
                        >
                          <option value="openai">OpenAI compatible (/v1/chat/completions)</option>
                          <option value="anthropic">Anthropic messages (/v1/messages)</option>
                          <option value="google">Google Gemini compatible</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-white/40 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* API Key */}
                    <div>
                      <label className="block text-sm text-white/60 mb-2">API key</label>
                      <div className="relative">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={existingKey && !newKey ? (existingKey.masked || '••••••••••••••••••••••••') : newKey}
                          onChange={(e) => setNewKey(e.target.value)}
                          placeholder={`Enter your ${activeProvider.displayName || activeProvider.id} API key...`}
                          className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition font-mono pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Save Button */}
                    {(!existingKey || newKey || (existingKey && existingKey.baseUrl !== baseUrl) || (existingKey && existingKey.apiFormat !== apiFormat)) && (
                      <div className="pt-2">
                        <button
                          onClick={handleSave}
                          disabled={saving || (!existingKey && !newKey)}
                          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm rounded-xl transition shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          Save Settings
                        </button>
                      </div>
                    )}

                    {/* Model list */}
                    <div className="pt-6 border-t border-white/5 mt-6">
                      <label className="block text-sm text-white/60 mb-4">Model list</label>
                      <div className="space-y-3">
                        {/* Example Model Item like the screenshot */}
                        <div className="flex items-center justify-between bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 group hover:border-white/20 transition">
                          <span className="text-sm text-white/90 font-mono">{activeProviderId}/laguna-s-2.1</span>
                          <div className="flex items-center gap-3">
                            <div className="px-2 py-0.5 rounded-md bg-white/5 text-white/50 text-[10px] font-mono border border-white/10">
                              262.1K
                            </div>
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

                        {/* Error block (mocked as per screenshot) */}
                        <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono w-max">
                          Connection failed: {'{ "error": "" }'}
                        </div>

                        {/* Add Model Button */}
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition w-fit border border-white/5 mt-2">
                          <Plus className="w-4 h-4 opacity-50" />
                          Add model
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-white/30 text-sm">
                  Select a provider to configure
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
