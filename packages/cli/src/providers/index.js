import { OpenAICompatible } from './openai-compatible.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './google.js';
import { MockProvider } from './mock.js';

/** Default per-domain scores (0-100) for a generic model. */
const S = {
  general: {
    planning: 85, frontend: 75, backend: 75, db: 75, devops: 70, test: 70, docs: 80, bugfix: 70
  },
  coding: {
    planning: 70, frontend: 90, backend: 90, db: 80, devops: 80, test: 75, docs: 70, bugfix: 88
  },
  fast: {
    planning: 55, frontend: 65, backend: 70, db: 60, devops: 85, test: 90, docs: 70, bugfix: 75
  },
  cheap: {
    planning: 45, frontend: 60, backend: 65, db: 55, devops: 70, test: 85, docs: 65, bugfix: 68
  }
};

const MODEL_DEFS = {
  // Anthropic
  'anthropic/claude-fable-5': { name: 'Claude Fable 5', scores: { ...S.general, planning: 98, backend: 98, db: 95, bugfix: 96 }, costPer1kIn: 0.01, costPer1kOut: 0.05 },
  'anthropic/claude-mythos-5': { name: 'Claude Mythos 5', scores: { ...S.general, planning: 98, backend: 98 }, costPer1kIn: 0.015, costPer1kOut: 0.075 },
  'anthropic/claude-opus-5': { name: 'Claude Opus 5', scores: { ...S.general, planning: 96, backend: 96 }, costPer1kIn: 0.005, costPer1kOut: 0.025 },
  'anthropic/claude-opus-4-8': { name: 'Claude Opus 4.8', scores: { ...S.general, planning: 94 }, costPer1kIn: 0.005, costPer1kOut: 0.025 },
  'anthropic/claude-sonnet-5': { name: 'Claude Sonnet 5', scores: { ...S.general, planning: 95, backend: 95, db: 92, bugfix: 94 }, costPer1kIn: 0.003, costPer1kOut: 0.015 },
  'anthropic/claude-sonnet-4-6': { name: 'Claude Sonnet 4.6', scores: { ...S.general, planning: 93 }, costPer1kIn: 0.003, costPer1kOut: 0.015 },
  'anthropic/claude-haiku-4-5': { name: 'Claude Haiku 4.5', free: true, scores: { ...S.fast, planning: 65 }, costPer1kIn: 0.001, costPer1kOut: 0.005 },
  
  // OpenAI
  'openai/gpt-5.6-sol': { name: 'GPT-5.6 Sol', scores: { ...S.general, frontend: 96, planning: 95 }, costPer1kIn: 0.005, costPer1kOut: 0.03 },
  'openai/gpt-5.6-terra': { name: 'GPT-5.6 Terra', scores: { ...S.general, frontend: 92 }, costPer1kIn: 0.002, costPer1kOut: 0.012 },
  'openai/gpt-5.6-luna': { name: 'GPT-5.6 Luna', free: true, scores: { ...S.cheap, docs: 85 }, costPer1kIn: 0.0002, costPer1kOut: 0.0012 },
  'openai/gpt-5.5': { name: 'GPT-5.5', scores: { ...S.general, planning: 92 }, costPer1kIn: 0.0025, costPer1kOut: 0.01 },
  'openai/gpt-5.4': { name: 'GPT-5.4', scores: { ...S.general }, costPer1kIn: 0.002, costPer1kOut: 0.008 },
  'openai/gpt-5.3-codex': { name: 'GPT-5.3 Codex', scores: { ...S.coding, backend: 96, bugfix: 95 }, costPer1kIn: 0.002, costPer1kOut: 0.008 },
  
  // Google
  'google/gemini-3.6-flash': { name: 'Gemini 3.6 Flash', free: true, scores: { ...S.fast, docs: 85 }, costPer1kIn: 0.0001, costPer1kOut: 0.0004 },
  'google/gemini-3.1-pro': { name: 'Gemini 3.1 Pro', scores: { ...S.general, planning: 94 }, costPer1kIn: 0.00125, costPer1kOut: 0.005 },
  'google/gemma-4-31b': { name: 'Gemma 4 31B', free: true, scores: { ...S.general }, costPer1kIn: 0, costPer1kOut: 0 },
  
  // DeepSeek
  'deepseek/deepseek-v4-pro': { name: 'DeepSeek V4 Pro', scores: { ...S.coding, backend: 95 }, costPer1kIn: 0.0027, costPer1kOut: 0.011 },
  'deepseek/deepseek-v4-flash-0731': { name: 'DeepSeek V4 Flash 0731', scores: { ...S.coding, bugfix: 98, backend: 96 }, costPer1kIn: 0.00014, costPer1kOut: 0.00028 },
  'deepseek/deepseek-r1': { name: 'DeepSeek R1', scores: { ...S.coding, planning: 90 }, costPer1kIn: 0.001, costPer1kOut: 0.002 },
  
  // Mistral
  'mistralai/mistral-medium-3.5': { name: 'Mistral Medium 3.5', scores: { ...S.general }, costPer1kIn: 0.001, costPer1kOut: 0.003 },
  'mistralai/codestral': { name: 'Codestral', scores: { ...S.coding, backend: 92 }, costPer1kIn: 0.0003, costPer1kOut: 0.0009 },
  
  // Qwen
  'qwen/qwen-3.8-max': { name: 'Qwen 3.8 Max', scores: { ...S.general, frontend: 94 }, costPer1kIn: 0.0015, costPer1kOut: 0.006 },
  'qwen/qwen-3.7-flash': { name: 'Qwen 3.7 Flash', free: true, scores: { ...S.cheap }, costPer1kIn: 0.00015, costPer1kOut: 0.0006 },
  
  // xAI
  'xai/grok-4.5': { name: 'Grok 4.5', scores: { ...S.general }, costPer1kIn: 0.002, costPer1kOut: 0.01 },
  
  // Moonshot
  'moonshot/kimi-k3': { name: 'Kimi K3', scores: { ...S.general, planning: 93 }, costPer1kIn: 0.002, costPer1kOut: 0.008 },
  
  // Groq
  'groq/llama-3.3-70b-versatile': { name: 'Llama 3.3 70B (Groq)', free: true, scores: { ...S.fast, frontend: 92 }, costPer1kIn: 0.0005, costPer1kOut: 0.001 },
  'groq/llama-3.1-8b-instant': { name: 'Llama 3.1 8B (Groq)', free: true, scores: { ...S.cheap }, costPer1kIn: 0.0001, costPer1kOut: 0.0002 }
};

