import {z} from 'zod';

/** YouTube packaging contracts: titles, thumbnails, description, chapters, shorts. */

export const TitleScoresSchema = z.object({
  clarity: z.number().min(0).max(100),
  curiosity: z.number().min(0).max(100),
  searchIntent: z.number().min(0).max(100),
  browsePotential: z.number().min(0).max(100),
  clickbaitRisk: z.number().min(0).max(100),
  usRelevance: z.number().min(0).max(100),
});
export type TitleScores = z.infer<typeof TitleScoresSchema>;

export const TitleCandidateSchema = z.object({
  text: z.string(),
  scores: TitleScoresSchema,
  /** Composite 0–100 used for default ranking. */
  overall: z.number().min(0).max(100),
});
export type TitleCandidate = z.infer<typeof TitleCandidateSchema>;

export const ThumbnailConceptSchema = z.object({
  mainSubject: z.string(),
  composition: z.string(),
  emotion: z.string(),
  background: z.string(),
  primaryVisualConflict: z.string(),
  /** 2–4 words maximum — must NOT duplicate the title. */
  text: z.string(),
});
export type ThumbnailConcept = z.infer<typeof ThumbnailConceptSchema>;

export const ChapterSchema = z.object({
  /** seconds from start */
  startSec: z.number().nonnegative(),
  label: z.string(),
});
export type Chapter = z.infer<typeof ChapterSchema>;

export const ShortIdeaSchema = z.object({
  hook: z.string(),
  /** scene ids in the main video this short is extracted from */
  sceneRefs: z.array(z.number()).default([]),
  durationSec: z.number().positive().default(45),
});
export type ShortIdea = z.infer<typeof ShortIdeaSchema>;

export const PackagingSchema = z.object({
  titles: z.array(TitleCandidateSchema).default([]),
  thumbnails: z.array(ThumbnailConceptSchema).default([]),
  description: z.string().default(''),
  chapters: z.array(ChapterSchema).default([]),
  pinnedComment: z.string().default(''),
  keywords: z.array(z.string()).default([]),
  shorts: z.array(ShortIdeaSchema).default([]),
});
export type Packaging = z.infer<typeof PackagingSchema>;
