import { HttpProvider, streamSSE } from '@mcode/shared';
import pRetry from 'p-retry';

function shouldRetry(err) {
  if (err?.code === 'ECONNREFUSED' || err?.code === 'ETIMEDOUT' || err?.code === 'ECONNRESET') return true;
  if (err?.status === 429 || (err?.status >= 500 && err?.status < 600)) return true;
  return false;
}

/** Google Gemini (generativelanguage) adapter. */
export class GeminiProvider extends HttpProvider {
  constructor({ id = 'google', displayName = 'Google Gemini', key, models }) {
    super({
      id,
      displayName,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: key,
      models,
      kind: 'remote'
    });
  }

  // GEM-001/002: key travels via x-goog-api-key header, never in the URL
  // (URLs land in proxy/CDN/monitoring logs).
  headers(apiKey = this.apiKey) {
    const h = { 'Content-Type': 'application/json' };
    if (apiKey) h['x-goog-api-key'] = apiKey;
    return h;
  }

  async testKey(key) {
    try {
      const res = await this.httpFetch(`${this.baseUrl}/models`, {
        headers: this.headers(key),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels() {
    return this.models;
  }

  async probe() {
    if (!this.apiKey) return false;
    try {
      const res = await this.httpFetch(`${this.baseUrl}/models`, { headers: this.headers() });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * @param {any} model
   * @param {{ messages?: Array<{role: string, content: string}>, temperature?: number, maxTokens?: number, reasoning?: any, signal?: any }} [opts]
   */
  _request(model, { messages = [], temperature, maxTokens, reasoning } = /** @type {any} */ ({})) {
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
    // GEM-003: concatenate ALL system messages instead of dropping all
    // but the first.
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n') || undefined;
    const budget = reasoning?.thinkingBudget || 0;
    return {
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(budget > 0 ? { thinkingConfig: { thinkingBudget: budget } } : {})
        }
      }),
      url: `${this.baseUrl}/models/${model}:generateContent`
    };
  }

  async complete(model, opts = {}) {
    const { url, body } = this._request(model, { maxTokens: 4096, temperature: 0.3, ...opts });
    return pRetry(async () => {
      const res = await this.httpFetch(url, {
        method: 'POST',
        headers: this.headers(),
        signal: opts.signal || null,
        body
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        const err = new Error(`google error ${res.status}: ${detail.slice(0, 400)}`);
        /** @type {any} */ (err).status = res.status;
        throw err;
      }
      const resBody = await res.json();
      const usage = resBody.usageMetadata || {};
      return {
        text: (resBody.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(''),
        toolCall: null,
        usage: {
          inputTokens: usage.promptTokenCount || 0,
          outputTokens: usage.candidatesTokenCount || 0
        },
        model,
        finishReason: resBody.candidates?.[0]?.finishReason || 'STOP'
      };
    }, { retries: 3, factor: 2, minTimeout: 1000, shouldRetry });
  }

  async *stream(model, opts = {}) {
    const { url, body } = this._request(model, { maxTokens: 4096, temperature: 0.3, ...opts });
    // GEM-004: separator depends on whether a query string already exists.
    const streamUrl = `${url}${url.includes('?') ? '&' : '?'}alt=sse`;
    const res = await this.httpFetch(streamUrl, {
      method: 'POST',
      headers: this.headers(),
      signal: opts.signal || null,
      body
    });
    if (!res.ok) {
      throw new Error(`google stream error ${res.status}`);
    }
    for await (const payload of streamSSE(res)) {
      try {
        const json = JSON.parse(payload);
        const parts = json.candidates?.[0]?.content?.parts || [];
        const text = parts.map((p) => p.text || '').join('');
        if (text) yield text;
        if (json.candidates?.[0]?.finishReason === 'STOP') return;
      } catch {
        /* ignore malformed chunk */
      }
    }
  }
}