const model = (id, def = {}, free = def.free) => ({
  id,
  name: def.name,
  free: Boolean(free),
  scores: def.scores,
  costPer1kIn: def.costPer1kIn,
  costPer1kOut: def.costPer1kOut
});

/** model() for MODEL_DEFS entries — key format is '<provider>/<model-id>'. */
const m = (key, free) => {
  const def = MODEL_DEFS[key];
  return model(key.slice(key.indexOf('/') + 1), def, free);
};

function modelsFor(ids, map) {
  return ids.map((id) => ({ id, ...map[id] }));
}

export function getAllAdapters(secrets = {}) {
  const providers = [];
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('npm_') && !k.startsWith('NODE_') && !k.startsWith('_') && !k.startsWith('PSModulePath')));
  const merged = { ...env, ...secrets };

  const addRemote = (def) => {
    providers.push(Object.assign(def.factory(merged[def.key] || ''), { envVar: def.key }));
  };

  addRemote({
    key: 'OPENROUTER_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'openrouter',
      displayName: 'OpenRouter',
      key,
      baseUrl: 'https://openrouter.ai/api/v1',
      models: modelsFor(Object.keys(MODEL_DEFS).filter((id) => !id.startsWith('google/')), MODEL_DEFS)
    })
  });

  addRemote({
    key: 'OPENCODE_ZEN_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'opencodezen',
      displayName: 'OpenCode Zen',
      key,
      baseUrl: 'https://opencode.ai/api/v1',
      models: [
        model('opencode-zen-7b', { name: 'OpenCode Zen 7B', free: true, scores: { ...S.cheap, planning: 60, backend: 72 } }),
        model('opencode-zen-32b', { name: 'OpenCode Zen 32B', free: true, scores: { ...S.general, planning: 80 } }),
        model('opencode-zen-120b', { name: 'OpenCode Zen 120B', free: false, scores: S.general })
      ]
    })
  });

  addRemote({
    key: 'OPENAI_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'openai',
      displayName: 'OpenAI',
      key,
      baseUrl: 'https://api.openai.com/v1',
      models: [
        m('openai/gpt-5.6-sol', false),
        m('openai/gpt-5.6-luna', true),
        m('openai/gpt-5.5', false),
        m('openai/gpt-5.3-codex', false)
      ]
    })
  });

  addRemote({
    key: 'ANTHROPIC_API_KEY',
    factory: (key) => new AnthropicProvider({
      key,
      models: [
        m('anthropic/claude-fable-5', false),
        m('anthropic/claude-opus-5', false),
        m('anthropic/claude-sonnet-5', false),
        m('anthropic/claude-haiku-4-5', true)
      ]
    })
  });

  addRemote({
    key: 'GOOGLE_API_KEY',
    factory: (key) => new GeminiProvider({
      key,
      models: [
        m('google/gemini-3.6-flash', true),
        m('google/gemini-3.1-pro', false),
        m('google/gemma-4-31b', true)
      ]
    })
  });

  addRemote({
    key: 'GROQ_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'groq',
      displayName: 'Groq',
      key,
      baseUrl: 'https://api.groq.com/openai/v1',
      models: [m('groq/llama-3.3-70b-versatile', true), m('groq/llama-3.1-8b-instant', true)]
    })
  });

  addRemote({
    key: 'TOGETHER_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'together',
      displayName: 'Together AI',
      key,
      baseUrl: 'https://api.together.xyz/v1',
      models: [
        m('qwen/qwen-3.8-max', false),
        m('qwen/qwen-3.7-flash', true)
      ]
    })
  });

  addRemote({
    key: 'MISTRAL_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'mistral',
      displayName: 'Mistral',
      key,
      baseUrl: 'https://api.mistral.ai/v1',
      models: [m('mistralai/mistral-medium-3.5', false), m('mistralai/codestral', false)]
    })
  });

  addRemote({
    key: 'DEEPSEEK_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'deepseek',
      displayName: 'DeepSeek',
      key,
      baseUrl: 'https://api.deepseek.com/v1',
      models: [m('deepseek/deepseek-v4-pro', false), m('deepseek/deepseek-v4-flash-0731', true)]
    })
  });

  addRemote({
    key: 'XAI_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'xai',
      displayName: 'xAI (Grok)',
      key,
      baseUrl: 'https://api.x.ai/v1',
      models: [m('xai/grok-4.5', false)]
    })
  });

  addRemote({
    key: 'FIREWORKS_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'fireworks',
      displayName: 'Fireworks AI',
      key,
      baseUrl: 'https://api.fireworks.ai/inference/v1',
      models: [model('llama-3.1-8b-instruct', { name: 'Llama 3.1 8B', free: true, scores: S.cheap })]
    })
  });

  addRemote({
    key: 'PERPLEXITY_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'perplexity',
      displayName: 'Perplexity',
      key,
      baseUrl: 'https://api.perplexity.ai',
      models: [model('sonar', { name: 'Sonar', scores: { ...S.general, docs: 95 } })]
    })
  });

  addRemote({
    key: 'CEREBRAS_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'cerebras',
      displayName: 'Cerebras',
      key,
      baseUrl: 'https://api.cerebras.ai/v1',
      models: [model('llama-3.3-70b', { name: 'Llama 3.3 70B', free: true, scores: S.fast })]
    })
  });

  addRemote({
    key: 'NOVITA_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'novita',
      displayName: 'Novita AI',
      key,
      baseUrl: 'https://api.novita.ai/v3/openai',
      models: [model('deepseek-v3', { name: 'DeepSeek V3', free: true, scores: S.coding })]
    })
  });

  addRemote({
    key: 'HUGGINGFACE_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'huggingface',
      displayName: 'HuggingFace',
      key,
      baseUrl: 'https://router.huggingface.co/v1',
      models: [model('qwen2.5-coder-32b', { name: 'Qwen 2.5 Coder 32B', free: true, scores: S.coding })]
    })
  });

  addRemote({ key: 'VERCEL_API_KEY', factory: (key) => new OpenAICompatible({ id: 'vercel', displayName: 'Vercel AI Gateway', key, baseUrl: 'https://gateway.vercel.ai/v1', models: [] }) });
  addRemote({ key: 'REQUESTY_API_KEY', factory: (key) => new OpenAICompatible({ id: 'requesty', displayName: 'Requesty', key, baseUrl: 'https://router.requesty.ai/v1', models: [] }) });
  addRemote({ key: 'AIHUBMIX_API_KEY', factory: (key) => new OpenAICompatible({ id: 'aihubmix', displayName: 'AIHubMix', key, baseUrl: 'https://aihubmix.com/v1', models: [] }) });
  addRemote({ key: 'DIGITALOCEAN_API_KEY', factory: (key) => new OpenAICompatible({ id: 'digitalocean', displayName: 'DigitalOcean Inference', key, baseUrl: 'https://inference.digitalocean.com/v1', models: [] }) });
  addRemote({ key: 'AZURE_OPENAI_API_KEY', factory: (key) => new OpenAICompatible({ id: 'azure', displayName: 'Azure OpenAI', key, baseUrl: 'https://api.cognitive.microsoft.com/v1', models: [] }) });
  addRemote({ key: 'AWS_BEDROCK_API_KEY', factory: (key) => new OpenAICompatible({ id: 'bedrock', displayName: 'AWS Bedrock', key, baseUrl: 'https://bedrock.us-east-1.amazonaws.com/v1', models: [] }) });
  addRemote({ key: 'VERTEX_API_KEY', factory: (key) => new OpenAICompatible({ id: 'vertex', displayName: 'GCP Vertex AI', key, baseUrl: 'https://us-central1-aiplatform.googleapis.com/v1', models: [] }) });
  addRemote({ key: 'ORACLE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'oracle', displayName: 'Oracle Code Assist', key, baseUrl: 'https://inference.generativeai.us-chicago-1.oci.oraclecloud.com/v1', models: [] }) });
  addRemote({ key: 'HUAWEI_API_KEY', factory: (key) => new OpenAICompatible({ id: 'huawei', displayName: 'Huawei Cloud MaaS', key, baseUrl: 'https://api.huaweicloud.com/v1', models: [] }) });
  addRemote({ key: 'SAP_API_KEY', factory: (key) => new OpenAICompatible({ id: 'sap', displayName: 'SAP AI Core', key, baseUrl: 'https://api.ai.sap.com/v1', models: [] }) });
  addRemote({ key: 'SAMBANOVA_API_KEY', factory: (key) => new OpenAICompatible({ id: 'sambanova', displayName: 'SambaNova', key, baseUrl: 'https://api.sambanova.ai/v1', models: [] }) });
  addRemote({ key: 'NEBIUS_API_KEY', factory: (key) => new OpenAICompatible({ id: 'nebius', displayName: 'Nebius AI Studio', key, baseUrl: 'https://api.studio.nebius.ai/v1', models: [] }) });
  addRemote({ key: 'BASETEN_API_KEY', factory: (key) => new OpenAICompatible({ id: 'baseten', displayName: 'Baseten', key, baseUrl: 'https://bridge.baseten.co/v1', models: [] }) });
  addRemote({ key: 'COHERE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'cohere', displayName: 'Cohere', key, baseUrl: 'https://api.cohere.com/v1', models: [] }) });
  addRemote({ key: 'QWEN_API_KEY', factory: (key) => new OpenAICompatible({ id: 'qwen', displayName: 'Alibaba Cloud (Qwen)', key, baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', models: [m('qwen/qwen-3.8-max', false), m('qwen/qwen-3.7-flash', true)] }) });
  addRemote({ key: 'MOONSHOT_API_KEY', factory: (key) => new OpenAICompatible({ id: 'moonshot', displayName: 'Moonshot AI', key, baseUrl: 'https://api.moonshot.cn/v1', models: [m('moonshot/kimi-k3', false)] }) });
  addRemote({ key: 'MINIMAX_API_KEY', factory: (key) => new OpenAICompatible({ id: 'minimax', displayName: 'MiniMax', key, baseUrl: 'https://api.minimax.chat/v1', models: [] }) });
  addRemote({ key: 'ZHIPU_API_KEY', factory: (key) => new OpenAICompatible({ id: 'zhipu', displayName: 'Zhipu AI', key, baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: [] }) });
  addRemote({ key: 'TENCENT_API_KEY', factory: (key) => new OpenAICompatible({ id: 'tencent', displayName: 'Tencent Hunyuan', key, baseUrl: 'https://hunyuan.tencentcloudapi.com/v1', models: [] }) });
  addRemote({ key: 'VOLCENGINE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'volcengine', displayName: 'Volcengine (Doubao)', key, baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', models: [] }) });
  addRemote({ key: 'ASKSAGE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'asksage', displayName: 'AskSage', key, baseUrl: 'https://api.asksage.ai/v1', models: [] }) });
  addRemote({ key: 'DIFY_API_KEY', factory: (key) => new OpenAICompatible({ id: 'dify', displayName: 'Dify.ai', key, baseUrl: 'https://api.dify.ai/v1', models: [] }) });
  addRemote({ key: 'HICAP_API_KEY', factory: (key) => new OpenAICompatible({ id: 'hicap', displayName: 'Hicap', key, baseUrl: 'https://api.hicap.ai/v1', models: [] }) });
  addRemote({ key: 'GITLAB_API_KEY', factory: (key) => new OpenAICompatible({ id: 'gitlab', displayName: 'GitLab Duo', key, baseUrl: 'https://gitlab.com/api/v4/ai', models: [] }) });
  addRemote({ key: 'FROGBOT_API_KEY', factory: (key) => new OpenAICompatible({ id: 'frogbot', displayName: 'FrogBot', key, baseUrl: 'https://api.frogbot.ai/v1', models: [] }) });
  addRemote({ key: 'OLLAMA_CLOUD_API_KEY', factory: (key) => new OpenAICompatible({ id: 'ollamacloud', displayName: 'Ollama Cloud', key, baseUrl: 'https://api.ollama.cloud/v1', models: [] }) });

  // Doc 17 - Extended Hosted Inference
  addRemote({ key: 'REPLICATE_API_TOKEN', factory: (key) => new OpenAICompatible({ id: 'replicate', displayName: 'Replicate', key, baseUrl: 'https://api.replicate.com/v1', models: [] }) });
  addRemote({ key: 'ANYSCALE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'anyscale', displayName: 'Anyscale Endpoints', key, baseUrl: 'https://api.endpoints.anyscale.com/v1', models: [] }) });
  addRemote({ key: 'DEEPINFRA_API_KEY', factory: (key) => new OpenAICompatible({ id: 'deepinfra', displayName: 'DeepInfra', key, baseUrl: 'https://api.deepinfra.com/v1/openai', models: [] }) });
  addRemote({ key: 'NVIDIA_NIM_API_KEY', factory: (key) => new OpenAICompatible({ id: 'nvidia', displayName: 'NVIDIA NIM', key, baseUrl: 'https://integrate.api.nvidia.com/v1', models: [] }) });
  addRemote({ key: 'FRIENDLI_TOKEN', factory: (key) => new OpenAICompatible({ id: 'friendli', displayName: 'FriendliAI', key, baseUrl: 'https://inference.friendli.ai/v1', models: [] }) });
  addRemote({ key: 'GALADRIEL_API_KEY', factory: (key) => new OpenAICompatible({ id: 'galadriel', displayName: 'Galadriel', key, baseUrl: 'https://api.galadriel.com/v1', models: [] }) });
  addRemote({ key: 'LAMBDA_API_KEY', factory: (key) => new OpenAICompatible({ id: 'lambda', displayName: 'Lambda Labs', key, baseUrl: 'https://api.lambdalabs.com/v1', models: [] }) });
  addRemote({ key: 'MODAL_API_KEY', factory: (key) => new OpenAICompatible({ id: 'modal', displayName: 'Modal', key, baseUrl: 'https://api.modal.com/v1', models: [] }) });
  addRemote({ key: 'RUNPOD_API_KEY', factory: (key) => new OpenAICompatible({ id: 'runpod', displayName: 'RunPod', key, baseUrl: 'https://api.runpod.ai/v2', models: [] }) });
  addRemote({ key: 'SCALEWAY_API_KEY', factory: (key) => new OpenAICompatible({ id: 'scaleway', displayName: 'Scaleway', key, baseUrl: 'https://api.scaleway.ai/v1', models: [] }) });
  addRemote({ key: 'NLP_CLOUD_API_KEY', factory: (key) => new OpenAICompatible({ id: 'nlpcloud', displayName: 'NLP Cloud', key, baseUrl: 'https://api.nlpcloud.io/v1', models: [] }) });
  addRemote({ key: 'PREDIBASE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'predibase', displayName: 'Predibase', key, baseUrl: 'https://api.predibase.com/v1', models: [] }) });

  // Doc 17 - Extended Enterprise / Cloud
  addRemote({ key: 'OCI_GENAI_CONFIG_PATH', factory: (key) => new OpenAICompatible({ id: 'oci', displayName: 'OCI Generative AI', key, baseUrl: 'https://inference.generativeai.us-chicago-1.oci.oraclecloud.com/v1', models: [] }) });
  addRemote({ key: 'DATAROBOT_API_KEY', factory: (key) => new OpenAICompatible({ id: 'datarobot', displayName: 'DataRobot', key, baseUrl: 'https://api.datarobot.com/v1', models: [] }) });
  addRemote({ key: 'SAP_AI_CORE_CLIENT_ID', factory: (key) => new OpenAICompatible({ id: 'saphub', displayName: 'SAP Generative AI Hub', key, baseUrl: 'https://api.ai.sap.com/v1', models: [] }) });
  addRemote({ key: 'WATSONX_API_KEY', factory: (key) => new OpenAICompatible({ id: 'watsonx', displayName: 'watsonx (IBM)', key, baseUrl: 'https://us-south.ml.cloud.ibm.com/v1', models: [] }) });
  addRemote({ key: 'SNOWFLAKE_CORTEX_TOKEN', factory: (key) => new OpenAICompatible({ id: 'snowflake', displayName: 'Snowflake Cortex', key, baseUrl: 'https://api.snowflake.com/v1', models: [] }) });
  addRemote({ key: 'DATABRICKS_TOKEN', factory: (key) => new OpenAICompatible({ id: 'databricks', displayName: 'Databricks', key, baseUrl: 'https://adb-123.azuredatabricks.net/serving-endpoints/v1', models: [] }) });
  addRemote({ key: 'MANUS_API_KEY', factory: (key) => new OpenAICompatible({ id: 'manus', displayName: 'Manus AI', key, baseUrl: 'https://api.manus.ai/v1', models: [] }) });
  addRemote({ key: 'CHATGPT_PRO_TOKEN', factory: (key) => new OpenAICompatible({ id: 'chatgptpro', displayName: 'ChatGPT Pro', key, baseUrl: 'https://api.openai.com/v1', models: [] }) });
  // Doc 20 - New Providers from Merged CLI Lists
  addRemote({ key: '302_API_KEY', factory: (key) => new OpenAICompatible({ id: '302ai', displayName: '302.AI', key, baseUrl: 'https://api.302.ai/v1', models: [] }) });
  addRemote({ key: 'AZURE_COGNITIVE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'azure_cognitive', displayName: 'Azure Cognitive Services', key, baseUrl: 'https://api.cognitive.microsoft.com/v1', models: [] }) });
  addRemote({ key: 'CLOUDFLARE_GATEWAY_API_KEY', factory: (key) => new OpenAICompatible({ id: 'cloudflare_gateway', displayName: 'Cloudflare AI Gateway', key, baseUrl: 'https://gateway.ai.cloudflare.com/v1', models: [] }) });
  addRemote({ key: 'CLOUDFLARE_WORKERS_API_KEY', factory: (key) => new OpenAICompatible({ id: 'cloudflare_workers', displayName: 'Cloudflare Workers AI', key, baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1', models: [] }) });
  addRemote({ key: 'CORTECS_API_KEY', factory: (key) => new OpenAICompatible({ id: 'cortecs', displayName: 'Cortecs', key, baseUrl: 'https://api.cortecs.ai/v1', models: [] }) });
  addRemote({ key: 'GITHUB_MODELS_API_KEY', factory: (key) => new OpenAICompatible({
    id: 'github',
    displayName: 'GitHub Models',
    key,
    baseUrl: 'https://models.github.ai/inference/v1',
    models: [
      model('gpt-5.3', { name: 'GPT-5.3', scores: S.general, costPer1kIn: 0, costPer1kOut: 0 }),
      model('gpt-4.1', { name: 'GPT-4.1', scores: S.general, costPer1kIn: 0, costPer1kOut: 0 }),
      model('claude-sonnet-4.6', { name: 'Claude Sonnet 4.6', scores: S.general, costPer1kIn: 0, costPer1kOut: 0 }),
      model('gemini-3-flash', { name: 'Gemini 3 Flash', free: true, scores: S.fast, costPer1kIn: 0, costPer1kOut: 0 }),
      model('deepseek-v4-flash', { name: 'DeepSeek V4 Flash', free: true, scores: { ...S.coding, bugfix: 96 }, costPer1kIn: 0, costPer1kOut: 0 }),
      model('qwen3.8-max', { name: 'Qwen 3.8 Max', scores: S.general, costPer1kIn: 0, costPer1kOut: 0 })
    ]
  }) });
  addRemote({ key: 'GITHUB_COPILOT_API_KEY', factory: (key) => new OpenAICompatible({ id: 'github_copilot', displayName: 'GitHub Copilot', key, baseUrl: 'https://api.githubcopilot.com/v1', models: [] }) });
  addRemote({ key: 'GMI_CLOUD_API_KEY', factory: (key) => new OpenAICompatible({ id: 'gmicloud', displayName: 'GMI Cloud', key, baseUrl: 'https://api.gmicloud.ai/v1', models: [] }) });
  addRemote({ key: 'HELICONE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'helicone', displayName: 'Helicone', key, baseUrl: 'https://oai.hconeai.com/v1', models: [] }) });
  addRemote({ key: 'IONET_API_KEY', factory: (key) => new OpenAICompatible({ id: 'ionet', displayName: 'IO.NET', key, baseUrl: 'https://api.io.net/v1', models: [] }) });
  addRemote({ key: 'NEBIUS_TOKEN_FACTORY_API_KEY', factory: (key) => new OpenAICompatible({ id: 'nebius_tf', displayName: 'Nebius Token Factory', key, baseUrl: 'https://api.tokenfactory.nebius.ai/v1', models: [] }) });
  addRemote({ key: 'POOLSIDE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'poolside', displayName: 'Poolside', key, baseUrl: 'https://inference.poolside.ai/v1', models: [] }) });
  addRemote({ key: 'STACKIT_API_KEY', factory: (key) => new OpenAICompatible({ id: 'stackit', displayName: 'STACKIT', key, baseUrl: 'https://api.stackit.cloud/v1', models: [] }) });
  addRemote({ key: 'OVHCLOUD_API_KEY', factory: (key) => new OpenAICompatible({ id: 'ovhcloud', displayName: 'OVHcloud AI Endpoints', key, baseUrl: 'https://api.ovhcloud.com/v1', models: [] }) });
  addRemote({ key: 'VENICE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'venice', displayName: 'Venice AI', key, baseUrl: 'https://api.venice.ai/v1', models: [] }) });
  addRemote({ key: 'ZAI_API_KEY', factory: (key) => new OpenAICompatible({ id: 'zai', displayName: 'Z.AI', key, baseUrl: 'https://api.z.ai/v1', models: [] }) });
  addRemote({ key: 'ZENMUX_API_KEY', factory: (key) => new OpenAICompatible({ id: 'zenmux', displayName: 'ZenMux', key, baseUrl: 'https://api.zenmux.ai/v1', models: [] }) });
  addRemote({ key: 'LLM_GATEWAY_API_KEY', factory: (key) => new OpenAICompatible({ id: 'llm_gateway', displayName: 'LLM Gateway', key, baseUrl: 'http://localhost:4000/v1', models: [] }) });
  addRemote({ key: 'DAOXE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'daoxe', displayName: 'DaoXE', key, baseUrl: 'https://api.daoxe.ai/v1', models: [] }) });
  addRemote({ key: 'UNBOUND_API_KEY', factory: (key) => new OpenAICompatible({ id: 'unbound', displayName: 'Unbound', key, baseUrl: 'https://api.unbound.ai/v1', models: [] }) });
  addRemote({ key: 'MIXLAYER_API_KEY', factory: (key) => new OpenAICompatible({ id: 'mixlayer', displayName: 'Mixlayer', key, baseUrl: 'https://api.mixlayer.com/v1', models: [] }) });
  addRemote({ key: 'CHUTES_API_KEY', factory: (key) => new OpenAICompatible({ id: 'chutes', displayName: 'Chutes AI', key, baseUrl: 'https://api.chutes.ai/v1', models: [] }) });
  addRemote({ key: 'INCEPTION_API_KEY', factory: (key) => new OpenAICompatible({ id: 'inception', displayName: 'Inception', key, baseUrl: 'https://api.inception.ai/v1', models: [] }) });
  addRemote({ key: 'V0_API_KEY', factory: (key) => new OpenAICompatible({ id: 'v0', displayName: 'v0 (Vercel)', key, baseUrl: 'https://api.v0.dev/v1', models: [] }) });
  addRemote({ key: 'SYNTHETIC_API_KEY', factory: (key) => new OpenAICompatible({ id: 'synthetic', displayName: 'Synthetic Provider', key, baseUrl: 'https://api.synthetic.ai/v1', models: [] }) });
  addRemote({ key: 'ALIBABA_CLOUD_API_KEY', factory: (key) => new OpenAICompatible({ id: 'alibaba', displayName: 'Alibaba Cloud', key, baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', models: [] }) });
  addRemote({ key: 'KILO_GATEWAY_API_KEY', factory: (key) => new OpenAICompatible({ id: 'kilogateway', displayName: 'Kilo Gateway', key, baseUrl: 'https://gateway.kilo.ai/v1', models: [] }) });
  addRemote({ key: 'OPENCODE_GO_API_KEY', factory: (key) => new OpenAICompatible({ id: 'opencode_go', displayName: 'OpenCode Go', key, baseUrl: 'https://go.opencode.ai/v1', models: [] }) });
  addRemote({ key: 'LITELLM_API_KEY', factory: (key) => new OpenAICompatible({ id: 'litellm', displayName: 'LiteLLM (self-hosted gateway)', key, baseUrl: 'http://localhost:4000/v1', models: [] }) });
  addRemote({ key: 'KILO_API_KEY', factory: (key) => new OpenAICompatible({ id: 'kilo', displayName: 'Kilo Code', key, baseUrl: 'https://api.kilo.ai/v1', models: [] }) });
  addRemote({ key: 'NOUS_RESEARCH_API_KEY', factory: (key) => new OpenAICompatible({ id: 'nous', displayName: 'Nous Research', key, baseUrl: 'https://api.nousresearch.ai/v1', models: [] }) });
  addRemote({ key: 'OCTOAI_API_KEY', factory: (key) => new OpenAICompatible({ id: 'octoai', displayName: 'OctoAI', key, baseUrl: 'https://text.octoai.run/v1', models: [] }) });
  addRemote({ key: 'AI21_API_KEY', factory: (key) => new OpenAICompatible({ id: 'ai21', displayName: 'AI21 Labs', key, baseUrl: 'https://api.ai21.com/studio/v1', models: [] }) });
  addRemote({ key: 'ZEROONE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'zerooneai', displayName: '01.AI', key, baseUrl: 'https://api.01.ai/v1', models: [] }) });
  addRemote({ key: 'UPSTAGE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'upstage', displayName: 'Upstage', key, baseUrl: 'https://api.upstage.ai/v1/solar', models: [] }) });
  addRemote({ key: 'JINA_API_KEY', factory: (key) => new OpenAICompatible({ id: 'jina', displayName: 'Jina AI', key, baseUrl: 'https://api.jina.ai/v1', models: [] }) });
  addRemote({ key: 'NOMIC_API_KEY', factory: (key) => new OpenAICompatible({ id: 'nomic', displayName: 'Nomic AI', key, baseUrl: 'https://api.nomic.ai/v1', models: [] }) });
  addRemote({ key: 'ALEPH_ALPHA_API_KEY', factory: (key) => new OpenAICompatible({ id: 'aleph_alpha', displayName: 'Aleph Alpha', key, baseUrl: 'https://api.aleph-alpha.com/v1', models: [] }) });
  addRemote({ key: 'FOREFRONT_API_KEY', factory: (key) => new OpenAICompatible({ id: 'forefront', displayName: 'Forefront AI', key, baseUrl: 'https://api.forefront.ai/v1', models: [] }) });
  addRemote({ key: 'GRADIENT_API_KEY', factory: (key) => new OpenAICompatible({ id: 'gradient', displayName: 'Gradient', key, baseUrl: 'https://api.gradient.ai/v1', models: [] }) });
  addRemote({ key: 'BANANA_API_KEY', factory: (key) => new OpenAICompatible({ id: 'banana', displayName: 'Banana.dev', key, baseUrl: 'https://api.banana.dev/v1', models: [] }) });
  addRemote({ key: 'INFLECTION_API_KEY', factory: (key) => new OpenAICompatible({ id: 'inflection', displayName: 'Inflection AI', key, baseUrl: 'https://api.inflection.ai/v1', models: [] }) });
  addRemote({ key: 'WRITER_API_KEY', factory: (key) => new OpenAICompatible({ id: 'writer', displayName: 'Writer', key, baseUrl: 'https://api.writer.com/v1', models: [] }) });
  addRemote({ key: 'MONSTER_API_KEY', factory: (key) => new OpenAICompatible({ id: 'monsterapi', displayName: 'MonsterAPI', key, baseUrl: 'https://api.monsterapi.ai/v1', models: [] }) });
  addRemote({ key: 'SHUTTLE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'shuttleai', displayName: 'ShuttleAI', key, baseUrl: 'https://api.shuttleai.app/v1', models: [] }) });
  addRemote({ key: 'NEXUS_RAVEN_API_KEY', factory: (key) => new OpenAICompatible({ id: 'nexusraven', displayName: 'NexusRaven', key, baseUrl: 'https://api.nexusraven.ai/v1', models: [] }) });
  addRemote({ key: 'REKA_API_KEY', factory: (key) => new OpenAICompatible({ id: 'reka', displayName: 'Reka AI', key, baseUrl: 'https://api.reka.ai/v1', models: [] }) });
  addRemote({ key: 'BAICHUAN_API_KEY', factory: (key) => new OpenAICompatible({ id: 'baichuan', displayName: 'Baichuan', key, baseUrl: 'https://api.baichuan-ai.com/v1', models: [] }) });
  addRemote({ key: 'SENSETIME_API_KEY', factory: (key) => new OpenAICompatible({ id: 'sensetime', displayName: 'SenseTime', key, baseUrl: 'https://api.sensetime.com/v1', models: [] }) });
  addRemote({ key: 'ERNIE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'ernie', displayName: 'Ernie (Baidu)', key, baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1', models: [] }) });
  addRemote({ key: 'STEPFUN_API_KEY', factory: (key) => new OpenAICompatible({ id: 'stepfun', displayName: 'StepFun', key, baseUrl: 'https://api.stepfun.com/v1', models: [] }) });
  addRemote({ key: 'SILICONFLOW_API_KEY', factory: (key) => new OpenAICompatible({ id: 'siliconflow', displayName: 'SiliconFlow', key, baseUrl: 'https://api.siliconflow.cn/v1', models: [] }) });
  addRemote({ key: 'LEPTON_API_KEY', factory: (key) => new OpenAICompatible({ id: 'lepton', displayName: 'Lepton AI', key, baseUrl: 'https://api.lepton.ai/v1', models: [] }) });
  addRemote({ key: 'PHIND_API_KEY', factory: (key) => new OpenAICompatible({ id: 'phind', displayName: 'Phind', key, baseUrl: 'https://api.phind.com/v1', models: [] }) });
  addRemote({ key: 'YOU_API_KEY', factory: (key) => new OpenAICompatible({ id: 'you', displayName: 'You.com', key, baseUrl: 'https://api.you.com/v1', models: [] }) });
  addRemote({ key: 'MINDSDB_API_KEY', factory: (key) => new OpenAICompatible({ id: 'mindsdb', displayName: 'MindsDB', key, baseUrl: 'https://api.mindsdb.com/v1', models: [] }) });
  addRemote({ key: 'VOYAGE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'voyage', displayName: 'Voyage AI', key, baseUrl: 'https://api.voyageai.com/v1', models: [] }) });
  addRemote({ key: 'KYUTAI_API_KEY', factory: (key) => new OpenAICompatible({ id: 'kyutai', displayName: 'Kyutai', key, baseUrl: 'https://api.kyutai.ai/v1', models: [] }) });
  addRemote({ key: 'POE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'poe', displayName: 'Poe API', key, baseUrl: 'https://api.poe.com/v1', models: [] }) });
  addRemote({ key: 'ABACUS_API_KEY', factory: (key) => new OpenAICompatible({ id: 'abacus', displayName: 'Abacus AI', key, baseUrl: 'https://api.abacus.ai/v1', models: [] }) });
  addRemote({ key: 'COREWEAVE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'coreweave', displayName: 'CoreWeave AI', key, baseUrl: 'https://api.coreweave.com/v1', models: [] }) });
  addRemote({ key: 'BRAINTRUST_API_KEY', factory: (key) => new OpenAICompatible({ id: 'braintrust', displayName: 'Braintrust Gateway', key, baseUrl: 'https://api.braintrust.dev/v1', models: [] }) });
  addRemote({ key: 'PORTKEY_API_KEY', factory: (key) => new OpenAICompatible({ id: 'portkey', displayName: 'Portkey Gateway', key, baseUrl: 'https://api.portkey.ai/v1', models: [] }) });
  addRemote({ key: 'PEZZO_API_KEY', factory: (key) => new OpenAICompatible({ id: 'pezzo', displayName: 'Pezzo', key, baseUrl: 'https://api.pezzo.ai/v1', models: [] }) });
  addRemote({ key: 'PROMPTLAYER_API_KEY', factory: (key) => new OpenAICompatible({ id: 'promptlayer', displayName: 'PromptLayer', key, baseUrl: 'https://api.promptlayer.com/v1', models: [] }) });
  addRemote({ key: 'VELLUM_API_KEY', factory: (key) => new OpenAICompatible({ id: 'vellum', displayName: 'Vellum', key, baseUrl: 'https://api.vellum.ai/v1', models: [] }) });
  addRemote({ key: 'H2O_API_KEY', factory: (key) => new OpenAICompatible({ id: 'h2o', displayName: 'H2O.ai', key, baseUrl: 'https://api.h2o.ai/v1', models: [] }) });
  addRemote({ key: 'LLAMACLOUD_API_KEY', factory: (key) => new OpenAICompatible({ id: 'llamacloud', displayName: 'LlamaCloud', key, baseUrl: 'https://api.llamacloud.com/v1', models: [] }) });
  addRemote({ key: 'LANGSMITH_API_KEY', factory: (key) => new OpenAICompatible({ id: 'langsmith', displayName: 'LangSmith', key, baseUrl: 'https://api.smith.langchain.com/v1', models: [] }) });
  addRemote({ key: 'RUNHOUSE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'runhouse', displayName: 'RunHouse', key, baseUrl: 'https://api.run.house/v1', models: [] }) });
  addRemote({ key: 'REPLIT_API_KEY', factory: (key) => new OpenAICompatible({ id: 'replit', displayName: 'Replit ModelFarm', key, baseUrl: 'https://modelfarm.replit.com/v1', models: [] }) });
  addRemote({ key: 'AKASH_API_KEY', factory: (key) => new OpenAICompatible({ id: 'akash', displayName: 'Akash Inference', key, baseUrl: 'https://api.akash.network/v1', models: [] }) });
  addRemote({ key: 'DEEPGRAM_API_KEY', factory: (key) => new OpenAICompatible({ id: 'deepgram', displayName: 'Deepgram', key, baseUrl: 'https://api.deepgram.com/v1', models: [] }) });
  addRemote({ key: 'BRAVE_API_KEY', factory: (key) => new OpenAICompatible({ id: 'brave', displayName: 'Brave Search/LLM', key, baseUrl: 'https://api.brave.com/v1', models: [] }) });
  addRemote({ key: 'KAGI_API_KEY', factory: (key) => new OpenAICompatible({ id: 'kagi', displayName: 'Kagi API', key, baseUrl: 'https://kagi.com/api/v1', models: [] }) });
  addRemote({ key: 'CLARIFAI_API_KEY', factory: (key) => new OpenAICompatible({ id: 'clarifai', displayName: 'Clarifai', key, baseUrl: 'https://api.clarifai.com/v1', models: [] }) });

  // Local / free providers — probed for liveness, no key needed.
  providers.push(new OpenAICompatible({
    id: 'ollama',
    displayName: 'Ollama (local)',
    key: '',
    baseUrl: merged.OLLAMA_HOST || 'http://localhost:11434/v1',
    kind: 'local',
    models: [model('local-model', { name: 'Ollama', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'lmstudio',
    displayName: 'LM Studio (local)',
    key: '',
    baseUrl: merged.LMSTUDIO_HOST || 'http://localhost:1234/v1',
    kind: 'local',
    models: [model('local-model', { name: 'LM Studio', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'lemonade',
    displayName: 'Lemonade Server (local)',
    key: '',
    baseUrl: merged.LEMONADE_HOST || 'http://localhost:8000/v1',
    kind: 'local',
    models: [model('local-model', { name: 'Lemonade Server', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'llamafile',
    displayName: 'Llamafile (local)',
    key: '',
    baseUrl: merged.LLAMAFILE_HOST || 'http://localhost:8080/v1',
    kind: 'local',
    models: [model('local-model', { name: 'Llamafile', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'vllm',
    displayName: 'vLLM (local/self-hosted)',
    key: '',
    baseUrl: merged.VLLM_HOST || 'http://localhost:8000/v1',
    kind: 'local',
    models: [model('local-model', { name: 'vLLM', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'atomic_chat',
    displayName: 'Atomic Chat (local)',
    key: '',
    baseUrl: merged.ATOMIC_CHAT_HOST || 'http://localhost:8080/v1',
    kind: 'local',
    models: [model('local-model', { name: 'Atomic Chat', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'anaconda',
    displayName: 'Anaconda Desktop (local)',
    key: '',
    baseUrl: merged.ANACONDA_HOST || 'http://localhost:8080/v1',
    kind: 'local',
    models: [model('local-model', { name: 'Anaconda Desktop', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'llamacpp',
    displayName: 'llama.cpp (local)',
    key: '',
    baseUrl: merged.LLAMACPP_HOST || 'http://localhost:8080/v1',
    kind: 'local',
    models: [model('local-model', { name: 'llama.cpp', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'localai',
    displayName: 'LocalAI (local)',
    key: '',
    baseUrl: merged.LOCALAI_HOST || 'http://localhost:8080/v1',
    kind: 'local',
    models: [model('local-model', { name: 'LocalAI', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'xinference',
    displayName: 'Xinference (local)',
    key: '',
    baseUrl: merged.XINFERENCE_HOST || 'http://localhost:9997/v1',
    kind: 'local',
    models: [model('local-model', { name: 'Xinference', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'jan',
    displayName: 'Jan (local)',
    key: '',
    baseUrl: merged.JAN_HOST || 'http://localhost:1337/v1',
    kind: 'local',
    models: [model('local-model', { name: 'Jan', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'gpt4all',
    displayName: 'GPT4All (local)',
    key: '',
    baseUrl: merged.GPT4ALL_HOST || 'http://localhost:4891/v1',
    kind: 'local',
    models: [model('local-model', { name: 'GPT4All', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'koboldcpp',
    displayName: 'KoboldCPP (local)',
    key: '',
    baseUrl: merged.KOBOLDCPP_HOST || 'http://localhost:5001/v1',
    kind: 'local',
    models: [model('local-model', { name: 'KoboldCPP', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'oobabooga',
    displayName: 'Oobabooga (local)',
    key: '',
    baseUrl: merged.OOBABOOGA_HOST || 'http://localhost:5000/v1',
    kind: 'local',
    models: [model('local-model', { name: 'Oobabooga', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'tgi',
    displayName: 'TGI (local)',
    key: '',
    baseUrl: merged.TGI_HOST || 'http://localhost:8080/v1',
    kind: 'local',
    models: [model('local-model', { name: 'TGI', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'aphrodite',
    displayName: 'Aphrodite Engine (local)',
    key: '',
    baseUrl: merged.APHRODITE_HOST || 'http://localhost:2242/v1',
    kind: 'local',
    models: [model('local-model', { name: 'Aphrodite Engine', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'tensorrt',
    displayName: 'TensorRT-LLM (local)',
    key: '',
    baseUrl: merged.TENSORRT_HOST || 'http://localhost:8000/v1',
    kind: 'local',
    models: [model('local-model', { name: 'TensorRT-LLM', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'sglang',
    displayName: 'SGLang (local)',
    key: '',
    baseUrl: merged.SGLANG_HOST || 'http://localhost:30000/v1',
    kind: 'local',
    models: [model('local-model', { name: 'SGLang', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'lmdeploy',
    displayName: 'LMDeploy (local)',
    key: '',
    baseUrl: merged.LMDEPLOY_HOST || 'http://localhost:23333/v1',
    kind: 'local',
    models: [model('local-model', { name: 'LMDeploy', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'mlx',
    displayName: 'MLX Server (local)',
    key: '',
    baseUrl: merged.MLX_HOST || 'http://localhost:8080/v1',
    kind: 'local',
    models: [model('local-model', { name: 'MLX Server', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'llamaedge',
    displayName: 'LlamaEdge (local)',
    key: '',
    baseUrl: merged.LLAMAEDGE_HOST || 'http://localhost:8080/v1',
    kind: 'local',
    models: [model('local-model', { name: 'LlamaEdge', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));

  // Mock is always available so the pipeline works without any keys.
  providers.push(new MockProvider());

  return providers;
}

export async function getProviders({ secrets = {}, config = {} } = {}) {
  const all = getAllAdapters(secrets);
  let candidates = all.filter((p) => p.kind === 'local' || (p.apiKey && p.apiKey !== '') || p.id === 'mock');

  if (config.enabledProviders?.length) {
    candidates = candidates.filter((p) => config.enabledProviders.includes(p.id) || p.id === 'mock');
  } else if (config.disabledProviders?.length) {
    candidates = candidates.filter((p) => !config.disabledProviders.includes(p.id) || p.id === 'mock');
  }

  return candidates;
}

export async function getProviderById(providers, id) {
  return providers.find((p) => p.id === id) || null;
}
