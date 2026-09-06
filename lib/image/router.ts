import 'server-only';
import type {ImageProvider} from './types';
import {MockImageProvider} from './mock';
import {OpenAIImageProvider} from './openai';
import {ReplicateImageProvider} from './replicate';

/**
 * Selects an image provider from IMAGE_PROVIDER: mock | openai | replicate.
 * Builders return null when uncredentialed so the router falls back to mock —
 * the pipeline always runs, and no paid call happens without an explicit key.
 */
export function buildOpenAIImage(): ImageProvider | null {
  const key = process.env.OPENAI_API_KEY ?? process.env.OPENAI_IMAGE_API_KEY;
  if (!key) return null;
  return new OpenAIImageProvider({
    apiKey: key,
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    model: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1',
    costPerImage: Number(process.env.OPENAI_IMAGE_COST ?? 0.04),
  });
}

export function buildReplicateImage(): ImageProvider | null {
  if (!process.env.REPLICATE_API_TOKEN) return null;
  return new ReplicateImageProvider({
    apiKey: process.env.REPLICATE_API_TOKEN,
    baseUrl: process.env.REPLICATE_BASE_URL ?? 'https://api.replicate.com/v1',
    model: process.env.REPLICATE_IMAGE_MODEL ?? 'black-forest-labs/flux-dev',
    costPerImage: Number(process.env.REPLICATE_IMAGE_COST ?? 0.03),
  });
}

export function getImageProviderByName(name: string): ImageProvider | null {
  switch (name.toLowerCase()) {
    case 'openai':
      return buildOpenAIImage();
    case 'replicate':
      return buildReplicateImage();
    case 'mock':
      return new MockImageProvider();
    default:
      return null;
  }
}

export function getImageProvider(): ImageProvider {
  const name = (process.env.IMAGE_PROVIDER ?? 'mock').toLowerCase();
  return getImageProviderByName(name) ?? new MockImageProvider();
}

export function isMockImage(): boolean {
  const name = (process.env.IMAGE_PROVIDER ?? 'mock').toLowerCase();
  if (name === 'mock') return true;
  return getImageProviderByName(name) === null;
}
