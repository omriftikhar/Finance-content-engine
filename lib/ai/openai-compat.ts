import type {GenerateOptions, GenerateResult, TextModel, TextTask} from './types';
import {estimateCost, estimateTokens} from './pricing';

/**
 * Adapter for any OpenAI-compatible /chat/completions endpoint.
 *
 * DeepSeek, MiniMax and premium OpenAI-compatible providers all speak this
 * protocol, so they share this implementation and differ only by baseUrl,
 * apiKey and model. Runs entirely server-side (API keys never reach the client).
 *
 * Production hardening: request timeout via AbortController, bounded retries
 * with exponential backoff on transient failures (429 / 5xx / network), typed
 * errors, and per-call token + cost logging.
 */
export interface OpenAICompatConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Per-request timeout in ms (default 60s). */
  timeoutMs?: number;
  /** Max attempts including the first (default 3). */
  maxAttempts?: number;
}

interface ChatChoice {
  message?: {content?: string};
  finish_reason?: string;
}
interface ChatResponse {
  choices?: ChatChoice[];
  usage?: {prompt_tokens?: number; completion_tokens?: number};
  error?: {message?: string; type?: string};
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly status?: number,
    readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function log(provider: string, msg: string, extra?: Record<string, unknown>) {
  const base = `[ai:${provider}] ${msg}`;
  if (extra) console.log(base, JSON.stringify(extra));
  else console.log(base);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class OpenAICompatModel implements TextModel {
  readonly name: string;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor(cfg: OpenAICompatConfig) {
    this.name = cfg.name;
    this.model = cfg.model;
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.apiKey = cfg.apiKey;
    this.timeoutMs = cfg.timeoutMs ?? Number(process.env.AI_TIMEOUT_MS ?? 60_000);
    this.maxAttempts = cfg.maxAttempts ?? Number(process.env.AI_MAX_ATTEMPTS ?? 3);
  }

  async generate(task: TextTask, prompt: string, opts: GenerateOptions = {}): Promise<GenerateResult> {
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

    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const started = Date.now();
      try {
        const result = await this.attempt(task, prompt, body);
        log(this.name, `ok task=${task} attempt=${attempt}`, {
          ms: Date.now() - started,
          inTok: result.usage.inputTokens,
          outTok: result.usage.outputTokens,
          costUsd: Number(result.costUsd.toFixed(6)),
        });
        return result;
      } catch (err) {
        lastErr = err;
        const retryable = err instanceof ProviderError ? err.retryable : true; // network errors retryable
        const status = err instanceof ProviderError ? err.status : undefined;
        log(this.name, `fail task=${task} attempt=${attempt}/${this.maxAttempts}`, {
          ms: Date.now() - started,
          status,
          retryable,
          error: (err as Error).message?.slice(0, 160),
        });
        if (!retryable || attempt === this.maxAttempts) break;
        // Exponential backoff with jitter: 0.5s, 1s, 2s ...
        await sleep(Math.round(500 * 2 ** (attempt - 1) * (0.8 + Math.random() * 0.4)));
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new ProviderError('Unknown provider error', this.name);
  }

  private async attempt(
    _task: TextTask,
    prompt: string,
    body: Record<string, unknown>,
  ): Promise<GenerateResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {'content-type': 'application/json', authorization: `Bearer ${this.apiKey}`},
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new ProviderError(`request timed out after ${this.timeoutMs}ms`, this.name, undefined, true);
      }
      throw new ProviderError(`network error: ${(err as Error).message}`, this.name, undefined, true);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new ProviderError(
        `request failed (${res.status}): ${detail.slice(0, 300)}`,
        this.name,
        res.status,
        RETRYABLE_STATUS.has(res.status),
      );
    }

    const data = (await res.json()) as ChatResponse;
    if (data.error) {
      throw new ProviderError(`API error: ${data.error.message ?? 'unknown'}`, this.name, res.status, false);
    }
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) {
      throw new ProviderError('empty completion returned', this.name, res.status, true);
    }
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
