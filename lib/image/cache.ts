import {createHash} from 'node:crypto';
import type {ImageGenRequest} from './types';

/**
 * Deterministic asset cache key.
 *
 * Same provider + model + prompt + reference + seed + aspect => same key => the
 * asset is reused instead of regenerated (cost control + consistency).
 */
export function assetKey(provider: string, model: string, req: ImageGenRequest): string {
  const h = createHash('sha256');
  h.update(
    JSON.stringify({
      provider,
      model,
      prompt: req.prompt.trim(),
      negativePrompt: req.negativePrompt ?? '',
      aspect: req.aspect ?? '16:9',
      referenceImage: req.referenceImage ?? '',
      seed: req.seed ?? null,
    }),
  );
  return `${provider}_${model}_${h.digest('hex').slice(0, 16)}`;
}
