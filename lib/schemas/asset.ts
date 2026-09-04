import {z} from 'zod';

/** Asset manifest contracts. Prefer reusing assets before generating new ones. */

export const ASSET_TYPES = [
  'character',
  'background',
  'icon',
  'image',
  'audio',
  'music',
  'sfx',
  'chart',
  'thumbnail',
  'video',
] as const;
export const AssetType = z.enum(ASSET_TYPES);
export type AssetType = z.infer<typeof AssetType>;

export const AssetSchema = z.object({
  id: z.string(),
  type: AssetType,
  /** Human label, e.g. "narration-scene-3" or "character-jack-stressed". */
  label: z.string(),
  /** Where it came from: 'generated' | 'library' | 'upload' | 'placeholder'. */
  source: z.enum(['generated', 'library', 'upload', 'placeholder']).default('placeholder'),
  provider: z.string().optional(),
  generationPrompt: z.string().optional(),
  costUsd: z.number().nonnegative().default(0),
  /** Local path and/or remote storage (R2) URL. */
  localPath: z.string().optional(),
  storageUrl: z.string().url().optional(),
  episodeId: z.string().optional(),
  sceneId: z.number().int().optional(),
  /** ms — for audio assets, drives audio-aware scene duration. */
  durationMs: z.number().nonnegative().optional(),
  createdAt: z.string().optional(),
});
export type Asset = z.infer<typeof AssetSchema>;
