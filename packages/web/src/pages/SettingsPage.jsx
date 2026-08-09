import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const MotionLink = motion.create(Link);
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Key, Bot, User, Github, ArrowLeft, Loader2,
  Plus, Trash2, Check, AlertTriangle, Eye, EyeOff, ChevronDown,
  Palette, Globe, Radar, Zap, X, Box
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
  const [keys, setKeys] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProviderId, setActiveProviderId] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const [provRes, keyRes] = await Promise.all([
        fetch('/api/v1/settings/providers').then(r => r.ok ? r.json() : { providers: [] }),
        fetch('/api/v1/keys', { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : { keys: [] })
      ]);
      const provList = provRes.providers || [];
      setProviders(provList);
      setKeys(keyRes.keys || []);
      if (!activeProviderId && provList.length > 0) {
        setActiveProviderId(provList[0].id);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleTest = async () => {
    if (!newKey || !activeProviderId) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ providerId: activeProviderId, apiKey: newKey })
      });
      const data = await res.json();
      setTestResult(data.valid ? 'valid' : 'invalid');
    } catch { setTestResult('error'); }
    setTesting(false);
  };

  const handleAdd = async () => {
    if (!newKey || !activeProviderId) return;
    setSaving(true);
    try {
      const provider = providers.find(p => p.id === activeProviderId);
      await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          providerId: activeProviderId,
          envVar: provider?.envVar || `${activeProviderId.toUpperCase()}_API_KEY`,
          displayName: provider?.displayName || activeProviderId,
          apiKey: newKey
        })
      });
      setNewKey('');
      setTestResult(null);
      setShowKey(false);
      await fetchData();
      window.dispatchEvent(new CustomEvent('mcode:reload-models'));
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleRemove = async (id) => {
    try {
      await fetch(`/api/v1/keys/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      await fetchData();
      window.dispatchEvent(new CustomEvent('mcode:reload-models'));
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading keys...</div>;

  const activeProvider = providers.find(p => p.id === activeProviderId);
  const existingKey = keys.find(k => k.providerId === activeProviderId);

  const filteredProviders = search
    ? providers.filter(p => (p.displayName || p.id).toLowerCase().includes(search.toLowerCase()))
    : providers;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Model settings</h2>
        <p className="text-sm text-white/50">Manage custom model providers. Once configured, they can be selected during chat.</p>
      </div>

      <div className="flex overflow-hidden border border-white/5 rounded-xl bg-[#151515]" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Sidebar */}
        <div className="w-64 border-r border-white/5 flex flex-col flex-shrink-0">
          {/* Search */}
          <div className="p-3 border-b border-white/5">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search providers..."
              className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/20 transition"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
            {filteredProviders.map((provider) => {
              const isActive = activeProviderId === provider.id;
              const hasKey = keys.some(k => k.providerId === provider.id);
              
              return (
                <button 
                  key={provider.id}
                  onClick={() => {
                    setActiveProviderId(provider.id);
                    setNewKey('');
                    setTestResult(null);
                    setShowKey(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 transition ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Box className="w-4 h-4 text-white/60 flex-shrink-0" />
                    <span className={`text-sm text-left truncate ${isActive ? 'text-white font-medium' : 'text-white/80'}`}>{provider.displayName}</span>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-2 ${hasKey ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/20'}`}></div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {activeProvider ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-semibold text-white">{activeProvider.displayName}</h3>
                  
                  {existingKey ? (
                    <>
                      <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium ml-2 border border-emerald-500/20">
                        Enabled
                      </div>
                      <button onClick={() => handleRemove(existingKey.id)} className="px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition border border-white/5">
                        Disable
                      </button>
                    </>
                  ) : (
                    <div className="px-2.5 py-0.5 rounded-full bg-white/5 text-white/50 text-xs font-medium ml-2 border border-white/10">
                      Not Configured
                    </div>
                  )}
                </div>
                {existingKey && (
                  <button onClick={() => handleRemove(existingKey.id)} className="text-white/40 hover:text-red-400 transition p-2 rounded-lg hover:bg-red-400/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-8">
                {/* Env var */}
                <div>
                  <label className="block text-sm text-white/50 mb-2">Environment variable</label>
                  <div className="bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/60 font-mono">
                    {activeProvider.envVar || `${activeProviderId.toUpperCase()}_API_KEY`}
                  </div>
                </div>

                {/* API Key input */}
                <div>
                  <label className="block text-sm text-white/50 mb-2">API key</label>
                  <div className="flex items-start gap-3">
                    <div className="relative flex-1">
                      <input 
                        type={showKey ? "text" : "password"} 
                        value={existingKey ? (existingKey.masked || '••••••••••••••••••••••••') : newKey}
                        onChange={(e) => { if(!existingKey) setNewKey(e.target.value); }}
                        readOnly={!!existingKey}
                        placeholder={`Enter your ${activeProvider.displayName} API key...`}
                        className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition font-mono pr-10"
                      />
                      <button 
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition p-1"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {!existingKey && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTest}
                      disabled={!newKey || testing}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 text-sm font-medium rounded-xl transition border border-white/10 disabled:opacity-40 flex items-center gap-2"
                    >
                      {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Test key
                    </button>
                    <button 
                      onClick={handleAdd}
                      disabled={!newKey || saving}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Save
                    </button>
                  </div>
                )}

                {/* Test result */}
                {testResult && (
                  <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
                    testResult === 'valid'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : testResult === 'invalid'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {testResult === 'valid' ? (
                      <><Check className="w-4 h-4" /> API key is valid</>
                    ) : testResult === 'invalid' ? (
                      <><AlertTriangle className="w-4 h-4" /> API key is invalid</>
                    ) : (
                      <><AlertTriangle className="w-4 h-4" /> Could not reach provider</>
                    )}
                  </div>
                )}

                {/* Existing key details */}
                {existingKey && (
                  <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">Provider ID</span>
                      <span className="text-white/70 font-mono">{existingKey.providerId}</span>
                    </div>
                    {existingKey.createdAt && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Added</span>
                        <span className="text-white/70">{new Date(existingKey.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-white/30 text-sm">
              Select a provider from the sidebar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── MODELS TAB ─────────────────── */
function ModelsTab({ settings, onUpdateModels }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/keys/models', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { setModels(d.models || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const overrides = settings.modelOverrides || {};
  const domains = [
    { key: 'general', label: 'General Chat', desc: 'Used for plain chat conversations' },
    { key: 'build', label: 'Agent / Coding', desc: 'Used when running the AI code agent' },
    { key: 'planning', label: 'Planning (God-Mode)', desc: 'Used for building task plans' },
  ];

  if (loading) return <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading models...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Default Models</h2>
        <p className="text-sm text-white/40">Choose which model to use for each mode. Leave as Auto to let mcode pick the best available model.</p>
      </div>

      {models.length === 0 ? (
        <div className="bg-[#151515] border border-white/5 rounded-xl p-6 text-center">
          <p className="text-sm text-white/40">No models available — add API keys first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map(d => (
            <div key={d.key} className="bg-[#151515] border border-white/5 rounded-xl p-5">
              <label className="text-sm font-medium text-white block mb-1">{d.label}</label>
              <p className="text-xs text-white/30 mb-3">{d.desc}</p>
              <div className="relative">
                <select
                  value={overrides[d.key] || ''}
                  onChange={e => onUpdateModels({ [d.key]: e.target.value || undefined })}
                  className="w-full bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                >
                  <option value="">Auto (recommended)</option>
                  {models.map(m => <option key={m.ref} value={m.ref}>{m.name} ({m.provider})</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── ACCOUNT TAB ─────────────────── */
function AccountTab() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingPw, setChangingPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/v1/auth/me', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { setUser(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleChangePw = async () => {
    setPwMsg(null);
    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      });
      const d = await res.json();
      if (d.ok) {
        setPwMsg({ type: 'success', text: 'Password changed!' });
        setChangingPw(false); setCurrentPw(''); setNewPw('');
      } else {
        setPwMsg({ type: 'error', text: d.error?.message || 'Failed' });
      }
    } catch { setPwMsg({ type: 'error', text: 'Network error' }); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure? This will permanently delete your account and all associated data.')) return;
    setDeleting(true);
    try {
      await fetch('/api/v1/auth/me', { method: 'DELETE', headers: getAuthHeaders() });
      localStorage.removeItem('mcode_tokens');
      navigate('/login');
    } catch { setDeleting(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('mcode_tokens');
    navigate('/login');
  };

  if (loading) return <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Account</h2>
        <p className="text-sm text-white/40">Manage your mcode account.</p>
      </div>

      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-4">
        <div>
          <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Email</span>
          <p className="text-sm text-white mt-1">{user?.email || 'Unknown'}</p>
        </div>

        {/* Change password */}
        {!changingPw ? (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setChangingPw(true)} className="text-xs text-blue-400 hover:text-blue-300 transition">Change password</motion.button>
        ) : (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" className="w-full bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50" />
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 8 chars)" className="w-full bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50" />
            <div className="flex items-center gap-2">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleChangePw} disabled={!currentPw || newPw.length < 8} className="text-xs bg-emerald-600/80 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-40">Update</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setChangingPw(false); setCurrentPw(''); setNewPw(''); }} className="text-xs text-white/40 hover:text-white/60 transition">Cancel</motion.button>
            </div>
          </div>
        )}
        {pwMsg && <p className={`text-xs ${pwMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{pwMsg.text}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleLogout} className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2 rounded-lg transition border border-white/10">Log out</motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDelete} disabled={deleting} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition border border-red-500/20 disabled:opacity-40">
          {deleting ? 'Deleting...' : 'Delete account'}
        </motion.button>
      </div>
    </div>
  );
}

/* ─────────────────── CONNECTIONS TAB ─────────────────── */
function ConnectionsTab() {
  const [githubAccount, setGithubAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/github/status', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { if (d.connected) setGithubAccount(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleConnect = () => { window.location.href = '/api/v1/auth/github'; };
  const handleDisconnect = async () => {
    try {
      await fetch('/api/v1/github/disconnect', { method: 'POST', headers: getAuthHeaders() });
      setGithubAccount(null);
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Connected Accounts</h2>
        <p className="text-sm text-white/40">Link external accounts for enhanced functionality.</p>
      </div>

      <div className="bg-[#151515] border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${githubAccount ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/10'}`}>
              <Github className={`w-4 h-4 ${githubAccount ? 'text-emerald-400' : 'text-white/40'}`} />
            </div>
            <div>
              <span className="text-sm font-medium text-white block">GitHub</span>
              {githubAccount ? (
                <span className="text-xs text-emerald-400">Connected as @{githubAccount.username}</span>
              ) : (
                <span className="text-xs text-white/30">Not connected</span>
              )}
            </div>
          </div>
          {githubAccount ? (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDisconnect} className="text-xs text-red-400/70 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20">Disconnect</motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleConnect} className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition border border-white/10">Connect</motion.button>
          )}
        </div>
      </div>
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
