import {z} from 'zod';

/**
 * Channel + episode performance metrics.
 *
 * These are manually entered/imported until the YouTube Analytics API is wired
 * up. Never present invented numbers as real data — absence is represented as
 * undefined, and the UI must label the data source.
 */

export const ChannelMetricsSchema = z.object({
  capturedAt: z.string(),
  subscribers: z.number().nonnegative().default(0),
  watchHours: z.number().nonnegative().default(0),
  videosPublished: z.number().int().nonnegative().default(0),
  views: z.number().nonnegative().default(0),
  impressions: z.number().nonnegative().default(0),
  /** click-through rate as a fraction (0–1) */
  ctr: z.number().min(0).max(1).optional(),
  /** average view duration in seconds */
  avgViewDurationSec: z.number().nonnegative().optional(),
  avgPercentageViewed: z.number().min(0).max(1).optional(),
  subsPer1kViews: z.number().nonnegative().optional(),
  watchHoursPer1kViews: z.number().nonnegative().optional(),
  usAudiencePct: z.number().min(0).max(1).optional(),
  browsePct: z.number().min(0).max(1).optional(),
  suggestedPct: z.number().min(0).max(1).optional(),
  searchPct: z.number().min(0).max(1).optional(),
  /** where the number came from — surfaced in UI so nothing looks auto-real */
  source: z.enum(['manual', 'imported', 'youtube_api']).default('manual'),
});
export type ChannelMetrics = z.infer<typeof ChannelMetricsSchema>;

/** Time-windowed performance snapshot for a single published episode. */
export const EpisodePerfWindowSchema = z.object({
  views: z.number().nonnegative().default(0),
  impressions: z.number().nonnegative().default(0),
  ctr: z.number().min(0).max(1).optional(),
  avgPercentageViewed: z.number().min(0).max(1).optional(),
  subscribersGained: z.number().default(0),
  watchHours: z.number().nonnegative().default(0),
});
export type EpisodePerfWindow = z.infer<typeof EpisodePerfWindowSchema>;

export const EpisodeMetricsSchema = z.object({
  episodeId: z.string(),
  h24: EpisodePerfWindowSchema.optional(),
  h48: EpisodePerfWindowSchema.optional(),
  d7: EpisodePerfWindowSchema.optional(),
  source: z.enum(['manual', 'imported', 'youtube_api']).default('manual'),
});
export type EpisodeMetrics = z.infer<typeof EpisodeMetricsSchema>;

/** Channel monetization targets (YouTube Partner Program). */
export const MONETIZATION_TARGET = {
  subscribers: 1000,
  watchHours: 4000,
};

export interface MonetizationProgress {
  remainingSubscribers: number;
  remainingWatchHours: number;
  /** required subs/day and watch-hours/day to hit target by deadline */
  requiredSubsPerDay: number;
  requiredWatchHoursPerDay: number;
  /** estimated views needed for remaining watch hours at current AVD */
  estimatedViewsForWatchHours: number;
}

export function computeMonetizationProgress(
  m: Pick<ChannelMetrics, 'subscribers' | 'watchHours' | 'avgViewDurationSec'>,
  daysRemaining: number,
): MonetizationProgress {
  const remainingSubscribers = Math.max(0, MONETIZATION_TARGET.subscribers - m.subscribers);
  const remainingWatchHours = Math.max(0, MONETIZATION_TARGET.watchHours - m.watchHours);
  const days = Math.max(1, daysRemaining);
  const avdSec = m.avgViewDurationSec && m.avgViewDurationSec > 0 ? m.avgViewDurationSec : undefined;
  return {
    remainingSubscribers,
    remainingWatchHours,
    requiredSubsPerDay: remainingSubscribers / days,
    requiredWatchHoursPerDay: remainingWatchHours / days,
    estimatedViewsForWatchHours: avdSec
      ? Math.round((remainingWatchHours * 3600) / avdSec)
      : 0,
  };
}
