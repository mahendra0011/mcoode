import { HttpProvider, streamSSE } from '@mcode/shared';
import pRetry from 'p-retry';

function shouldRetry(err) {
  if (err?.code === 'ECONNREFUSED' || err?.code === 'ETIMEDOUT' || err?.code === 'ECONNRESET') return true;
  if (err?.status === 429 || (err?.status >= 500 && err?.status < 600)) return true;
  return false;
}

/** Anthropic Messages API adapter. */
export class AnthropicProvider extends HttpProvider {
  constructor({ id = 'anthropic', displayName = 'Anthropic', key, models }) {
    super({ id, displayName, baseUrl: 'https://api.anthropic.com/v1', apiKey: key, models, kind: 'remote' });
  }

  async testKey(key) {
    try {
      const res = await this.httpFetch(`${this.baseUrl}/models`, {
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
      const res = await this.httpFetch(`${this.baseUrl}/models`, { headers: this.headers() });
      return res.ok;
    } catch {
      return false;
    }
  }

  headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2024-10-22'
    };
  }

  /** Anthropic rejects `temperature` on models with extended thinking — omit it. */
  _body(model, { messages, temperature, maxTokens, thinking, stream }) {
    const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content);
    const system = systemParts.length
      ? { type: 'text', text: systemParts.join('\n') }
      : undefined;
    const rest = messages.filter((m) => m.role !== 'system');
    const body = {
      model,
      messages: rest,
      ...(thinking ? {} : { temperature }),
      max_tokens: Math.min(64000, maxTokens + (thinking?.budget_tokens || 0)),
      ...(thinking ? { thinking } : {}),
      ...(system ? { system } : {}),
      stream
    };
    return JSON.stringify(body);
  }

/** * @param {any} model
 * @param {{ messages?: Array<{role: string, content: string}>, temperature?: number, maxTokens?: number, reasoning?: any, signal?: any }} [opts]
 */
  async complete(model, { messages, temperature = 0.3, maxTokens = 4096, reasoning = null, signal = null } = {}) {
    const budget = reasoning?.thinkingBudget || 0;
    const thinking = budget > 0 ? { type: 'enabled', budget_tokens: budget } : undefined;
    return pRetry(async () => {
      const res = await this.httpFetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.headers(),
        signal,
        body: this._body(model, { messages, temperature, maxTokens, thinking, stream: false })
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        const err = new Error(`anthropic error ${res.status}: ${detail.slice(0, 400)}`);
        /** @type {any} */ (err).status = res.status;
        throw err;
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
    }, { retries: 3, factor: 2, minTimeout: 1000, shouldRetry });
  }

/** * @param {any} model
 * @param {{ messages?: Array<{role: string, content: string}>, temperature?: number, maxTokens?: number, reasoning?: any, signal?: any }} [opts]
 */
  async *stream(model, { messages, temperature = 0.3, maxTokens = 4096, reasoning = null, signal = null } = {}) {
    const budget = reasoning?.thinkingBudget || 0;
    const thinking = budget > 0 ? { type: 'enabled', budget_tokens: budget } : undefined;
    const res = await this.httpFetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers(),
      signal,
      body: this._body(model, { messages, temperature, maxTokens, thinking, stream: true })
    });
    // ANT-004: include the response body like complete() does.
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`anthropic stream error ${res.status}: ${detail.slice(0, 400)}`);
    }
    for await (const payload of streamSSE(res)) {
      try {
        const json = JSON.parse(payload);
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta' && json.delta.text) {
          yield json.delta.text;
        } else if (json.type === 'message_stop') {
          return;
        }
      } catch {
        /* ignore malformed chunk */
      }
    }
  }
}
