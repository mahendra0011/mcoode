import { HttpProvider, streamSSE } from '@mcode/shared';

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

  async testKey(key) {
    try {
      const res = await this.httpFetch(`${this.baseUrl}/models?key=${key}`);
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
      const res = await this.httpFetch(`${this.baseUrl}/models?key=${this.apiKey}`);
      return res.ok;
    } catch {
      return false;
    }
  }

  headers() {
    return { 'Content-Type': 'application/json' };
  }

  _request(model, { messages, temperature, maxTokens, reasoning }) {
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
    const system = messages.find((m) => m.role === 'system')?.content;
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
      url: `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`
    };
  }

  async complete(model, opts = {}) {
    const { url, body } = this._request(model, { maxTokens: 4096, temperature: 0.3, ...opts });
    const res = await this.httpFetch(url, {
      method: 'POST',
      headers: this.headers(),
      signal: opts.signal || null,
      body
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`google error ${res.status}: ${detail.slice(0, 400)}`);
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
  }

  async *stream(model, opts = {}) {
    const { url, body } = this._request(model, { maxTokens: 4096, temperature: 0.3, ...opts });
    const streamUrl = `${url}&alt=sse`;
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
