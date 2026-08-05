import { HttpProvider } from '@mcode/shared';

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
      const res = await fetch(`${this.baseUrl}/models?key=${key}`);
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
      const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);
      return res.ok;
    } catch {
      return false;
    }
  }

  headers() {
    return { 'Content-Type': 'application/json' };
  }

  async complete(model, { messages, temperature = 0.3, maxTokens = 4096, reasoning = null } = {}) {
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
    const system = messages.find((m) => m.role === 'system')?.content;
    const budget = reasoning?.thinkingBudget || 0;
    const res = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          contents,
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            ...(budget > 0 ? { thinkingConfig: { thinkingBudget: budget } } : {})
          }
        })
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`google error ${res.status}: ${detail.slice(0, 400)}`);
    }
    const body = await res.json();
    const usage = body.usageMetadata || {};
    return {
      text: (body.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(''),
      toolCall: null,
      usage: {
        inputTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0
      },
      model,
      finishReason: body.candidates?.[0]?.finishReason || 'STOP'
    };
  }
}
