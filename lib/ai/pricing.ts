/**
 * Provider pricing table (USD per 1M tokens).
 *
 * Figures are approximate list prices used for *budgeting/estimation* only, not
 * billing. Keep them conservative; update as provider pricing changes.
 */
export interface ModelPrice {
  inputPerM: number;
  outputPerM: number;
}

export const PRICING: Record<string, ModelPrice> = {
  // DeepSeek — primary cheap tier
  'deepseek-chat': {inputPerM: 0.27, outputPerM: 1.1},
  'deepseek-reasoner': {inputPerM: 0.55, outputPerM: 2.19},
  // MiniMax — secondary cheap tier
  'minimax-text-01': {inputPerM: 0.2, outputPerM: 1.1},
  // OpenAI-compatible premium fallback (generic; override via env model name)
  'gpt-4o': {inputPerM: 2.5, outputPerM: 10},
  'gpt-4o-mini': {inputPerM: 0.15, outputPerM: 0.6},
  // Mock — free
  mock: {inputPerM: 0, outputPerM: 0},
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model] ?? {inputPerM: 1, outputPerM: 3};
  return (inputTokens / 1_000_000) * price.inputPerM + (outputTokens / 1_000_000) * price.outputPerM;
}

/** Very rough token estimate (~4 chars/token) for pre-call budgeting. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
