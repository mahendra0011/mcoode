import { useState, useEffect } from 'react';
import { X, Key, Check, Eye, EyeOff, TestTube } from 'lucide-react';
import { listModels, saveKey, deleteKey, testKey, listKeys } from '../../api/chatApi.js';
import { pushToast } from '../../store/slices/toastSlice.js';
import { useDispatch } from 'react-redux';
import { setHasKeys } from '../../store/slices/chatSlice.js';

const PROVIDER_GROUPS = [
  {
    label: 'Popular',
    ids: ['openrouter', 'openai', 'anthropic', 'google', 'deepseek']
  },
  {
    label: 'Cloud Gateways',
    ids: ['groq', 'together', 'mistral', 'xai', 'moonshot']
  },
  {
    label: 'Self-Hosted / Local',
    ids: ['ollama', 'lmstudio', 'localai', 'llamaedge', 'vllm']
  },
  {
    label: 'Enterprise',
    ids: ['azure', 'bedrock', 'vertex', 'github']
  }
];

const MODEL_ENV_MAP = {
  openrouter: 'OPENROUTER_API_KEY',
  opencodezen: 'OPENCODE_ZEN_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  groq: 'GROQ_API_KEY',
  together: 'TOGETHER_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  xai: 'XAI_API_KEY',
  moonshot: 'MOONSHOT_API_KEY',
  ollama: 'OLLAMA_HOST',
  lmstudio: 'LMSTUDIO_HOST'
};

