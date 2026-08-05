import { HttpProvider } from '@mcode/shared';

/** Anthropic Messages API adapter. */
export class AnthropicProvider extends HttpProvider {
  constructor({ id = 'anthropic', displayName = 'Anthropic', key, models }) {
    super({ id, displayName, baseUrl: 'https://api.anthropic.com/v1', apiKey: key, models, kind: 'remote' });
  }

  async testKey(key) {
    try {
      const res = await fetch(`${this.baseUrl}/models`, { 
        headers: { ...this.headers(), 'x-api-key': key }
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
      const res = await fetch(`${this.baseUrl}/models`, { headers: this.headers() });
      return res.ok;
    } catch {
      return false;
    }
  }

  headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };
  }

  async complete(model, { messages, temperature = 0.3, maxTokens = 4096, reasoning = null } = {}) {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const rest = messages.filter((m) => m.role !== 'system');
    const budget = reasoning?.thinkingBudget || 0;
    const thinking = budget > 0 ? { type: 'enabled', budget_tokens: budget } : undefined;
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model,
        system,
        messages: rest,
        temperature,
        max_tokens: maxTokens + budget,
        ...(thinking ? { thinking } : {})
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`anthropic error ${res.status}: ${detail.slice(0, 400)}`);
    }
    const body = await res.json();
    return {
      text: (body.content || []).map((b) => b.text || '').join(''),
      toolCall: null,
      usage: {
        inputTokens: body.usage?.input_tokens || 0,
        outputTokens: body.usage?.output_tokens || 0
      },
      model,
      finishReason: body.stop_reason || 'stop'
    };
  }
}
