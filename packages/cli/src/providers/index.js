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
  'anthropic/claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', scores: { ...S.general, planning: 95, backend: 95, db: 92, bugfix: 94 }, costPer1kIn: 0.003, costPer1kOut: 0.015 },
  'anthropic/claude-3.5-haiku': { name: 'Claude 3.5 Haiku', free: true, scores: { ...S.fast, planning: 65 }, costPer1kIn: 0.0008, costPer1kOut: 0.004 },
  'openai/gpt-4o': { name: 'GPT-4o', scores: { ...S.general, frontend: 92, planning: 90 }, costPer1kIn: 0.0025, costPer1kOut: 0.01 },
  'openai/gpt-4o-mini': { name: 'GPT-4o mini', free: true, scores: { ...S.cheap, docs: 80 }, costPer1kIn: 0.00015, costPer1kOut: 0.0006 },
  'openai/gpt-4.1': { name: 'GPT-4.1', scores: { ...S.general, planning: 92 }, costPer1kIn: 0.002, costPer1kOut: 0.008 },
  'qwen/qwen-2.5-coder-32b-instruct': { name: 'Qwen 2.5 Coder 32B', scores: { ...S.coding, frontend: 93 }, costPer1kIn: 0.00015, costPer1kOut: 0.0006 },
  'qwen/qwen-2.5-coder-7b-instruct': { name: 'Qwen 2.5 Coder 7B', free: true, scores: { ...S.cheap, frontend: 80 }, costPer1kIn: 0, costPer1kOut: 0 },
  'deepseek/deepseek-chat': { name: 'DeepSeek V3', scores: { ...S.coding, backend: 93 }, costPer1kIn: 0.00027, costPer1kOut: 0.0011 },
  'deepseek/deepseek-coder': { name: 'DeepSeek Coder', scores: { ...S.coding, bugfix: 90 }, costPer1kIn: 0.00014, costPer1kOut: 0.00028 },
  'mistralai/codestral-2501': { name: 'Codestral', scores: { ...S.coding, backend: 90 }, costPer1kIn: 0.0003, costPer1kOut: 0.0009 },
  'mistralai/mistral-small': { name: 'Mistral Small', scores: { ...S.fast, docs: 75 }, costPer1kIn: 0.0002, costPer1kOut: 0.0006 },
  'groq/llama-3.3-70b-versatile': { name: 'Llama 3.3 70B', free: true, scores: { ...S.fast, bugfix: 80 }, costPer1kIn: 0.00059, costPer1kOut: 0.00079 },
  'groq/llama-3.1-8b-instant': { name: 'Llama 3.1 8B', free: true, scores: { ...S.cheap, test: 90 }, costPer1kIn: 0.00005, costPer1kOut: 0.00008 },
  'google/gemini-2.0-flash-001': { name: 'Gemini 2.0 Flash', free: true, scores: { ...S.fast, docs: 82 }, costPer1kIn: 0.0001, costPer1kOut: 0.0004 },
  'google/gemini-1.5-pro': { name: 'Gemini 1.5 Pro', scores: { ...S.general }, costPer1kIn: 0.00125, costPer1kOut: 0.005 },
  'meta-llama/llama-3.1-70b-instruct': { name: 'Llama 3.1 70B', free: true, scores: { ...S.general }, costPer1kIn: 0, costPer1kOut: 0 },
  'meta-llama/llama-3.3-70b-instruct': { name: 'Llama 3.3 70B', free: true, scores: { ...S.general }, costPer1kIn: 0, costPer1kOut: 0 }
};

const model = (def, free = def.free) => ({
  id: def.id || null,
  name: def.name,
  free: Boolean(free),
  scores: def.scores,
  costPer1kIn: def.costPer1kIn,
  costPer1kOut: def.costPer1kOut
});

function modelsFor(ids, map) {
  return ids.map((id) => ({ id, ...map[id] }));
}

