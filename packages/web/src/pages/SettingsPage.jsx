import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const MotionLink = motion.create(Link);
import {
  Shield, Key, Bot, User, Github, ArrowLeft, Loader2,
  Plus, Trash2, Check, AlertTriangle, Eye, EyeOff, ChevronDown,
  Palette, Globe, Radar, Zap, X, Box, Plug, RefreshCw, Edit2, BarChart2, Calendar, Clock, Flame, Activity, MessageSquare
} from 'lucide-react';
import { getAuthHeaders } from '../lib/api';


const ACCENT_COLORS = [
  { id: 'emerald', label: 'Emerald', color: '#10b981', gradient: 'from-emerald-500 to-teal-400' },
  { id: 'blue', label: 'Blue', color: '#3b82f6', gradient: 'from-blue-500 to-cyan-400' },
  { id: 'purple', label: 'Purple', color: '#8b5cf6', gradient: 'from-purple-500 to-violet-400' },
  { id: 'amber', label: 'Amber', color: '#f59e0b', gradient: 'from-amber-500 to-yellow-400' },
  { id: 'red', label: 'Red', color: '#ef4444', gradient: 'from-red-500 to-rose-400' },
  { id: 'teal', label: 'Teal', color: '#14b8a6', gradient: 'from-teal-500 to-cyan-400' },
];

const TABS = [
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'keys', label: 'API Keys', icon: Key },
  { id: 'usage', label: 'Usage stats', icon: BarChart2 },
  { id: 'models', label: 'Models', icon: Bot },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'network', label: 'Network', icon: Globe },
  { id: 'watch', label: 'Watch Mode', icon: Radar },
  { id: 'godmode', label: 'God-Mode', icon: Zap },
  { id: 'account', label: 'Account', icon: User },
  { id: 'connections', label: 'Connections', icon: Github },
];

/* ─────────────────── PERMISSIONS TAB ─────────────────── */
function PermissionsTab({ settings, onUpdate, saving }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Permissions</h2>
        <p className="text-sm text-white/40">Control how the AI agent interacts with your project.</p>
      </div>

      {/* Shell execution */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Shell Command Execution</h3>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input type="radio" name="shell" checked={!settings.allowShellAll} onChange={() => onUpdate({ allowShellAll: false })} className="mt-1 accent-emerald-500" />
          <div>
            <span className="text-sm text-white font-medium">Ask before every command</span>
            <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">RECOMMENDED</span>
            <p className="text-xs text-white/40 mt-0.5">Each shell command will require your approval before running.</p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input type="radio" name="shell" checked={settings.allowShellAll} onChange={() => onUpdate({ allowShellAll: true })} className="mt-1 accent-emerald-500" />
          <div>
            <span className="text-sm text-white font-medium">Full access — run without asking</span>
            <p className="text-xs text-white/40 mt-0.5">Commands execute immediately without confirmation prompts.</p>
          </div>
        </label>
        {settings.allowShellAll && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300/80">Full access lets the AI run any command including installs, deletes, and git operations without confirmation. Only enable if you trust the project.</p>
          </div>
        )}
      </div>

      {/* File edit approval */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">File Edit Approval</h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="radio" name="edit" checked={!settings.requireEditApproval} onChange={() => onUpdate({ requireEditApproval: false })} className="mt-1 accent-emerald-500" />
          <div>
            <span className="text-sm text-white font-medium">Auto-apply edits</span>
            <p className="text-xs text-white/40 mt-0.5">File changes are applied automatically (you can always undo).</p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="radio" name="edit" checked={settings.requireEditApproval} onChange={() => onUpdate({ requireEditApproval: true })} className="mt-1 accent-emerald-500" />
          <div>
            <span className="text-sm text-white font-medium">Review before applying</span>
            <p className="text-xs text-white/40 mt-0.5">Each file edit shows a diff for your approval before writing.</p>
          </div>
        </label>
      </div>

      {saving && <div className="flex items-center gap-2 text-xs text-white/40"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</div>}
    </div>
  );
}