export function ModelSelectorModal({ open, onClose, hasKeys }) {
  const dispatch = useDispatch();
  const [step, setStep] = useState('list'); // 'list' | 'add' | 'test'
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [savedKeys, setSavedKeys] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ providerId: '', apiKey: '', displayName: '' });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open]);

  async function loadData() {
    try {
      const data = await listModels();
      setModels(data.models || []);
      setProviders(data.providers || []);
    } catch (err) {
      console.error(err);
    }
    try {
      const { keys } = await listKeys();
      setSavedKeys(keys);
    } catch {
      setSavedKeys([]);
    }
  }

  const handleSaveKey = async () => {
    if (!addForm.providerId || !addForm.apiKey) {
      dispatch(pushToast({ kind: 'err', text: 'provider and API key are required' }));
      return;
    }
    setSaving(true);
    try {
      await saveKey({
        providerId: addForm.providerId,
        envVar: MODEL_ENV_MAP[addForm.providerId] || `${addForm.providerId.toUpperCase()}_API_KEY`,
        displayName: addForm.displayName || addForm.providerId,
        apiKey: addForm.apiKey
      });
      dispatch(pushToast({ kind: 'ok', text: 'API key saved' }));
      setShowAddForm(false);
      setAddForm({ providerId: '', apiKey: '', displayName: '' });
      setHasKeys(true);
      loadData();
    } catch (err) {
      dispatch(pushToast({ kind: 'err', text: `failed to save key: ${err.message}` }));
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async () => {
    if (!addForm.providerId || !addForm.apiKey) return;
    setTesting(true);
    try {
      const { valid } = await testKey({ providerId: addForm.providerId, apiKey: addForm.apiKey });
      if (valid) {
        dispatch(pushToast({ kind: 'ok', text: 'API key is valid' }));
      } else {
        dispatch(pushToast({ kind: 'err', text: 'API key is invalid' }));
      }
    } catch (err) {
      dispatch(pushToast({ kind: 'err', text: `test failed: ${err.message}` }));
    } finally {
      setTesting(false);
    }
  };

  const handleDeleteKey = async (id) => {
    try {
      await deleteKey(id);
      dispatch(pushToast({ kind: 'ok', text: 'API key removed' }));
      setSavedKeys(savedKeys.filter((k) => k.id !== id));
      if (savedKeys.length <= 1) setHasKeys(false);
    } catch (err) {
      dispatch(pushToast({ kind: 'err', text: `failed to delete: ${err.message}` }));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
      <div className="w-full max-w-2xl rounded-lg border border-mcode-border bg-mcode-panel max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mcode-border px-4 py-3">
          <h3 className="font-mono text-sm text-mcode-green">
            {step === 'list' ? 'Select Model & API Keys' : step === 'add' ? 'Add API Key' : 'Test Key'}
          </h3>
          <button
            onClick={() => { setShowKey(false); setStep('list'); setShowAddForm(false); setAddForm({ providerId: '', apiKey: '', displayName: '' }); onClose(); }}
            className="rounded p-1 text-gray-500 hover:bg-mcode-bg hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {step === 'list' && (
            <>
              {/* Saved keys section */}
              {savedKeys.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 font-mono text-xs uppercase text-gray-600">Your API Keys</h4>
                  <div className="space-y-1">
                    {savedKeys.map((k) => (
                      <div key={k.id} className="flex items-center justify-between rounded-md border border-mcode-border bg-mcode-bg px-3 py-2">
                        <div className="font-mono text-xs">
                          <span className="text-mcode-green">{k.providerId}</span> — {k.displayName}
                        </div>
                        <div className="flex items-center gap-2">
                          <Key className="h-3 w-3 text-gray-500" />
                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            className="text-mcode-red hover:text-mcode-red/80"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-mcode-border bg-mcode-bg px-3 py-2 font-mono text-xs text-mcode-green hover:bg-mcode-panel"
                >
                  <Key className="h-4 w-4" />
                  Add a new API key
                </button>
              )}

              {showAddForm && (
                <>
                  <div className="mb-3">
                    <label className="block font-mono text-xs text-gray-600">Provider</label>
                    <select
                      value={addForm.providerId}
                      onChange={(e) => setAddForm({ ...addForm, providerId: e.target.value })}
                      className="w-full rounded-md border border-mcode-border bg-mcode-bg px-2 py-1.5 font-mono text-sm text-gray-200 focus:outline-none focus:border-mcode-green"
                    >
                      <option value="">Select a provider</option>
                      {PROVIDER_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {providers
                            .filter((p) => group.ids.includes(p.id) || p.id === 'mock')
                            .map((p) => (
                              <option key={p.id} value={p.id}>{p.displayName}</option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="block font-mono text-xs text-gray-600">API Key</label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={addForm.apiKey}
                        onChange={(e) => setAddForm({ ...addForm, apiKey: e.target.value })}
                        className="w-full rounded-md border border-mcode-border bg-mcode-bg px-2 py-1.5 font-mono text-sm text-gray-200 focus:outline-none focus:border-mcode-green"
                        placeholder="sk-..."
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="mb-2 flex gap-2">
                    <button
                      onClick={handleTestKey}
                      disabled={testing || !addForm.providerId || !addForm.apiKey}
                      className="flex-1 rounded-md border border-mcode-border bg-mcode-bg px-3 py-1.5 font-mono text-xs text-gray-300 hover:border-mcode-green/50 disabled:opacity-50"
                    >
                      {testing ? 'testing...' : 'Test Key'}
                    </button>
                    <button
                      onClick={handleSaveKey}
                      disabled={saving || !addForm.providerId || !addForm.apiKey}
                      className="flex-1 rounded-md border border-mcode-green bg-mcode-green/10 px-3 py-1.5 font-mono text-xs text-mcode-green hover:bg-mcode-green/20 disabled:opacity-50"
                    >
                      {saving ? 'saving...' : 'Save & Close'}
                    </button>
                  </div>
                </>
              )}

              {/* Available models list */}
              <div className="border-t border-mcode-border pt-4">
                <h4 className="mb-2 font-mono text-xs uppercase text-gray-600">Available Models</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {models.map((m) => (
                    <div key={m.ref} className="rounded-md border border-mcode-border bg-mcode-bg px-3 py-2">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-gray-300">{m.name}</span>
                        <span className="text-gray-600">{m.provider}</span>
                      </div>
                    </div>
                  ))}
                  {models.length === 0 && (
                    <p className="font-mono text-xs text-gray-600 py-4 text-center">
                      {hasKeys ? 'No models available' : 'Add an API key to see available models'}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