export async function getProviders({ secrets = {} } = {}) {
  const providers = [];

  const addRemote = (def) => {
    if (secrets[def.key] && secrets[def.key] !== '') providers.push(def.factory(secrets[def.key]));
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
        model({ name: 'OpenCode Zen 7B', free: true, scores: { ...S.cheap, planning: 60, backend: 72 } }),
        model({ name: 'OpenCode Zen 32B', free: true, scores: { ...S.general, planning: 80 } }),
        model({ name: 'OpenCode Zen 120B', free: false, scores: S.general })
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
        model(MODEL_DEFS['openai/gpt-4o'], false),
        model(MODEL_DEFS['openai/gpt-4o-mini'], true),
        model(MODEL_DEFS['openai/gpt-4.1'], false)
      ]
    })
  });

  addRemote({
    key: 'ANTHROPIC_API_KEY',
    factory: (key) => new AnthropicProvider({
      key,
      models: [model(MODEL_DEFS['anthropic/claude-3.5-sonnet'], false), model(MODEL_DEFS['anthropic/claude-3.5-haiku'], true)]
    })
  });

  addRemote({
    key: 'GOOGLE_API_KEY',
    factory: (key) => new GeminiProvider({
      key,
      models: [model(MODEL_DEFS['google/gemini-2.0-flash-001'], true), model(MODEL_DEFS['google/gemini-1.5-pro'], false)]
    })
  });

  addRemote({
    key: 'GROQ_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'groq',
      displayName: 'Groq',
      key,
      baseUrl: 'https://api.groq.com/openai/v1',
      models: [model(MODEL_DEFS['groq/llama-3.3-70b-versatile'], true), model(MODEL_DEFS['groq/llama-3.1-8b-instant'], true)]
    })
  });

  addRemote({
    key: 'TOGETHER_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'together',
      displayName: 'Together AI',
      key,
      baseUrl: 'https://api.together.xyz/v1',
      models: [model(MODEL_DEFS['qwen/qwen-2.5-coder-32b-instruct'], false), model(MODEL_DEFS['meta-llama/llama-3.3-70b-instruct'], true)]
    })
  });

  addRemote({
    key: 'MISTRAL_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'mistral',
      displayName: 'Mistral',
      key,
      baseUrl: 'https://api.mistral.ai/v1',
      models: [model(MODEL_DEFS['mistralai/codestral-2501'], false), model(MODEL_DEFS['mistralai/mistral-small'], false)]
    })
  });

  addRemote({
    key: 'DEEPSEEK_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'deepseek',
      displayName: 'DeepSeek',
      key,
      baseUrl: 'https://api.deepseek.com/v1',
      models: [model(MODEL_DEFS['deepseek/deepseek-chat'], false), model(MODEL_DEFS['deepseek/deepseek-coder'], false)]
    })
  });

  addRemote({
    key: 'XAI_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'xai',
      displayName: 'xAI (Grok)',
      key,
      baseUrl: 'https://api.x.ai/v1',
      models: [model({ name: 'Grok-2', scores: S.general, costPer1kIn: 0.002, costPer1kOut: 0.01 })]
    })
  });

  addRemote({
    key: 'FIREWORKS_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'fireworks',
      displayName: 'Fireworks AI',
      key,
      baseUrl: 'https://api.fireworks.ai/inference/v1',
      models: [model({ name: 'Llama 3.1 8B', free: true, scores: S.cheap })]
    })
  });

  addRemote({
    key: 'PERPLEXITY_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'perplexity',
      displayName: 'Perplexity',
      key,
      baseUrl: 'https://api.perplexity.ai',
      models: [model({ name: 'Sonar', scores: { ...S.general, docs: 95 } })]
    })
  });

  addRemote({
    key: 'CEREBRAS_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'cerebras',
      displayName: 'Cerebras',
      key,
      baseUrl: 'https://api.cerebras.ai/v1',
      models: [model({ name: 'Llama 3.3 70B', free: true, scores: S.fast })]
    })
  });

  addRemote({
    key: 'NOVITA_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'novita',
      displayName: 'Novita AI',
      key,
      baseUrl: 'https://api.novita.ai/v3/openai',
      models: [model({ name: 'DeepSeek V3', free: true, scores: S.coding })]
    })
  });

  addRemote({
    key: 'HUGGINGFACE_API_KEY',
    factory: (key) => new OpenAICompatible({
      id: 'huggingface',
      displayName: 'HuggingFace',
      key,
      baseUrl: 'https://router.huggingface.co/v1',
      models: [model({ name: 'Qwen 2.5 Coder 32B', free: true, scores: S.coding })]
    })
  });

  // Local / free providers — probed for liveness, no key needed.
  providers.push(new OpenAICompatible({
    id: 'ollama',
    displayName: 'Ollama (local)',
    key: '',
    baseUrl: secrets.OLLAMA_HOST || 'http://localhost:11434/v1',
    kind: 'local',
    models: [model({ name: 'Ollama (any local model)', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));
  providers.push(new OpenAICompatible({
    id: 'lmstudio',
    displayName: 'LM Studio (local)',
    key: '',
    baseUrl: secrets.LMSTUDIO_HOST || 'http://localhost:1234/v1',
    kind: 'local',
    models: [model({ name: 'LM Studio (any local model)', free: true, scores: { ...S.cheap, docs: 70 } })]
  }));

  // Mock is always available so the pipeline works without any keys.
  providers.push(new MockProvider());

  return providers;
}

export async function getProviderById(providers, id) {
  return providers.find((p) => p.id === id) || null;
}
