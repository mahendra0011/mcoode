import { HttpProvider, streamSSE } from '@mcode/shared';

/**
 * Base adapter for any OpenAI-compatible /v1/chat/completions endpoint
 * (OpenRouter, OpenCode Zen, OpenAI, Groq, Together, Mistral, DeepSeek,
 * xAI, Fireworks, Perplexity, Cerebras, Novita, HuggingFace, Ollama,
 * LM Studio...).
 */
export class OpenAICompatible extends HttpProvider {
  constructor({ id, displayName, key, baseUrl, models, kind = 'remote' }) {
    super({ id, displayName, baseUrl, apiKey: key || '', models, kind });
  }

  async testKey(key) {
    if (this.kind === 'local') return true;
    try {
      const res = await this.httpFetch(`${this.baseUrl}/models`, {
        headers: { ...this.headers(), Authorization: `Bearer ${key}` }
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels() {
    if (this.kind === 'local') return this.models;
    try {
      const res = await this.httpFetch(`${this.baseUrl}/models`, { headers: this.headers() });
      if (!res.ok) return this.models;
      const body = await res.json();
      
      const hardcoded = new Map(this.models.map(m => [m.id, m]));
      const fallbackScores = { planning: 70, frontend: 70, backend: 70, db: 70, devops: 70, test: 70, docs: 70, bugfix: 70 };

      return (body.data || []).map((m) => {
        if (hardcoded.has(m.id)) return hardcoded.get(m.id);

        // OAI-002: OpenRouter-style pricing is per-token (tiny fractions),
        // but some gateways quote per-1K already — only scale up sub-unit
        // values to avoid 1000x cost inflation.
        const scale = (v) => {
          const n = Number(v);
          if (!Number.isFinite(n)) return undefined;
          return n > 0.1 ? n : n * 1000;
        };
        return {
          id: m.id,
          name: m.id,
          free: false,
          scores: fallbackScores,
          costPer1kIn: scale(m.pricing?.prompt),
          costPer1kOut: scale(m.pricing?.completion)
        };
      });
    } catch {
      return this.models;
    }
  }

  async probe() {
    if (!this.apiKey && this.kind !== 'local') return false;
    if (this.kind === 'local') {
      try {
        const res = await this.httpFetch(`${this.baseUrl}/models`, {}, { retries: 0 });
        return res.ok;
      } catch {
        return false;
      }
    }
    // OAI-001: probe reports liveness only — it must not permanently
    // replace the curated static catalog with whatever the API returns.
    const filtered = await this.listModels();
    return filtered.length > 0;
  }

/** * @param {any} model
 * @param {{ messages?: Array<{role: string, content: string}>, temperature?: number, maxTokens?: number, reasoning?: any, signal?: any }} [opts]
 */
  async complete(model, { messages, temperature = 0.3, maxTokens = 4096, reasoning = null, signal = null } = {}) {
    const res = await this.httpFetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      signal,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
        ...(reasoning?.effort ? { reasoning_effort: reasoning.effort } : {})
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${this.id} error ${res.status}: ${detail.slice(0, 400)}`);
    }
    const body = await res.json();
    // OAI-004: empty choices array is a failure, not an empty string.
    if (!Array.isArray(body.choices) || body.choices.length === 0) {
      throw new Error(`${this.id} error: empty choices array for model ${model}`);
    }
    const choice = body.choices?.[0];
    return {
      text: choice?.message?.content || '',
      toolCall: choice?.message?.tool_calls?.[0]
        ? { name: choice.message.tool_calls[0].function.name, arguments: choice.message.tool_calls[0].function.arguments }
        : null,
      usage: {
        inputTokens: body.usage?.prompt_tokens || 0,
        outputTokens: body.usage?.completion_tokens || 0
      },
      model,
      finishReason: choice?.finish_reason || 'stop'
    };
  }

/** * @param {any} model
 * @param {{ messages?: Array<{role: string, content: string}>, temperature?: number, maxTokens?: number, reasoning?: any, signal?: any }} [opts]
 */
  async *stream(model, { messages, temperature = 0.3, maxTokens = 4096, reasoning = null, signal = null } = {}) {
    const res = await this.httpFetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      signal,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        ...(reasoning?.effort ? { reasoning_effort: reasoning.effort } : {})
      })
    });
    if (!res.ok) {
      throw new Error(`${this.id} stream error ${res.status}`);
    }
    // OAI-003: track malformed chunks — an all-garbage stream throws
    // instead of completing silently with zero output.
    let yielded = 0;
    let malformed = 0;
    for await (const payload of streamSSE(res)) {
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          yielded++;
          yield delta;
        }
      } catch {
        malformed++;
      }
    }
    if (yielded === 0 && malformed > 0) {
      throw new Error(`${this.id} stream error: ${malformed} malformed chunk(s), no usable deltas`);
    }
  }
}
