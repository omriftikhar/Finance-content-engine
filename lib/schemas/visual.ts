import {z} from 'zod';

/**
 * Visual asset + planning contracts.
 *
 * The Asset Planner decides, per storyboard beat, HOW the visual is produced.
 * Only a subset of beats need AI-generated cinematic plates; the rest are
 * deterministic Remotion motion-graphics, charts, source documents, typography,
 * or reuse of an existing asset. This controls cost and keeps character
 * consistency (Jack) manageable.
 */

/** How a beat's visual is produced. */
export const VISUAL_STRATEGIES = [
  'ai_environment', // AI-generated cinematic environment/character plate
  'reuse_asset', // reuse an existing generated/library asset
  'remotion_motion', // deterministic motion graphics (money tank, impacts, ...)
  'data_viz', // chart/data visualization
  'source_document', // source/document visualization (IRS/BLS/Fed)
  'typography', // typography-only visual
  'layered_composition', // composite existing layers (bg + character + fg + overlay)
] as const;
export const VisualStrategy = z.enum(VISUAL_STRATEGIES);
export type VisualStrategy = z.infer<typeof VisualStrategy>;

export const CAMERA_FRAMINGS = ['wide', 'medium', 'closeUp', 'overShoulder', 'topDown', 'establishing'] as const;
export const CameraFraming = z.enum(CAMERA_FRAMINGS);

/** A prompt spec for an image provider. Text/numbers are NEVER baked into images. */
export const VisualPromptSchema = z.object({
  /** The scene description for the image model. */
  visualPrompt: z.string(),
  /** Environment/world label (suburban-home, highway, kitchen, ...). */
  environment: z.string(),
  framing: CameraFraming.default('wide'),
  /** Reference to keep character identity consistent (id or image path/url). */
  characterReference: z.string().optional(),
  /** Layers we expect to composite in Remotion. */
  requiredLayers: z.array(z.enum(['background', 'midground', 'character', 'foreground', 'overlay'])).default(['background']),
  negativePrompt: z.string().default('text, words, numbers, charts, watermark, logo, ui, dashboard, low quality, distorted face, extra fingers'),
  /** Continuity notes (lighting, wardrobe, time-of-day) to hold across scenes. */
  continuity: z.string().optional(),
  /** Aspect ratio; default 16:9 for YouTube. */
  aspect: z.string().default('16:9'),
});
export type VisualPrompt = z.infer<typeof VisualPromptSchema>;

/** The planner's decision for one beat. */
export const AssetPlanItemSchema = z.object({
  sceneId: z.number().int(),
  strategy: VisualStrategy,
  /** For ai_environment / layered_composition: the prompt spec. */
  prompt: VisualPromptSchema.optional(),
  /** For reuse_asset: the asset id/key to reuse. */
  reuseKey: z.string().optional(),
  /** Human rationale (why this strategy). */
  reason: z.string().default(''),
  /** Estimated generation cost (0 for non-AI strategies). */
  estimatedCostUsd: z.number().nonnegative().default(0),
});
export type AssetPlanItem = z.infer<typeof AssetPlanItemSchema>;

export const AssetPlanSchema = z.object({
  episodeId: z.string(),
  items: z.array(AssetPlanItemSchema).default([]),
  /** Count that would require paid AI generation. */
  aiGenerationCount: z.number().int().nonnegative().default(0),
  estimatedTotalCostUsd: z.number().nonnegative().default(0),
});
export type AssetPlan = z.infer<typeof AssetPlanSchema>;

/** A generated/loaded image asset with full provenance for caching + audit. */
export const ImageAssetSchema = z.object({
  /** Deterministic cache key (hash of provider+model+prompt+ref+seed). */
  key: z.string(),
  provider: z.string(),
  model: z.string(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  characterReference: z.string().optional(),
  seed: z.number().optional(),
  aspect: z.string().default('16:9'),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  costUsd: z.number().nonnegative().default(0),
  /** public-relative path for Remotion staticFile(). */
  path: z.string(),
  episodeId: z.string().optional(),
  sceneId: z.number().int().optional(),
  assetType: z.enum(['environment', 'character', 'foreground', 'texture', 'prop']).default('environment'),
  createdAt: z.string(),
});
export type ImageAsset = z.infer<typeof ImageAssetSchema>;
