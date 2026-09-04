import {z} from 'zod';

/**
 * Storyboard / scene contracts.
 *
 * AI never renders the final video. It emits deterministic, validated scene
 * specifications that the Remotion engine executes. Numbers and text always
 * come from this data — never from a generative video/image model.
 */

export const VISUAL_TYPES = [
  'character',
  'expenseHit',
  'salaryCounter',
  'animatedNumber',
  'barChart',
  'lineChart',
  'comparison',
  'timeline',
  'document',
  'house',
  'car',
  'creditCard',
  'investmentGrowth',
  'map',
  'headline',
  'progressiveList',
  'transition',
] as const;
export const VisualType = z.enum(VISUAL_TYPES);
export type VisualType = z.infer<typeof VisualType>;

export const CHARACTER_EMOTIONS = [
  'neutral',
  'happy',
  'confused',
  'stressed',
  'shocked',
  'thinking',
  'driving',
  'working',
  'checkingBills',
  'celebrating',
] as const;
export const CharacterEmotion = z.enum(CHARACTER_EMOTIONS);
export type CharacterEmotion = z.infer<typeof CharacterEmotion>;

export const TRANSITIONS = ['cut', 'fade', 'slide', 'wipe', 'zoom'] as const;
export const Transition = z.enum(TRANSITIONS);

export const CAMERA_MOVES = ['static', 'slowPushIn', 'slowPullOut', 'pan'] as const;
export const CameraMove = z.enum(CAMERA_MOVES);

export const MUSIC_MOODS = [
  'none',
  'tension',
  'curious',
  'reflective',
  'uplifting',
  'neutral',
] as const;
export const MusicMood = z.enum(MUSIC_MOODS);

export const ChartPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  /** Optional highlight flag for emphasis in the renderer. */
  highlight: z.boolean().optional(),
});
export type ChartPoint = z.infer<typeof ChartPointSchema>;

export const NumberSpecSchema = z.object({
  label: z.string().optional(),
  value: z.number(),
  prefix: z.string().default(''),
  suffix: z.string().default(''),
  /** decimals to display */
  decimals: z.number().int().min(0).max(4).default(0),
});
export type NumberSpec = z.infer<typeof NumberSpecSchema>;

export const ComparisonSideSchema = z.object({
  label: z.string(),
  value: z.number().optional(),
  caption: z.string().optional(),
});

export const SceneSchema = z.object({
  id: z.number().int().positive(),
  durationSec: z.number().positive(),

  /** Spoken narration for this scene (drives TTS + captions). */
  narration: z.string(),
  /** Big on-screen headline. */
  headline: z.string().default(''),
  /** Secondary on-screen text. */
  supportingText: z.string().default(''),

  visualType: VisualType,
  character: z.string().optional(),
  characterEmotion: CharacterEmotion.optional(),
  environment: z.string().optional(),

  /** Numeric callouts (used by animatedNumber / salaryCounter / expenseHit). */
  numbers: z.array(NumberSpecSchema).default([]),
  /** Data for bar/line charts. */
  chartData: z.array(ChartPointSchema).default([]),
  comparison: z.array(ComparisonSideSchema).default([]),

  animation: z.string().default('default'),
  camera: CameraMove.default('static'),
  transition: Transition.default('fade'),
  sfx: z.array(z.string()).default([]),
  musicMood: MusicMood.default('neutral'),

  /** IDs of FinancialClaims this scene depends on. */
  sourceRefs: z.array(z.string()).default([]),
  /** IDs of assets (audio/images) attached to this scene. */
  assetRefs: z.array(z.string()).default([]),

  /** Retention device — marks a deliberate pattern interrupt. */
  patternInterrupt: z.boolean().default(false),
});
export type Scene = z.infer<typeof SceneSchema>;

export const StoryboardSchema = z.object({
  scenes: z.array(SceneSchema).default([]),
});
export type Storyboard = z.infer<typeof StoryboardSchema>;
