import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, Key, Bot, User, Github, ArrowLeft, Loader2, 
  Plus, Trash2, Check, AlertTriangle, Eye, EyeOff, ChevronDown,
  Palette, Globe, Radar, Zap, X
} from 'lucide-react';
import { getAuthHeaders } from '../lib/api';

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', envVar: 'OPENROUTER_API_KEY', placeholder: 'sk-...' },
  { id: 'opencodezen', name: 'OpenCode Zen', envVar: 'OPENCODE_ZEN_API_KEY', placeholder: 'sk-...' },
  { id: 'openai', name: 'OpenAI', envVar: 'OPENAI_API_KEY', placeholder: 'sk-...' },
  { id: 'groq', name: 'Groq', envVar: 'GROQ_API_KEY', placeholder: 'sk-...' },
  { id: 'together', name: 'Together AI', envVar: 'TOGETHER_API_KEY', placeholder: 'sk-...' },
  { id: 'mistral', name: 'Mistral', envVar: 'MISTRAL_API_KEY', placeholder: 'sk-...' },
  { id: 'deepseek', name: 'DeepSeek', envVar: 'DEEPSEEK_API_KEY', placeholder: 'sk-...' },
  { id: 'xai', name: 'xAI (Grok)', envVar: 'XAI_API_KEY', placeholder: 'sk-...' },
  { id: 'fireworks', name: 'Fireworks AI', envVar: 'FIREWORKS_API_KEY', placeholder: 'sk-...' },
  { id: 'perplexity', name: 'Perplexity', envVar: 'PERPLEXITY_API_KEY', placeholder: 'sk-...' },
  { id: 'cerebras', name: 'Cerebras', envVar: 'CEREBRAS_API_KEY', placeholder: 'sk-...' },
  { id: 'novita', name: 'Novita AI', envVar: 'NOVITA_API_KEY', placeholder: 'sk-...' },
  { id: 'huggingface', name: 'HuggingFace', envVar: 'HUGGINGFACE_API_KEY', placeholder: 'sk-...' },
  { id: 'vercel', name: 'Vercel AI Gateway', envVar: 'VERCEL_API_KEY', placeholder: 'sk-...' },
  { id: 'requesty', name: 'Requesty', envVar: 'REQUESTY_API_KEY', placeholder: 'sk-...' },
  { id: 'aihubmix', name: 'AIHubMix', envVar: 'AIHUBMIX_API_KEY', placeholder: 'sk-...' },
  { id: 'digitalocean', name: 'DigitalOcean Inference', envVar: 'DIGITALOCEAN_API_KEY', placeholder: 'sk-...' },
  { id: 'azure', name: 'Azure OpenAI', envVar: 'AZURE_OPENAI_API_KEY', placeholder: 'sk-...' },
  { id: 'bedrock', name: 'AWS Bedrock', envVar: 'AWS_BEDROCK_API_KEY', placeholder: 'sk-...' },
  { id: 'vertex', name: 'GCP Vertex AI', envVar: 'VERTEX_API_KEY', placeholder: 'sk-...' },
  { id: 'oracle', name: 'Oracle Code Assist', envVar: 'ORACLE_API_KEY', placeholder: 'sk-...' },
  { id: 'huawei', name: 'Huawei Cloud MaaS', envVar: 'HUAWEI_API_KEY', placeholder: 'sk-...' },
  { id: 'sap', name: 'SAP AI Core', envVar: 'SAP_API_KEY', placeholder: 'sk-...' },
  { id: 'sambanova', name: 'SambaNova', envVar: 'SAMBANOVA_API_KEY', placeholder: 'sk-...' },
  { id: 'nebius', name: 'Nebius AI Studio', envVar: 'NEBIUS_API_KEY', placeholder: 'sk-...' },
  { id: 'baseten', name: 'Baseten', envVar: 'BASETEN_API_KEY', placeholder: 'sk-...' },
  { id: 'cohere', name: 'Cohere', envVar: 'COHERE_API_KEY', placeholder: 'sk-...' },
  { id: 'qwen', name: 'Alibaba Cloud (Qwen)', envVar: 'QWEN_API_KEY', placeholder: 'sk-...' },
  { id: 'moonshot', name: 'Moonshot AI', envVar: 'MOONSHOT_API_KEY', placeholder: 'sk-...' },
  { id: 'minimax', name: 'MiniMax', envVar: 'MINIMAX_API_KEY', placeholder: 'sk-...' },
  { id: 'zhipu', name: 'Zhipu AI', envVar: 'ZHIPU_API_KEY', placeholder: 'sk-...' },
  { id: 'tencent', name: 'Tencent Hunyuan', envVar: 'TENCENT_API_KEY', placeholder: 'sk-...' },
  { id: 'volcengine', name: 'Volcengine (Doubao)', envVar: 'VOLCENGINE_API_KEY', placeholder: 'sk-...' },
  { id: 'asksage', name: 'AskSage', envVar: 'ASKSAGE_API_KEY', placeholder: 'sk-...' },
  { id: 'dify', name: 'Dify.ai', envVar: 'DIFY_API_KEY', placeholder: 'sk-...' },
  { id: 'hicap', name: 'Hicap', envVar: 'HICAP_API_KEY', placeholder: 'sk-...' },
  { id: 'gitlab', name: 'GitLab Duo', envVar: 'GITLAB_API_KEY', placeholder: 'sk-...' },
  { id: 'frogbot', name: 'FrogBot', envVar: 'FROGBOT_API_KEY', placeholder: 'sk-...' },
  { id: 'ollamacloud', name: 'Ollama Cloud', envVar: 'OLLAMA_CLOUD_API_KEY', placeholder: 'sk-...' },
  { id: 'replicate', name: 'Replicate', envVar: 'REPLICATE_API_TOKEN', placeholder: 'sk-...' },
  { id: 'anyscale', name: 'Anyscale Endpoints', envVar: 'ANYSCALE_API_KEY', placeholder: 'sk-...' },
  { id: 'deepinfra', name: 'DeepInfra', envVar: 'DEEPINFRA_API_KEY', placeholder: 'sk-...' },
  { id: 'nvidia', name: 'NVIDIA NIM', envVar: 'NVIDIA_NIM_API_KEY', placeholder: 'sk-...' },
  { id: 'friendli', name: 'FriendliAI', envVar: 'FRIENDLI_TOKEN', placeholder: 'sk-...' },
  { id: 'galadriel', name: 'Galadriel', envVar: 'GALADRIEL_API_KEY', placeholder: 'sk-...' },
  { id: 'lambda', name: 'Lambda Labs', envVar: 'LAMBDA_API_KEY', placeholder: 'sk-...' },
  { id: 'modal', name: 'Modal', envVar: 'MODAL_API_KEY', placeholder: 'sk-...' },
  { id: 'runpod', name: 'RunPod', envVar: 'RUNPOD_API_KEY', placeholder: 'sk-...' },
  { id: 'scaleway', name: 'Scaleway', envVar: 'SCALEWAY_API_KEY', placeholder: 'sk-...' },
  { id: 'nlpcloud', name: 'NLP Cloud', envVar: 'NLP_CLOUD_API_KEY', placeholder: 'sk-...' },
  { id: 'predibase', name: 'Predibase', envVar: 'PREDIBASE_API_KEY', placeholder: 'sk-...' },
  { id: 'oci', name: 'OCI Generative AI', envVar: 'OCI_GENAI_CONFIG_PATH', placeholder: 'sk-...' },
  { id: 'datarobot', name: 'DataRobot', envVar: 'DATAROBOT_API_KEY', placeholder: 'sk-...' },
  { id: 'saphub', name: 'SAP Generative AI Hub', envVar: 'SAP_AI_CORE_CLIENT_ID', placeholder: 'sk-...' },
  { id: 'watsonx', name: 'watsonx (IBM)', envVar: 'WATSONX_API_KEY', placeholder: 'sk-...' },
  { id: 'snowflake', name: 'Snowflake Cortex', envVar: 'SNOWFLAKE_CORTEX_TOKEN', placeholder: 'sk-...' },
  { id: 'databricks', name: 'Databricks', envVar: 'DATABRICKS_TOKEN', placeholder: 'sk-...' },
  { id: 'manus', name: 'Manus AI', envVar: 'MANUS_API_KEY', placeholder: 'sk-...' },
  { id: 'chatgptpro', name: 'ChatGPT Pro', envVar: 'CHATGPT_PRO_TOKEN', placeholder: 'sk-...' },
  { id: '302ai', name: '302.AI', envVar: '302_API_KEY', placeholder: 'sk-...' },
  { id: 'azure_cognitive', name: 'Azure Cognitive Services', envVar: 'AZURE_COGNITIVE_API_KEY', placeholder: 'sk-...' },
  { id: 'cloudflare_gateway', name: 'Cloudflare AI Gateway', envVar: 'CLOUDFLARE_GATEWAY_API_KEY', placeholder: 'sk-...' },
  { id: 'cloudflare_workers', name: 'Cloudflare Workers AI', envVar: 'CLOUDFLARE_WORKERS_API_KEY', placeholder: 'sk-...' },
  { id: 'cortecs', name: 'Cortecs', envVar: 'CORTECS_API_KEY', placeholder: 'sk-...' },
  { id: 'github', name: 'GitHub Models', envVar: 'GITHUB_MODELS_API_KEY', placeholder: 'sk-...' },
  { id: 'github_copilot', name: 'GitHub Copilot', envVar: 'GITHUB_COPILOT_API_KEY', placeholder: 'sk-...' },
  { id: 'gmicloud', name: 'GMI Cloud', envVar: 'GMI_CLOUD_API_KEY', placeholder: 'sk-...' },
  { id: 'helicone', name: 'Helicone', envVar: 'HELICONE_API_KEY', placeholder: 'sk-...' },
  { id: 'ionet', name: 'IO.NET', envVar: 'IONET_API_KEY', placeholder: 'sk-...' },
  { id: 'nebius_tf', name: 'Nebius Token Factory', envVar: 'NEBIUS_TOKEN_FACTORY_API_KEY', placeholder: 'sk-...' },
  { id: 'poolside', name: 'Poolside', envVar: 'POOLSIDE_API_KEY', placeholder: 'sk-...' },
  { id: 'stackit', name: 'STACKIT', envVar: 'STACKIT_API_KEY', placeholder: 'sk-...' },
  { id: 'ovhcloud', name: 'OVHcloud AI Endpoints', envVar: 'OVHCLOUD_API_KEY', placeholder: 'sk-...' },
  { id: 'venice', name: 'Venice AI', envVar: 'VENICE_API_KEY', placeholder: 'sk-...' },
  { id: 'zai', name: 'Z.AI', envVar: 'ZAI_API_KEY', placeholder: 'sk-...' },
  { id: 'zenmux', name: 'ZenMux', envVar: 'ZENMUX_API_KEY', placeholder: 'sk-...' },
  { id: 'llm_gateway', name: 'LLM Gateway', envVar: 'LLM_GATEWAY_API_KEY', placeholder: 'sk-...' },
  { id: 'daoxe', name: 'DaoXE', envVar: 'DAOXE_API_KEY', placeholder: 'sk-...' },
  { id: 'unbound', name: 'Unbound', envVar: 'UNBOUND_API_KEY', placeholder: 'sk-...' },
  { id: 'mixlayer', name: 'Mixlayer', envVar: 'MIXLAYER_API_KEY', placeholder: 'sk-...' },
  { id: 'chutes', name: 'Chutes AI', envVar: 'CHUTES_API_KEY', placeholder: 'sk-...' },
  { id: 'inception', name: 'Inception', envVar: 'INCEPTION_API_KEY', placeholder: 'sk-...' },
  { id: 'v0', name: 'v0 (Vercel)', envVar: 'V0_API_KEY', placeholder: 'sk-...' },
  { id: 'synthetic', name: 'Synthetic Provider', envVar: 'SYNTHETIC_API_KEY', placeholder: 'sk-...' },
  { id: 'alibaba', name: 'Alibaba Cloud', envVar: 'ALIBABA_CLOUD_API_KEY', placeholder: 'sk-...' },
  { id: 'kilogateway', name: 'Kilo Gateway', envVar: 'KILO_GATEWAY_API_KEY', placeholder: 'sk-...' },
  { id: 'opencode_go', name: 'OpenCode Go', envVar: 'OPENCODE_GO_API_KEY', placeholder: 'sk-...' },
  { id: 'litellm', name: 'LiteLLM (self-hosted gateway)', envVar: 'LITELLM_API_KEY', placeholder: 'sk-...' },
  { id: 'kilo', name: 'Kilo Code', envVar: 'KILO_API_KEY', placeholder: 'sk-...' },
  { id: 'nous', name: 'Nous Research', envVar: 'NOUS_RESEARCH_API_KEY', placeholder: 'sk-...' },
  { id: 'octoai', name: 'OctoAI', envVar: 'OCTOAI_API_KEY', placeholder: 'sk-...' },
  { id: 'ai21', name: 'AI21 Labs', envVar: 'AI21_API_KEY', placeholder: 'sk-...' },
  { id: 'zerooneai', name: '01.AI', envVar: 'ZEROONE_API_KEY', placeholder: 'sk-...' },
  { id: 'upstage', name: 'Upstage', envVar: 'UPSTAGE_API_KEY', placeholder: 'sk-...' },
  { id: 'jina', name: 'Jina AI', envVar: 'JINA_API_KEY', placeholder: 'sk-...' },
  { id: 'nomic', name: 'Nomic AI', envVar: 'NOMIC_API_KEY', placeholder: 'sk-...' },
  { id: 'aleph_alpha', name: 'Aleph Alpha', envVar: 'ALEPH_ALPHA_API_KEY', placeholder: 'sk-...' },
  { id: 'forefront', name: 'Forefront AI', envVar: 'FOREFRONT_API_KEY', placeholder: 'sk-...' },
  { id: 'gradient', name: 'Gradient', envVar: 'GRADIENT_API_KEY', placeholder: 'sk-...' },
  { id: 'banana', name: 'Banana.dev', envVar: 'BANANA_API_KEY', placeholder: 'sk-...' },
  { id: 'inflection', name: 'Inflection AI', envVar: 'INFLECTION_API_KEY', placeholder: 'sk-...' },
  { id: 'writer', name: 'Writer', envVar: 'WRITER_API_KEY', placeholder: 'sk-...' },
  { id: 'monsterapi', name: 'MonsterAPI', envVar: 'MONSTER_API_KEY', placeholder: 'sk-...' },
  { id: 'shuttleai', name: 'ShuttleAI', envVar: 'SHUTTLE_API_KEY', placeholder: 'sk-...' },
  { id: 'nexusraven', name: 'NexusRaven', envVar: 'NEXUS_RAVEN_API_KEY', placeholder: 'sk-...' },
  { id: 'reka', name: 'Reka AI', envVar: 'REKA_API_KEY', placeholder: 'sk-...' },
  { id: 'baichuan', name: 'Baichuan', envVar: 'BAICHUAN_API_KEY', placeholder: 'sk-...' },
  { id: 'sensetime', name: 'SenseTime', envVar: 'SENSETIME_API_KEY', placeholder: 'sk-...' },
  { id: 'ernie', name: 'Ernie (Baidu)', envVar: 'ERNIE_API_KEY', placeholder: 'sk-...' },
  { id: 'stepfun', name: 'StepFun', envVar: 'STEPFUN_API_KEY', placeholder: 'sk-...' },
  { id: 'siliconflow', name: 'SiliconFlow', envVar: 'SILICONFLOW_API_KEY', placeholder: 'sk-...' },
  { id: 'lepton', name: 'Lepton AI', envVar: 'LEPTON_API_KEY', placeholder: 'sk-...' },
  { id: 'phind', name: 'Phind', envVar: 'PHIND_API_KEY', placeholder: 'sk-...' },
  { id: 'you', name: 'You.com', envVar: 'YOU_API_KEY', placeholder: 'sk-...' },
  { id: 'mindsdb', name: 'MindsDB', envVar: 'MINDSDB_API_KEY', placeholder: 'sk-...' },
  { id: 'voyage', name: 'Voyage AI', envVar: 'VOYAGE_API_KEY', placeholder: 'sk-...' },
  { id: 'kyutai', name: 'Kyutai', envVar: 'KYUTAI_API_KEY', placeholder: 'sk-...' },
  { id: 'poe', name: 'Poe API', envVar: 'POE_API_KEY', placeholder: 'sk-...' },
  { id: 'abacus', name: 'Abacus AI', envVar: 'ABACUS_API_KEY', placeholder: 'sk-...' },
  { id: 'coreweave', name: 'CoreWeave AI', envVar: 'COREWEAVE_API_KEY', placeholder: 'sk-...' },
  { id: 'braintrust', name: 'Braintrust Gateway', envVar: 'BRAINTRUST_API_KEY', placeholder: 'sk-...' },
  { id: 'portkey', name: 'Portkey Gateway', envVar: 'PORTKEY_API_KEY', placeholder: 'sk-...' },
  { id: 'pezzo', name: 'Pezzo', envVar: 'PEZZO_API_KEY', placeholder: 'sk-...' },
  { id: 'promptlayer', name: 'PromptLayer', envVar: 'PROMPTLAYER_API_KEY', placeholder: 'sk-...' },
  { id: 'vellum', name: 'Vellum', envVar: 'VELLUM_API_KEY', placeholder: 'sk-...' },
  { id: 'h2o', name: 'H2O.ai', envVar: 'H2O_API_KEY', placeholder: 'sk-...' },
  { id: 'llamacloud', name: 'LlamaCloud', envVar: 'LLAMACLOUD_API_KEY', placeholder: 'sk-...' },
  { id: 'langsmith', name: 'LangSmith', envVar: 'LANGSMITH_API_KEY', placeholder: 'sk-...' },
  { id: 'runhouse', name: 'RunHouse', envVar: 'RUNHOUSE_API_KEY', placeholder: 'sk-...' },
  { id: 'replit', name: 'Replit ModelFarm', envVar: 'REPLIT_API_KEY', placeholder: 'sk-...' },
  { id: 'akash', name: 'Akash Inference', envVar: 'AKASH_API_KEY', placeholder: 'sk-...' },
  { id: 'deepgram', name: 'Deepgram', envVar: 'DEEPGRAM_API_KEY', placeholder: 'sk-...' },
  { id: 'brave', name: 'Brave Search/LLM', envVar: 'BRAVE_API_KEY', placeholder: 'sk-...' },
  { id: 'kagi', name: 'Kagi API', envVar: 'KAGI_API_KEY', placeholder: 'sk-...' },
  { id: 'clarifai', name: 'Clarifai', envVar: 'CLARIFAI_API_KEY', placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY', placeholder: 'sk-ant-...' },
  { id: 'google', name: 'Google', envVar: 'GOOGLE_API_KEY', placeholder: 'AIza...' },
];

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
  const [loading, setLoading] = useState(true);
  const [addingFor, setAddingFor] = useState(null);
  const [newKey, setNewKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showKey, setShowKey] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/v1/keys', { headers: getAuthHeaders() });
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleTest = async (providerId) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/keys/test', {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ providerId, apiKey: newKey })
      });
      const data = await res.json();
      setTestResult(data.valid ? 'valid' : 'invalid');
    } catch { setTestResult('error'); }
    setTesting(false);
  };

  const handleAdd = async (provider) => {
    try {
      await fetch('/api/v1/keys', {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ providerId: provider.id, envVar: provider.envVar, displayName: provider.name, apiKey: newKey })
      });
      setAddingFor(null);
      setNewKey('');
      setTestResult(null);
      fetchKeys();
    } catch (e) { console.error(e); }
  };

  const handleRemove = async (id) => {
    try {
      await fetch(`/api/v1/keys/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      fetchKeys();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading keys...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">API Keys</h2>
        <p className="text-sm text-white/40">Connect your AI provider keys. Keys are encrypted and stored securely.</p>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {PROVIDERS.map(provider => {
          const existing = keys.find(k => k.providerId === provider.id);
          const isAdding = addingFor === provider.id;

          return (
            <div key={provider.id} className="bg-[#151515] border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${existing ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-white/20'}`} />
                  <span className="text-sm font-medium text-white">{provider.name}</span>
                  {existing && <span className="text-xs text-white/30 font-mono">{existing.masked}</span>}
                </div>
                <div>
                  {existing ? (
                    <button onClick={() => handleRemove(existing.id)} className="text-xs text-red-400/70 hover:text-red-400 transition flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/10">
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  ) : (
                    <button onClick={() => { setAddingFor(isAdding ? null : provider.id); setNewKey(''); setTestResult(null); }} className="text-xs text-blue-400/70 hover:text-blue-400 transition flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-500/10">
                      <Plus className="w-3 h-3" /> {isAdding ? 'Cancel' : 'Add key'}
                    </button>
                  )}
                </div>
              </div>

              {isAdding && (
                <div className="mt-4 space-y-3 pl-5 border-l-2 border-white/5">
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={newKey}
                      onChange={e => setNewKey(e.target.value)}
                      placeholder={provider.placeholder}
                      className="w-full bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 pr-8 font-mono"
                    />
                    <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleTest(provider.id)} disabled={!newKey || testing} className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3 py-1.5 rounded-lg transition disabled:opacity-40 border border-white/10">
                      {testing ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null} Test key
                    </button>
                    <button onClick={() => handleAdd(provider)} disabled={!newKey} className="text-xs bg-emerald-600/80 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-40">
                      Save
                    </button>
                    {testResult === 'valid' && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Valid</span>}
                    {testResult === 'invalid' && <span className="text-xs text-red-400">Invalid key</span>}
                    {testResult === 'error' && <span className="text-xs text-red-400">Test failed</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
          <button onClick={() => setChangingPw(true)} className="text-xs text-blue-400 hover:text-blue-300 transition">Change password</button>
        ) : (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" className="w-full bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50" />
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 8 chars)" className="w-full bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50" />
            <div className="flex items-center gap-2">
              <button onClick={handleChangePw} disabled={!currentPw || newPw.length < 8} className="text-xs bg-emerald-600/80 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-40">Update</button>
              <button onClick={() => { setChangingPw(false); setCurrentPw(''); setNewPw(''); }} className="text-xs text-white/40 hover:text-white/60 transition">Cancel</button>
            </div>
          </div>
        )}
        {pwMsg && <p className={`text-xs ${pwMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{pwMsg.text}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={handleLogout} className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2 rounded-lg transition border border-white/10">Log out</button>
        <button onClick={handleDelete} disabled={deleting} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition border border-red-500/20 disabled:opacity-40">
          {deleting ? 'Deleting...' : 'Delete account'}
        </button>
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
            <button onClick={handleDisconnect} className="text-xs text-red-400/70 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20">Disconnect</button>
          ) : (
            <button onClick={handleConnect} className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition border border-white/10">Connect</button>
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
            <button
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
            </button>
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
          <button className="px-4 py-2 rounded-lg text-sm text-white font-medium transition" style={{ background: ACCENT_COLORS.find(c => c.id === current)?.color }}>Primary Button</button>
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
              <button onClick={() => removeDomain(d)} className="text-white/30 hover:text-red-400 transition"><X className="w-3 h-3" /></button>
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
          <button onClick={addDomain} disabled={!newDomain.trim()} className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3 py-2 rounded-lg transition border border-white/10 disabled:opacity-40 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </button>
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
            <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${watch.autoFix ? 'bg-emerald-500' : 'bg-white/10'}`}
              onClick={() => updateWatch({ autoFix: !watch.autoFix })}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${watch.autoFix ? 'left-5' : 'left-1'}`} />
            </div>
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
              <button
                key={n}
                onClick={() => updateGod({ concurrency: n })}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                  god.concurrency === n
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'
                }`}
              >
                {n}
              </button>
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
            <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${god.skipTests ? 'bg-amber-500' : 'bg-white/10'}`}
              onClick={() => updateGod({ skipTests: !god.skipTests })}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${god.skipTests ? 'left-5' : 'left-1'}`} />
            </div>
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
  const [activeTab, setActiveTab] = useState('permissions');
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
        <div className="p-5 border-b border-white/5">
          <Link to="/ai/chat" className="flex items-center gap-2 text-white/50 hover:text-white transition text-sm group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to workspace
          </Link>
          <h1 className="text-lg font-semibold text-white mt-4 tracking-tight">Settings</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-sm' 
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <p className="text-[10px] text-white/20 text-center">mcode v1.0</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto px-8 py-10">
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
      </main>
    </div>
  );
}
