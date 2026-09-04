import {z} from 'zod';

/** Episode pipeline state machine + generation job/cost contracts. */

export const PIPELINE_STAGES = [
  'IDEA',
  'RESEARCHING',
  'RESEARCH_REVIEW',
  'SCRIPTING',
  'SCRIPT_REVIEW',
  'STORYBOARDING',
  'VOICE_GENERATION',
  'ASSET_GENERATION',
  'READY_TO_RENDER',
  'RENDERING',
  'RENDER_REVIEW',
  'PACKAGING',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'FAILED',
] as const;
export const PipelineStage = z.enum(PIPELINE_STAGES);
export type PipelineStage = z.infer<typeof PipelineStage>;

export const STAGE_STATUSES = [
  'pending',
  'running',
  'awaiting_review',
  'complete',
  'failed',
] as const;
export const StageStatus = z.enum(STAGE_STATUSES);
export type StageStatus = z.infer<typeof StageStatus>;

export const StageStateSchema = z.object({
  stage: PipelineStage,
  status: StageStatus.default('pending'),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
  costUsd: z.number().nonnegative().default(0),
  provider: z.string().optional(),
  attempts: z.number().int().nonnegative().default(0),
});
export type StageState = z.infer<typeof StageStateSchema>;

/** The ordered list of *work* stages (review/terminal states excluded). */
export const WORK_STAGES: PipelineStage[] = [
  'RESEARCHING',
  'SCRIPTING',
  'STORYBOARDING',
  'VOICE_GENERATION',
  'ASSET_GENERATION',
  'RENDERING',
  'PACKAGING',
];

export const GenerationJobSchema = z.object({
  id: z.string(),
  episodeId: z.string(),
  stage: PipelineStage,
  status: StageStatus,
  provider: z.string().optional(),
  task: z.string().optional(),
  costUsd: z.number().nonnegative().default(0),
  createdAt: z.string(),
  finishedAt: z.string().optional(),
  error: z.string().optional(),
});
export type GenerationJob = z.infer<typeof GenerationJobSchema>;

export const COST_CATEGORIES = [
  'research',
  'script',
  'storyboard',
  'voice',
  'images',
  'video',
  'packaging',
] as const;
export const CostCategory = z.enum(COST_CATEGORIES);
export type CostCategory = z.infer<typeof CostCategory>;

export const CostEntrySchema = z.object({
  category: CostCategory,
  provider: z.string(),
  costUsd: z.number().nonnegative(),
  note: z.string().optional(),
  at: z.string(),
});
export type CostEntry = z.infer<typeof CostEntrySchema>;
