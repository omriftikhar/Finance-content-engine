import type {GenerateOptions, GenerateResult, TextModel, TextTask} from './types';
import {estimateCost, estimateTokens} from './pricing';

/**
 * Adapter for any OpenAI-compatible /chat/completions endpoint.
 *
 * DeepSeek, MiniMax and premium OpenAI-compatible providers all speak this
 * protocol, so they share this implementation and differ only by baseUrl,
 * apiKey and model. Runs entirely server-side.
 */
export interface OpenAICompatConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface ChatChoice {
  message?: {content?: string};
}
interface ChatResponse {
  choices?: ChatChoice[];
  usage?: {prompt_tokens?: number; completion_tokens?: number};
}

export class OpenAICompatModel implements TextModel {
  readonly name: string;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(cfg: OpenAICompatConfig) {
    this.name = cfg.name;
    this.model = cfg.model;
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.apiKey = cfg.apiKey;
  }

  async generate(_task: TextTask, prompt: string, opts: GenerateOptions = {}): Promise<GenerateResult> {
    const messages: Array<{role: string; content: string}> = [];
    if (opts.system) messages.push({role: 'system', content: opts.system});
    messages.push({role: 'user', content: prompt});

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: opts.temperature ?? 0.7,
    };
    if (opts.maxTokens) body.max_tokens = opts.maxTokens;
    if (opts.json) body.response_format = {type: 'json_object'};

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${this.name} request failed (${res.status}): ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as ChatResponse;
    const text = data.choices?.[0]?.message?.content ?? '';
    const inputTokens = data.usage?.prompt_tokens ?? estimateTokens(prompt);
    const outputTokens = data.usage?.completion_tokens ?? estimateTokens(text);

    return {
      text,
      provider: this.name,
      model: this.model,
      usage: {inputTokens, outputTokens},
      costUsd: estimateCost(this.model, inputTokens, outputTokens),
    };
  }
}
