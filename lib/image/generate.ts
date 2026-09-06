import 'server-only';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import type {ImageAsset, VisualPrompt} from '@/lib/schemas/visual';
import {getImageProvider, isMockImage} from './router';
import {assetKey} from './cache';
import type {ImageGenRequest} from './types';

/**
 * Generate-or-reuse a cinematic image asset.
 *
 * Deterministic caching: if an asset with the same key already exists on disk we
 * return it instead of paying to regenerate (cost control + consistency). Assets
 * live in public/assets/generated/ so Remotion staticFile() can load them; a
 * sidecar .json records full provenance (provider/model/prompt/ref/seed/cost).
 */
const CACHE_DIR = path.join(process.cwd(), 'public', 'assets', 'generated');
const META_DIR = path.join(process.cwd(), 'data', 'image-cache');

export interface GenerateOptions {
  episodeId?: string;
  sceneId?: number;
  assetType?: ImageAsset['assetType'];
  seed?: number;
}

export async function generateOrReuse(spec: VisualPrompt, opts: GenerateOptions = {}): Promise<ImageAsset> {
  await fs.mkdir(CACHE_DIR, {recursive: true});
  await fs.mkdir(META_DIR, {recursive: true});

  const provider = getImageProvider();
  const req: ImageGenRequest = {
    prompt: spec.visualPrompt,
    negativePrompt: spec.negativePrompt,
    aspect: spec.aspect,
    referenceImage: spec.characterReference,
    seed: opts.seed,
  };
  const key = assetKey(provider.name, provider.model, req);
  const metaPath = path.join(META_DIR, `${key}.json`);

  // Cache hit?
  try {
    const cached = JSON.parse(await fs.readFile(metaPath, 'utf8')) as ImageAsset;
    const abs = path.join(process.cwd(), 'public', cached.path);
    await fs.access(abs);
    return cached; // reuse — no cost
  } catch {
    /* miss — generate below */
  }

  const result = await provider.generate(req);
  const ext = result.format;
  const rel = `assets/generated/${key}.${ext}`;
  await fs.writeFile(path.join(process.cwd(), 'public', rel), result.bytes);

  const asset: ImageAsset = {
    key,
    provider: result.provider,
    model: result.model,
    prompt: spec.visualPrompt,
    negativePrompt: spec.negativePrompt,
    characterReference: spec.characterReference,
    seed: result.seed,
    aspect: spec.aspect,
    width: result.width,
    height: result.height,
    costUsd: result.costUsd,
    path: rel,
    episodeId: opts.episodeId,
    sceneId: opts.sceneId,
    assetType: opts.assetType ?? 'environment',
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(metaPath, JSON.stringify(asset, null, 2));
  return asset;
}

export {isMockImage};
