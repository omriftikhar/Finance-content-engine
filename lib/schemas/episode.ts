import {z} from 'zod';
import {SceneSchema} from './scene';
import {ResearchSourceSchema, FinancialClaimSchema} from './research';
import {ScriptSchema} from './script';
import {PackagingSchema} from './packaging';
import {AssetSchema} from './asset';
import {StageStateSchema, PipelineStage, CostEntrySchema, PIPELINE_STAGES} from './pipeline';

/**
 * Top-level Episode aggregate.
 *
 * This is the single document that flows through the pipeline. Sub-systems
 * (research, script, storyboard, packaging, assets) attach their output here.
 * Legacy top-level fields (topic/title/hook/scenes/sources) are retained so the
 * dashboard and Remotion renderer keep working during the migration.
 */
export const EpisodeSchema = z.object({
  id: z.string(),
  topic: z.string(),
  title: z.string(),
  hook: z.string(),
  targetMinutes: z.number().positive().default(9),

  createdAt: z.string(),
  updatedAt: z.string(),

  /** Current pipeline stage. */
  stage: PipelineStage.default('IDEA'),
  /** Per-stage execution state, keyed by stage name. */
  stages: z.record(z.enum(PIPELINE_STAGES), StageStateSchema).default({}),

  // --- Research ---
  sources: z.array(ResearchSourceSchema).default([]),
  claims: z.array(FinancialClaimSchema).default([]),

  // --- Script ---
  script: ScriptSchema.optional(),

  // --- Storyboard (also the Remotion render input) ---
  scenes: z.array(SceneSchema).default([]),

  // --- Packaging ---
  packaging: PackagingSchema.optional(),

  // --- Assets ---
  assets: z.array(AssetSchema).default([]),

  // --- Cost ledger ---
  costs: z.array(CostEntrySchema).default([]),
  estimatedCostUsd: z.number().nonnegative().default(0),

  /** True once a human approves the final publish package. */
  approved: z.boolean().default(false),
});
export type Episode = z.infer<typeof EpisodeSchema>;

export const CreateEpisodeInputSchema = z.object({
  topic: z.string().min(8).max(240),
  targetMinutes: z.number().positive().max(20).optional(),
});
export type CreateEpisodeInput = z.infer<typeof CreateEpisodeInputSchema>;

/** Total cost booked so far. */
export function totalCost(episode: Pick<Episode, 'costs'>): number {
  return episode.costs.reduce((sum, c) => sum + c.costUsd, 0);
}
