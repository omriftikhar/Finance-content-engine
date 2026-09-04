/**
 * AI text-provider abstraction.
 *
 * Pipeline tasks are routed to providers by tier (cheap vs premium). Every call
 * reports token usage and estimated cost so the cost governor can enforce a
 * per-episode budget. API keys live only in server-side env; adapters must never
 * be imported into client components.
 */

export type TextTask =
  | 'topic-research'
  | 'topic-analysis'
  | 'script-draft'
  | 'script-polish'
  | 'hook-polish'
  | 'scene-plan'
  | 'packaging';

/** Cost/quality tier a task is routed to. */
export type ProviderTier = 'cheap' | 'premium';

export interface GenerateOptions {
  /** Encourages JSON-only output where the adapter supports it. */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  system?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateResult {
  text: string;
  provider: string;
  model: string;
  usage: TokenUsage;
  costUsd: number;
}

export interface TextModel {
  /** Stable provider identifier, e.g. 'deepseek', 'minimax', 'mock'. */
  readonly name: string;
  readonly model: string;
  generate(task: TextTask, prompt: string, opts?: GenerateOptions): Promise<GenerateResult>;
}
