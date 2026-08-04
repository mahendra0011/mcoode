import { HttpProvider } from '@mcode/shared';

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

  async probe() {
    if (!this.apiKey && this.kind !== 'local') return false;
    if (this.kind === 'local') {
      try {
        const res = await fetch(`${this.baseUrl}/models`);
        return res.ok;
      } catch {
        return false;
      }
    }
    try {
      const res = await fetch(`${this.baseUrl}/models`, { headers: this.headers() });
      if (!res.ok) return false;
      const body = await res.json();
      const ids = new Set((body.data || []).map((m) => m.id));
      this.models = this.models.filter((m) => ids.has(m.id));
      return this.models.length > 0;
    } catch {
      return false;
    }
  }

  async complete(model, { messages, temperature = 0.3, maxTokens = 4096 } = {}) {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${this.id} error ${res.status}: ${detail.slice(0, 400)}`);
    }
    const body = await res.json();
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

  async *stream(model, { messages, temperature = 0.3, maxTokens = 4096 } = {}) {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      })
    });
    if (!res.ok || !res.body) {
      throw new Error(`${this.id} stream error ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          /* ignore malformed chunk */
        }
      }
    }
  }
}
