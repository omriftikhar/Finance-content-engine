import {z} from 'zod';

/**
 * Script contracts, optimized for YouTube retention.
 *
 * A script is a sequence of typed beats following a retention structure, plus
 * quality metrics used to decide whether a premium polish pass is warranted.
 */

export const BEAT_TYPES = [
  'coldOpen',
  'protagonist',
  'openLoop',
  'context',
  'numbers',
  'escalation',
  'explanation',
  'patternInterrupt',
  'payoff',
  'takeaway',
  'nextVideoBridge',
] as const;
export const BeatType = z.enum(BEAT_TYPES);
export type BeatType = z.infer<typeof BeatType>;

export const ScriptBeatSchema = z.object({
  id: z.number().int().positive(),
  type: BeatType,
  /** The narration text for this beat. */
  text: z.string(),
  /** Approx spoken seconds (est. at ~2.6 words/sec). */
  estimatedSec: z.number().nonnegative().default(0),
  /** Claim IDs referenced in this beat. */
  claimRefs: z.array(z.string()).default([]),
});
export type ScriptBeat = z.infer<typeof ScriptBeatSchema>;

/** 0–100 scores. retentionRisk is inverse (higher = worse). */
export const ScriptMetricsSchema = z.object({
  hookScore: z.number().min(0).max(100),
  clarityScore: z.number().min(0).max(100),
  curiosityScore: z.number().min(0).max(100),
  storyScore: z.number().min(0).max(100),
  informationDensity: z.number().min(0).max(100),
  retentionRisk: z.number().min(0).max(100),
  /** Fraction of numeric claims backed by verified evidence (0–1). */
  financialClaimCoverage: z.number().min(0).max(1),
});
export type ScriptMetrics = z.infer<typeof ScriptMetricsSchema>;

export const ScriptSchema = z.object({
  title: z.string(),
  beats: z.array(ScriptBeatSchema).default([]),
  estimatedMinutes: z.number().nonnegative().default(0),
  wordCount: z.number().int().nonnegative().default(0),
  metrics: ScriptMetricsSchema.optional(),
  /** True once a premium polish pass has run. */
  polished: z.boolean().default(false),
});
export type Script = z.infer<typeof ScriptSchema>;

/** Composite quality score (0–100). Below QUALITY_POLISH_THRESHOLD => polish. */
export function scriptQualityScore(m: ScriptMetrics): number {
  const positives =
    m.hookScore * 0.3 +
    m.curiosityScore * 0.2 +
    m.clarityScore * 0.2 +
    m.storyScore * 0.2 +
    m.informationDensity * 0.1;
  return Math.round(Math.max(0, positives - m.retentionRisk * 0.25));
}

export const QUALITY_POLISH_THRESHOLD = 70;
