import 'server-only';

/**
 * Server-only AI configuration read from environment variables.
 *
 * Never import this from client components. When keys are absent the app falls
 * back to mock mode, so the entire product runs locally with no credentials.
 */
export interface ProviderEnv {
  apiKey?: string;
  baseUrl: string;
  model: string;
}

export interface AIConfig {
  /** Global mode: force mock regardless of keys. */
  mockMode: boolean;
  deepseek: ProviderEnv;
  minimax: ProviderEnv;
  premium: ProviderEnv;
}

export function getAIConfig(): AIConfig {
  const textProvider = (process.env.TEXT_PROVIDER ?? 'mock').toLowerCase();
  return {
    mockMode: textProvider === 'mock',
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    },
    minimax: {
      apiKey: process.env.MINIMAX_API_KEY,
      baseUrl: process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.io/v1',
      model: process.env.MINIMAX_MODEL ?? 'minimax-text-01',
    },
    premium: {
      apiKey: process.env.PREMIUM_API_KEY ?? process.env.OPENAI_API_KEY,
      baseUrl: process.env.PREMIUM_BASE_URL ?? 'https://api.openai.com/v1',
      model: process.env.PREMIUM_MODEL ?? 'gpt-4o',
    },
  };
}
