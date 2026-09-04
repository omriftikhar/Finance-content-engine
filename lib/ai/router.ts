import 'server-only';
import type {ProviderTier, TextModel, TextTask} from './types';
import {MockTextModel} from './mock';
import {OpenAICompatModel} from './openai-compat';
import {getAIConfig, type AIConfig} from './config';

/**
 * Task → tier routing.
 *
 * High-volume drafting/extraction goes to the cheap tier (DeepSeek, then
 * MiniMax). Quality-sensitive polish goes premium. Callers can also decide at
 * runtime (e.g. only polish when a quality score is low) by passing the tier.
 */
const TASK_TIER: Record<TextTask, ProviderTier> = {
  'topic-research': 'cheap',
  'topic-analysis': 'cheap',
  'script-draft': 'cheap',
  'scene-plan': 'cheap',
  packaging: 'cheap',
  'hook-polish': 'premium',
  'script-polish': 'premium',
};

function buildCheap(cfg: AIConfig): TextModel {
  if (cfg.mockMode) return new MockTextModel();
  if (cfg.deepseek.apiKey) {
    return new OpenAICompatModel({name: 'deepseek', ...cfg.deepseek, apiKey: cfg.deepseek.apiKey});
  }
  if (cfg.minimax.apiKey) {
    return new OpenAICompatModel({name: 'minimax', ...cfg.minimax, apiKey: cfg.minimax.apiKey});
  }
  return new MockTextModel();
}

function buildPremium(cfg: AIConfig): TextModel {
  if (cfg.mockMode) return new MockTextModel();
  if (cfg.premium.apiKey) {
    return new OpenAICompatModel({name: 'premium', ...cfg.premium, apiKey: cfg.premium.apiKey});
  }
  // Fall back to the cheap tier rather than failing when no premium key exists.
  return buildCheap(cfg);
}

export function getTextModel(task: TextTask, tierOverride?: ProviderTier): TextModel {
  const cfg = getAIConfig();
  const tier = tierOverride ?? TASK_TIER[task];
  return tier === 'premium' ? buildPremium(cfg) : buildCheap(cfg);
}

/** Whether the app is effectively running without paid text providers. */
export function isMockText(): boolean {
  const cfg = getAIConfig();
  return cfg.mockMode || (!cfg.deepseek.apiKey && !cfg.minimax.apiKey && !cfg.premium.apiKey);
}