/* ─────────────────── API KEYS TAB ─────────────────── */
function ApiKeysTab() {
  const [providers, setProviders] = useState([]);
  const [keys, setKeys] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProviderId, setActiveProviderId] = useState('openrouter');
  const [newKey, setNewKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [provRes, keysRes, modelsRes] = await Promise.all([
        fetch('/api/v1/settings/providers', { headers: getAuthHeaders() }),
        fetch('/api/v1/keys', { headers: getAuthHeaders() }),
        fetch('/api/v1/keys/models', { headers: getAuthHeaders() })
      ]);
      const provData = await provRes.json();
      const keysData = await keysRes.json();
      const modelsData = await modelsRes.json();
      if (provData.ok) setProviders(provData.providers || []);
      if (keysData.keys) setKeys(keysData.keys || []);
      if (modelsData.models) setAvailableModels(modelsData.models || []);
    } catch (e) {
      console.error('Failed to fetch API keys data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSave = async () => {
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
          apiKey: newKey || 'existing-key'
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

  const activeProvider = providers.find(p => p.id === activeProviderId);
  const existingKey = keys.find(k => k.providerId === activeProviderId);

  return (
    <div className="flex flex-col h-[80vh] min-h-[600px] max-w-[1000px] mx-auto w-full">
      <div className="mb-8 flex-shrink-0">
        <div className="inline-block bg-blue-600 text-white font-bold text-2xl px-1 mb-2 leading-tight">
          Model settings
        </div>
        <p className="text-[13px] text-white/50">Manage custom model providers. Once configured, they can be selected during chat.</p>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-xl bg-[#181818] border border-[#222]">
        {/* Sidebar */}
        <div className="w-64 border-r border-[#222] flex flex-col py-4 overflow-y-auto custom-scrollbar flex-shrink-0">
          <div className="px-4 text-[11px] text-[#888] mb-3">Providers</div>
          
          <button className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 transition">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-white text-black rounded-sm flex items-center justify-center font-bold text-[10px]">Z</div>
              <span className="text-[13px] text-white font-medium">Z.ai</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#444]" />
          </button>

          {loading ? (
            <>
              <div className="px-4 text-[11px] text-[#888] mt-8 mb-3">Custom providers</div>
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
              </div>
            </>
          ) : (
            (() => {
              const configured = providers.filter(p => keys.some(k => k.providerId === p.id));
              const unconfigured = providers.filter(p => !keys.some(k => k.providerId === p.id));
              
              const renderProvider = (provider) => {
                const isActive = activeProviderId === provider.id;
                const isConfigured = keys.some(k => k.providerId === provider.id);
                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      setActiveProviderId(provider.id);
                      setNewKey('');
                      setShowApiKey(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2 transition ${isActive ? 'bg-[#252525]' : 'hover:bg-[#1f1f1f]'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Box className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-white' : 'text-[#888]'}`} />
                      <span className={`text-[13px] text-left truncate ${isActive ? 'text-white font-medium' : 'text-[#aaa]'}`}>
                        {provider.displayName || provider.id}
                      </span>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-2 ${isConfigured ? 'bg-[#1b7145]' : 'bg-[#444]'}`} />
                  </button>
                );
              };

              return (
                <>
                  <div className="px-4 text-[11px] text-[#888] mt-8 mb-3">Configured providers</div>
                  {configured.length > 0 ? (
                    configured.map(renderProvider)
                  ) : (
                    <div className="px-4 py-2 text-[12px] text-[#555] italic">None configured</div>
                  )}
                  
                  <div className="px-4 text-[11px] text-[#888] mt-8 mb-3">Available providers</div>
                  {unconfigured.length > 0 ? (
                    unconfigured.map(renderProvider)
                  ) : (
                    <div className="px-4 py-2 text-[12px] text-[#555] italic">None available</div>
                  )}
                </>
              );
            })()
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
            </div>
          ) : activeProvider ? (
            <div className="max-w-3xl">
              {/* Header */}
              <div className="flex items-center mb-8">
                <h3 className="text-[22px] font-bold text-white mr-3">{activeProvider.displayName || activeProvider.id}</h3>
                <button className="text-[#666] hover:text-white transition">
                  <Edit2 className="w-4 h-4" />
                </button>
                {existingKey ? (
                  <div className="px-3 py-1 rounded-full bg-[#181818] text-[#888] border border-[#333] text-[11px] font-medium ml-4">
                    Configured
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-full bg-[#181818] text-[#888] border border-[#333] text-[11px] font-medium ml-4">
                    Not Configured
                  </div>
                )}
                {existingKey && (
                  <button
                    onClick={() => handleRemove(existingKey.id)}
                    className="ml-auto text-red-400/70 hover:text-red-400 text-sm font-medium transition"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-8">
                {/* API Key */}
                <div>
                  <label className="block text-[13px] text-[#aaa] font-medium mb-2.5">API key</label>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={existingKey && !newKey ? (existingKey.masked || '••••••••••••••••••••••••') : newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-[#202020] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#444] transition font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <button
                      onClick={handleSave}
                      disabled={saving || (!existingKey && !newKey)}
                      className="px-6 py-[11px] bg-[#1d764a] hover:bg-[#155d38] text-white font-medium text-[13px] rounded-[8px] transition disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Model list */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[13px] text-[#aaa] font-medium">Available models</label>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={fetchData}
                      disabled={refreshing}
                      className="text-[11px] text-[#666] hover:text-white transition flex items-center gap-1"
                      title="Refresh models"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </motion.button>
                  </div>
                  <div className="space-y-3">
                    {availableModels.filter(m => m.provider === activeProviderId).length === 0 ? (
                      <div className="text-[13px] text-[#666] py-4 text-center">No models available for this provider. Add an API key to load models.</div>
                    ) : (
                      availableModels
                        .filter(m => m.provider === activeProviderId)
                        .map(model => (
                          <motion.div
                            key={model.ref}
                            className="flex items-center justify-between bg-[#1c1c1c] border border-[#2a2a2a] rounded-[8px] px-4 py-3 group hover:border-[#333] transition"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex flex-col">
                              <span className="text-[13px] text-white font-medium">{model.name}</span>
                              <span className="text-[11px] text-[#888] font-mono">{model.ref}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {model.free && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">Free</span>
                              )}
                              {model.scores && model.scores.coding && (
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium">Coding</span>
                              )}
                            </div>
                          </motion.div>
                        ))
                    )}
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
    </div>
  );
}

/* ─────────────────── MODELS TAB ─────────────────── */
const MODEL_MODES = [
  { key: 'general', label: 'General Mode', desc: 'Default model for standard chat conversations.' },
  { key: 'build', label: 'Build Mode', desc: 'Default model for code agent build tasks.' },
  { key: 'planning', label: 'Planning Mode', desc: 'Default model for high-reasoning planning tasks.' },
];

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, delay: i * 0.05 }
  })
};

function ModelsTab({ settings, onUpdateModels }) {
  const [availableModels, setAvailableModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCustom, setEditingCustom] = useState(null);
  const [customModelName, setCustomModelName] = useState('');

  const overrides = settings.modelOverrides || {};
  const [localOverrides, setLocalOverrides] = useState(overrides);

  // Fetch available models + providers from the backend
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/v1/keys/models', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setAvailableModels(data.models || []);
          setProviders(data.providers || []);
        }
      } catch (e) {
        console.error('Failed to fetch models:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();

    // Re-fetch when a key is added/removed from the ApiKeys tab
    const reloadHandler = () => fetchModels();
    window.addEventListener('mcode:reload-models', reloadHandler);
    return () => window.removeEventListener('mcode:reload-models', reloadHandler);
  }, []);

  // Sync localOverrides when settings.modelOverrides changes externally
  useEffect(() => {
    setLocalOverrides(settings.modelOverrides || {});
  }, [settings.modelOverrides]);

  // Group models by provider for display
  const modelsByProvider = availableModels.reduce((acc, m) => {
    const p = m.provider || 'unknown';
    if (!acc[p]) acc[p] = [];
    acc[p].push(m);
    return acc;
  }, {});

  // Build a combined list: fetched models + any custom model refs in overrides
  const allModelOptions = [
    ...availableModels,
    // Include custom model refs from overrides that aren't in the fetched list
    ...Object.values(localOverrides)
      .filter(v => v && typeof v === 'string' && !availableModels.some(m => m.ref === v))
      .map(ref => ({ ref, provider: 'custom', name: ref, model: ref, free: false }))
  ].sort((a, b) => {
    const pa = a.provider || 'z';
    const pb = b.provider || 'z';
    if (pa !== pb) return pa.localeCompare(pb);
    return (a.name || a.ref).localeCompare(b.name || b.ref);
  });

  const handleSetDefault = async (mode, modelRef) => {
    setLocalOverrides(prev => ({ ...prev, [mode]: modelRef }));
    setSaving(true);
    try {
      await onUpdateModels({ [mode]: modelRef });
    } finally {
      setSaving(false);
    }
  };

  const handleClearDefault = async (mode) => {
    setLocalOverrides(prev => {
      const updated = { ...prev };
      delete updated[mode];
      return updated;
    });
    setSaving(true);
    try {
      await onUpdateModels({ [mode]: undefined });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomModel = () => {
    const name = customModelName.trim();
    if (!name) return;
    // Add a custom model ref — stored directly in modelOverrides under a custom key
    const ref = `custom:${name}`;
    setLocalOverrides(prev => ({ ...prev, [`custom:${name}`]: ref }));
    setSaving(true);
    setTimeout(() => {
      onUpdateModels({ [`custom:${name}`]: ref });
      setSaving(false);
    }, 0);
    setCustomModelName('');
    setEditingCustom(null);
  };

  const handleEditCustom = (key) => {
    setEditingCustom(key);
    setCustomModelName(localOverrides[key] || '');
  };

  const handleUpdateCustom = (key) => {
    if (!customModelName.trim()) return;
    setLocalOverrides(prev => ({ ...prev, [key]: customModelName.trim() }));
    setSaving(true);
    onUpdateModels({ [key]: customModelName.trim() }).finally(() => setSaving(false));
    setEditingCustom(null);
    setCustomModelName('');
  };

  const handleRemoveCustom = (key) => {
    setLocalOverrides(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
    setSaving(true);
    setTimeout(async () => {
      await onUpdateModels({ [key]: undefined });
      setSaving(false);
    }, 0);
  };

  // Custom model keys (non-standard: general/build/planning)
  const customKeys = Object.keys(localOverrides).filter(k => !MODEL_MODES.some(m => m.key === k));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Model Settings</h2>
        <p className="text-sm text-white/40">Set default models for each AI mode and manage custom model entries.</p>
      </div>

      {/* Mode defaults */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Default Models by Mode</h3>
        <div className="space-y-5">
          {MODEL_MODES.map((mode, i) => {
            const currentValue = localOverrides[mode.key];
            const providerObj = providers.find(p => p.id === (currentValue ? currentValue.split('/')[0] : ''));
            return (
              <motion.div
                key={mode.key}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={itemVariants}
                className="space-y-2"
              >
                <label className="block text-[13px] text-[#aaa] font-medium">{mode.label}</label>
                <p className="text-[11px] text-[#666]">{mode.desc}</p>

                <div className="relative">
                  <select
                    value={currentValue || ''}
                    onChange={(e) => handleSetDefault(mode.key, e.target.value)}
                    disabled={saving}
                    className="w-full bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-blue-500/50 appearance-none cursor-pointer disabled:opacity-50 custom-scrollbar"
                  >
                    <option value="">Auto-select (provider default)</option>
                    {Object.entries(modelsByProvider).map(([provider, models]) => (
                      <optgroup key={provider} label={providers.find(p => p.id === provider)?.displayName || provider}>
                        {models.map(m => (
                          <option key={m.ref} value={m.ref}>
                            {m.name} — {m.provider}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {currentValue && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#888] font-mono">Selected: {currentValue}</span>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleClearDefault(mode.key)}
                      className="text-[11px] text-red-400/70 hover:text-red-400 transition"
                    >
                      Clear
                    </motion.button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Custom model entries */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Custom Models</h3>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setEditingCustom('new'); setCustomModelName(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[13px] text-white/70 transition border border-white/10"
          >
            <Plus className="w-3.5 h-3.5" />
            Add custom model
          </motion.button>
        </div>

        {editingCustom === 'new' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 bg-[#0e0e0e] border border-white/10 rounded-lg space-y-3"
          >
            <input
              type="text"
              value={customModelName}
              onChange={(e) => setCustomModelName(e.target.value)}
              placeholder="provider/model-name (e.g., openai/gpt-4o)"
              className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/20 outline-none focus:border-blue-500/50 font-mono"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomModel(); }}
            />
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddCustomModel}
                disabled={!customModelName.trim() || saving}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-[12px] font-medium transition disabled:opacity-50"
              >
                Add
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setEditingCustom(null)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[12px] font-medium transition"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}

        {customKeys.length === 0 ? (
          <div className="text-[13px] text-[#666] py-6 text-center">No custom models configured.</div>
        ) : (
          <AnimatePresence>
            {customKeys.map((key, i) => (
              <motion.div
                key={key}
                custom={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="flex items-center justify-between bg-[#0e0e0e] border border-white/5 rounded-lg px-4 py-3 mb-2"
              >
                {editingCustom === key ? (
                  <input
                    type="text"
                    value={customModelName}
                    onChange={(e) => setCustomModelName(e.target.value)}
                    className="flex-1 bg-[#151515] border border-white/10 rounded-lg px-3 py-1.5 text-[13px] text-white font-mono outline-none focus:border-blue-500/50"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateCustom(key); }}
                    autoFocus
                  />
                ) : (
                  <span className="text-[13px] text-[#ccc] font-mono">{key}</span>
                )}
                <div className="flex items-center gap-2 ml-3">
                  {editingCustom === key ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleUpdateCustom(key)}
                      disabled={saving}
                      className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[11px]"
                    >
                      Save
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEditCustom(key)}
                      className="text-[#666] hover:text-white transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleRemoveCustom(key)}
                    className="text-[#666] hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {customKeys.length > 0 && editingCustom !== 'new' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setEditingCustom('new'); setCustomModelName(''); }}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[13px] text-white/70 transition border border-white/10"
          >
            <Plus className="w-3.5 h-3.5" />
            Add another custom model
          </motion.button>
        )}
      </div>

      {/* Full model list */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">All Available Models</h3>
        {availableModels.length === 0 ? (
          <div className="text-[13px] text-[#666] py-6 text-center">No models available. Configure API keys in the API Keys tab.</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(modelsByProvider).map(([providerId, models]) => {
              const provider = providers.find(p => p.id === providerId);
              return (
                <div key={providerId}>
                  <h4 className="text-[13px] font-medium text-white/80 mb-2">{provider?.displayName || providerId}</h4>
                  <div className="space-y-2">
                    {models.map((model, i) => (
                      <motion.div
                        key={model.ref}
                        custom={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        variants={itemVariants}
                        className="flex items-center justify-between bg-[#0e0e0e] border border-white/5 rounded-lg px-4 py-2.5"
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[13px] text-white font-medium truncate">{model.name}</span>
                          <span className="text-[11px] text-[#888] font-mono truncate">{model.ref}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          {model.free && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">Free</span>
                          )}
                          {model.scores && (
                            <div className="flex gap-3 text-[10px] text-[#666]">
                              {model.scores.coding && <span>⚡ {model.scores.coding.toFixed(1)}</span>}
                              {model.scores.general && <span>💬 {model.scores.general.toFixed(1)}</span>}
                            </div>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSetDefault('general', model.ref)}
                            className="text-[11px] text-[#666] hover:text-white transition"
                            title="Use as default for General mode"
                          >
                            Set default
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving model settings...
        </div>
      )}
    </div>
  );
}

/* ─────────────────── THEME TAB ─────────────────── */
function ThemeTab({ settings, onUpdate }) {
  const current = settings.accentColor || 'emerald';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Theme</h2>
        <p className="text-sm text-white/40">Choose your accent color for the UI.</p>
      </div>

      <div className="bg-[#151515] border border-white/5 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Accent Color</h3>
        <div className="grid grid-cols-3 gap-3">
          {ACCENT_COLORS.map(c => (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              key={c.id}
              onClick={() => onUpdate({ accentColor: c.id })}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                current === c.id
                  ? 'border-white/20 bg-white/5 shadow-sm'
                  : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
              }`}
            >
              <div className="w-6 h-6 rounded-full shadow-lg" style={{ background: c.color }} />
              <span className="text-sm text-white/80">{c.label}</span>
              {current === c.id && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Preview</h3>
        <div className="flex items-center gap-4">
          <div className="w-full h-2 rounded-full overflow-hidden bg-white/5">
            <div className="h-full rounded-full w-2/3 transition-all duration-500" style={{ background: ACCENT_COLORS.find(c => c.id === current)?.color || '#10b981' }} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 py-2 rounded-lg text-sm text-white font-medium transition" style={{ background: ACCENT_COLORS.find(c => c.id === current)?.color }}>Primary Button</motion.button>
          <span className="text-xs" style={{ color: ACCENT_COLORS.find(c => c.id === current)?.color }}>Accent text</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── NETWORK TAB ─────────────────── */
function NetworkTab({ settings, onUpdate }) {
  const whitelist = settings.networkWhitelist || [];
  const [newDomain, setNewDomain] = useState('');

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (d && !whitelist.includes(d)) {
      onUpdate({ networkWhitelist: [...whitelist, d] });
    }
    setNewDomain('');
  };

  const removeDomain = (domain) => {
    onUpdate({ networkWhitelist: whitelist.filter(d => d !== domain) });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Network Whitelist</h2>
        <p className="text-sm text-white/40">Restrict which domains the AI agent can access via web_fetch and web_search tools.</p>
      </div>

      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Allowed Domains for AI Web Access</h3>

        {whitelist.length === 0 && (
          <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
            <Globe className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-300/70">Empty list = all domains allowed. Add domains to restrict the AI's web access.</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {whitelist.map(d => (
            <span key={d} className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 font-mono">
              {d}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => removeDomain(d)} className="text-white/30 hover:text-red-400 transition"><X className="w-3 h-3" /></motion.button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addDomain(); }}
            placeholder="github.com"
            className="flex-1 bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 font-mono"
          />
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={addDomain} disabled={!newDomain.trim()} className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3 py-2 rounded-lg transition border border-white/10 disabled:opacity-40 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── WATCH MODE TAB ─────────────────── */
function WatchTab({ settings, onUpdate }) {
  const watch = settings.watchDefaults || { intervalMs: 30000, autoFix: false };

  const updateWatch = (patch) => {
    onUpdate({ watchDefaults: { ...watch, ...patch } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Watch Mode Defaults</h2>
        <p className="text-sm text-white/40">Configure the background watch daemon — continuous auto-scan and auto-fix loop.</p>
      </div>

      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-5">
        <div>
          <label className="text-sm font-medium text-white block mb-2">Scan Interval</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5000}
              max={120000}
              step={5000}
              value={watch.intervalMs}
              onChange={e => updateWatch({ intervalMs: Number(e.target.value) })}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-sm text-white/60 font-mono w-16 text-right">{(watch.intervalMs / 1000).toFixed(0)}s</span>
          </div>
          <p className="text-xs text-white/30 mt-1">How often the watch daemon scans for changes.</p>
        </div>

        <div className="border-t border-white/5 pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <motion.div
              whileTap={{ scale: 0.9 }}
              className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${watch.autoFix ? 'bg-emerald-500' : 'bg-white/10'}`}
              onClick={() => updateWatch({ autoFix: !watch.autoFix })}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${watch.autoFix ? 'left-5' : 'left-1'}`} />
            </motion.div>
            <div>
              <span className="text-sm text-white font-medium">Auto-fix on detection</span>
              <p className="text-xs text-white/40">Automatically attempt to fix issues detected by the watch daemon.</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── GOD-MODE TAB ─────────────────── */
function GodModeTab({ settings, onUpdate }) {
  const god = settings.godModeDefaults || { concurrency: 3, deployTarget: '', skipTests: false };

  const updateGod = (patch) => {
    onUpdate({ godModeDefaults: { ...god, ...patch } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">God-Mode Build Defaults</h2>
        <p className="text-sm text-white/40">Configure defaults for multi-subagent parallel builds.</p>
      </div>

      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-5">
        {/* Concurrency */}
        <div>
          <label className="text-sm font-medium text-white block mb-2">Subagent Concurrency</label>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5, 6, 8].map(n => (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                key={n}
                onClick={() => updateGod({ concurrency: n })}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                  god.concurrency === n
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'
                }`}
              >
                {n}
              </motion.button>
            ))}
          </div>
          <p className="text-xs text-white/30 mt-2">Number of parallel subagents during god-mode builds.</p>
        </div>

        {/* Deploy target */}
        <div className="border-t border-white/5 pt-4">
          <label className="text-sm font-medium text-white block mb-2">Default Deploy Target</label>
          <div className="relative">
            <select
              value={god.deployTarget}
              onChange={e => updateGod({ deployTarget: e.target.value })}
              className="w-full bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
            >
              <option value="">None</option>
              <option value="vercel">Vercel</option>
              <option value="netlify">Netlify</option>
              <option value="cloudflare">Cloudflare Pages</option>
              <option value="fly">Fly.io</option>
              <option value="railway">Railway</option>
            </select>
            <ChevronDown className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Skip tests */}
        <div className="border-t border-white/5 pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <motion.div
              whileTap={{ scale: 0.9 }}
              className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${god.skipTests ? 'bg-amber-500' : 'bg-white/10'}`}
              onClick={() => updateGod({ skipTests: !god.skipTests })}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${god.skipTests ? 'left-5' : 'left-1'}`} />
            </motion.div>
            <div>
              <span className="text-sm text-white font-medium">Skip tests by default</span>
              <p className="text-xs text-white/40">God-mode builds will skip the test phase unless explicitly requested.</p>
            </div>
          </label>
          {god.skipTests && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-3 ml-13">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300/80">Skipping tests can speed up builds but may deploy broken code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ACCOUNT TAB ─────────────────── */
function AccountTab() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/v1/auth/me', { headers: getAuthHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Account</h2>
        <p className="text-sm text-white/40">Manage your account details and preferences.</p>
      </div>

      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Profile</h3>
          {profile ? (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
                {profile.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-[13px] text-white font-medium">{profile.email}</p>
                <p className="text-[11px] text-[#888]">{profile.name || 'No name set'}</p>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#666]">Unable to load profile.</p>
          )}
        </div>

        <div className="border-t border-white/5 pt-6">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Security</h3>
          <div className="space-y-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#0e0e0e] border border-white/5 text-[13px] text-white/80 hover:bg-white/5 transition">
              <span>Change password</span>
              <ChevronDown className="w-4 h-4 text-white/30" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#0e0e0e] border border-white/5 text-[13px] text-white/80 hover:bg-white/5 transition">
              <span>Two-factor authentication</span>
              <ChevronDown className="w-4 h-4 text-white/30" />
            </motion.button>
          </div>
        </div>

        {saving && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── CONNECTIONS TAB ─────────────────── */
function ConnectionsTab() {
  const [githubStatus, setGithubStatus] = useState({ connected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/github/status', { headers: getAuthHeaders() })
      .then((r) => r.ok ? r.json() : { connected: false })
      .then((data) => { setGithubStatus(data); setLoading(false); })
      .catch(() => { setGithubStatus({ connected: false }); setLoading(false); });
  }, []);

  const handleConnectGithub = () => {
    window.location.href = '/api/v1/github/oauth';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Connections</h2>
        <p className="text-sm text-white/40">Manage your third-party service integrations.</p>
      </div>

      <div className="space-y-4">
        <motion.div
          className="flex items-center justify-between bg-[#151515] border border-white/5 rounded-xl p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <Github className="w-6 h-6 text-white" />
            <div>
              <h3 className="text-[13px] font-medium text-white">GitHub</h3>
              <p className="text-[11px] text-[#888] mt-0.5">
                {githubStatus.connected ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          {githubStatus.connected ? (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-[13px] border border-emerald-500/20 transition">
              Disconnect
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleConnectGithub} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[13px] text-white transition border border-white/10">
              Connect
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────── MAIN SETTINGS PAGE ─────────────────── */
export function SettingsPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'permissions');
  const [settings, setSettings] = useState({ allowShellAll: false, requireEditApproval: false, modelOverrides: {} });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/v1/settings', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { if (d.settings) setSettings(d.settings); })
      .catch(console.error);
  }, []);

  const updatePermissions = async (patch) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    setSaving(true);
    try {
      await fetch('/api/v1/settings/permissions', {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ allowShellAll: updated.allowShellAll, requireEditApproval: updated.requireEditApproval })
      });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const updateModels = async (patch) => {
    const newOverrides = { ...(settings.modelOverrides || {}), ...patch };
    setSettings({ ...settings, modelOverrides: newOverrides });
    try {
      await fetch('/api/v1/settings/models', {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify(patch)
      });
    } catch (e) { console.error(e); }
  };

  const updateGeneric = async (patch) => {
    setSettings(s => ({ ...s, ...patch }));
    if (patch.accentColor) {
      const c = ACCENT_COLORS.find(x => x.id === patch.accentColor);
      if (c) document.documentElement.style.setProperty('--theme-accent', c.color);
    }
    try {
      await fetch('/api/v1/settings', {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify(patch)
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] text-[#f4f4f5] font-sans overflow-hidden">

      {/* LEFT SIDEBAR */}
      <aside className="w-64 flex-shrink-0 bg-[#0e0e0e] border-r border-white/5 flex flex-col">
        {/* Header */}
        <motion.div
          className="p-5 border-b border-white/5"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MotionLink
            to="/ai/chat"
            className="flex items-center gap-2 text-white/50 hover:text-white transition text-sm group"
            whileHover={{ x: -3 }}
          >
            <motion.div whileHover={{ x: -3 }}>
              <ArrowLeft className="w-4 h-4" />
            </motion.div>
            Back to workspace
          </MotionLink>
          <motion.h1
            className="text-lg font-semibold text-white mt-4 tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            Settings
          </motion.h1>
        </motion.div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                whileHover={{ x: 2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : ''}`} />
                </motion.div>
                {tab.label}
              </motion.button>
            );
          })}
        </nav>

        {/* Footer */}
        <motion.div
          className="p-4 border-t border-white/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-[10px] text-white/20 text-center">mcode v1.0</p>
        </motion.div>
      </aside>

      {/* MAIN CONTENT */}
      <motion.main
        className="flex-1 overflow-y-auto custom-scrollbar"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <div className={`mx-auto px-8 py-10 ${activeTab === 'keys' ? 'max-w-5xl' : 'max-w-2xl'}`}>
          {activeTab === 'permissions' && <PermissionsTab settings={settings} onUpdate={updatePermissions} saving={saving} />}
          {activeTab === 'keys' && <ApiKeysTab />}
          {activeTab === 'usage' && <UsageTab />}
          {activeTab === 'models' && <ModelsTab settings={settings} onUpdateModels={updateModels} />}
          {activeTab === 'theme' && <ThemeTab settings={settings} onUpdate={updateGeneric} />}
          {activeTab === 'network' && <NetworkTab settings={settings} onUpdate={updateGeneric} />}
          {activeTab === 'watch' && <WatchTab settings={settings} onUpdate={updateGeneric} />}
          {activeTab === 'godmode' && <GodModeTab settings={settings} onUpdate={updateGeneric} />}
          {activeTab === 'account' && <AccountTab />}
          {activeTab === 'connections' && <ConnectionsTab />}
        </div>
      </motion.main>
    </div>
  );
}

/* ─────────────────── USAGE TAB ─────────────────── */
function UsageTab() {
  const [timeRange, setTimeRange] = useState('Last 30 days');

  // MOCK DATA for Heatmap (simulate some activity across weeks)
  const heatmapData = Array.from({ length: 45 }, () => Array.from({ length: 7 }, () => Math.random() > 0.6 ? Math.floor(Math.random() * 4) : 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 border-b border-white/10 pb-2">
          <h2 className="text-xl font-semibold text-white">Usage stats</h2>
          <span className="text-sm font-medium text-white border-b-2 border-white pb-2 translate-y-[9px]">App usage</span>
        </div>
        <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-white/5">
          {['Last 7 days', 'Last 30 days'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${timeRange === range ? 'bg-[#2a2a2a] text-white' : 'text-[#888] hover:text-white'}`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-3 gap-4">
        {/* Token Usage */}
        <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#888]">
            <Zap className="w-4 h-4 opacity-70" />
            <span className="text-sm">Token usage</span>
          </div>
          <div className="text-3xl font-bold text-white">821.2M</div>
        </div>
        {/* Sessions */}
        <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#888]">
            <MessageSquare className="w-4 h-4 opacity-70" />
            <span className="text-sm">Sessions</span>
          </div>
          <div className="text-3xl font-bold text-white">56</div>
        </div>
        {/* Messages */}
        <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#888]">
            <MessageSquare className="w-4 h-4 opacity-70" />
            <span className="text-sm">Messages</span>
          </div>
          <div className="text-3xl font-bold text-white">393</div>
        </div>
        {/* Active Days */}
        <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#888]">
            <Calendar className="w-4 h-4 opacity-70" />
            <span className="text-sm">Active days</span>
          </div>
          <div className="text-3xl font-bold text-white">6</div>
        </div>
        {/* Current Streak */}
        <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#888]">
            <Calendar className="w-4 h-4 opacity-70" />
            <span className="text-sm">Current streak</span>
          </div>
          <div className="text-3xl font-bold text-white">5</div>
        </div>
        {/* Favorite Model */}
        <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#888]">
            <Activity className="w-4 h-4 opacity-70" />
            <span className="text-sm">Favorite model</span>
          </div>
          <div className="text-base font-bold text-white truncate">laguna-s-2.1</div>
          <div className="text-xs text-[#888]">99% share</div>
        </div>
      </div>

      {/* HEATMAP */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Activity heatmap</h3>
          <div className="flex items-center gap-1 text-xs text-[#666]">
            <span>Less</span>
            <div className="w-3 h-3 rounded-[3px] bg-white/5 ml-1"></div>
            <div className="w-3 h-3 rounded-[3px] bg-blue-500/30"></div>
            <div className="w-3 h-3 rounded-[3px] bg-blue-500/60"></div>
            <div className="w-3 h-3 rounded-[3px] bg-blue-500"></div>
            <span className="ml-1">More</span>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-hidden">
          {heatmapData.map((week, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {week.map((day, j) => (
                <div
                  key={j}
                  className={`w-3.5 h-3.5 rounded-[3px] ${
                    day === 0 ? 'bg-white/5' :
                    day === 1 ? 'bg-blue-500/30' :
                    day === 2 ? 'bg-blue-500/60' : 'bg-blue-500'
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* TOKENS PER DAY BAR CHART */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5 mt-4">
        <h3 className="text-sm font-semibold text-white mb-6">Tokens per day</h3>
        
        {/* Mock Chart Area */}
        <div className="relative h-48 border-b border-white/10 flex items-end justify-between px-2 pb-6">
          {/* Y-axis lines mock */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-white/5 w-full h-0"></div>
            <div className="border-t border-white/5 w-full h-0"></div>
            <div className="border-t border-white/5 w-full h-0"></div>
            <div className="border-t border-white/5 w-full h-0"></div>
          </div>
          
          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-[#666] px-2 translate-y-full pt-2">
            <span>Jul 11</span>
            <span>Jul 16</span>
            <span>Jul 21</span>
            <span>Jul 26</span>
            <span>Jul 31</span>
            <span>Aug 5</span>
            <span>Aug 10</span>
          </div>
          
          {/* Bars */}
          <div className="relative w-full h-full flex items-end justify-end gap-1 pb-1 z-10">
            {/* Some mock empty bars */}
            <div className="w-4 bg-transparent"></div>
            <div className="w-5 bg-emerald-500 h-[1%] mr-20" title="Jul 31"></div>
            
            {/* The spike near Aug 5 */}
            <div className="w-5 bg-blue-500 h-[10%]" title="Aug 5"></div>
            <div className="w-5 bg-blue-500 h-[30%]" title="Aug 6"></div>
            <div className="w-5 bg-blue-500 h-[90%]" title="Aug 7"></div>
            <div className="w-5 bg-blue-500 h-[45%]" title="Aug 8"></div>
            <div className="w-5 bg-blue-500 h-[60%]" title="Aug 9"></div>
            <div className="w-5 bg-blue-500 h-[2%]" title="Aug 10"></div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-y-3 mt-10">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <span className="text-xs text-[#888]">poolside/laguna-s-2.1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-[#888]">GLM-5.2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
            <span className="text-xs text-[#888]">nvidia/nemotron-3-nano...</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
            <span className="text-xs text-[#888]">GLM-5-Turbo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div>
            <span className="text-xs text-[#888]">deepseek-v4-flash</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
            <span className="text-xs text-[#888]">deepseek-flash</span>
          </div>
        </div>
      </div>

      {/* MODEL USAGE DONUT CHART */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5 mt-4">
        <h3 className="text-sm font-semibold text-white mb-6">Model usage</h3>
        <div className="flex gap-10">
          {/* Donut */}
          <div className="relative w-48 h-48 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#222" strokeWidth="20" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="20" strokeDasharray="250" strokeDashoffset="5" className="drop-shadow-md" />
              {/* small slivers for other models */}
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="20" strokeDasharray="3 250" strokeDashoffset="-242" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#a855f7" strokeWidth="20" strokeDasharray="3 250" strokeDashoffset="-245" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#fb923c" strokeWidth="20" strokeDasharray="2 250" strokeDashoffset="-248" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white">821.2M</span>
              <span className="text-[11px] text-[#888]">tokens</span>
            </div>
          </div>
          
          {/* List */}
          <div className="flex flex-col justify-center flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1"></div>
                <div className="flex flex-col">
                  <span className="text-sm text-white font-mono">poolside/laguna-s-2.1</span>
                  <span className="text-xs text-[#888]">814M tokens</span>
                </div>
              </div>
              <span className="text-xs text-white/50">99%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1"></div>
                <div className="flex flex-col">
                  <span className="text-sm text-white font-mono">GLM-5.2</span>
                  <span className="text-xs text-[#888]">2.9M tokens</span>
                </div>
              </div>
              <span className="text-xs text-white/50">0.3%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1"></div>
                <div className="flex flex-col">
                  <span className="text-sm text-white font-mono">nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free</span>
                  <span className="text-xs text-[#888]">2.1M tokens</span>
                </div>
              </div>
              <span className="text-xs text-white/50">0.3%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400 mt-1"></div>
                <div className="flex flex-col">
                  <span className="text-sm text-white font-mono">GLM-5-Turbo</span>
                  <span className="text-xs text-[#888]">1.9M tokens</span>
                </div>
              </div>
              <span className="text-xs text-white/50">0.2%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400 mt-1"></div>
                <div className="flex flex-col">
                  <span className="text-sm text-white font-mono">deepseek-v4-flash</span>
                  <span className="text-xs text-[#888]">216.1K tokens</span>
                </div>
              </div>
              <span className="text-xs text-white/50">0%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 mt-1"></div>
                <div className="flex flex-col">
                  <span className="text-sm text-white font-mono">deepseek-flash</span>
                  <span className="text-xs text-[#888]">195.4K tokens</span>
                </div>
              </div>
              <span className="text-xs text-white/50">0%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
