import 'server-only';
import type {
  Chapter,
  Episode,
  Packaging,
  ShortIdea,
  ThumbnailConcept,
  TitleCandidate,
  TitleScores,
} from '@/lib/schemas';
import {z} from 'zod';
import {getTextModel} from '@/lib/ai/router';
import {parseWith} from '@/lib/ai/json';
import {ThumbnailConceptSchema} from '@/lib/schemas';
import {bookCost} from './cost';

/** Schema for a model's packaging response. Title scores are computed by us. */
const LivePackagingSchema = z.object({
  titles: z.array(z.string().min(3)).min(1).optional(),
  thumbnails: z.array(ThumbnailConceptSchema).min(1).optional(),
  keywords: z.array(z.string()).optional(),
  pinnedComment: z.string().optional(),
});

const PACKAGING_PROMPT = (topic: string) =>
  `Generate YouTube packaging for the video: "${topic}".\n` +
  `Return ONLY JSON with this shape:\n` +
  `{"titles":["5 distinct title candidates"],` +
  `"thumbnails":[{"mainSubject","composition","emotion","background","primaryVisualConflict","text (2-4 words, NOT the title)"}],` +
  `"keywords":["..."],"pinnedComment":"..."}\n` +
  `Titles must be specific and US-relevant; avoid clickbait words. Do not duplicate the title on the thumbnail.`;

/**
 * Packaging engine.
 *
 * Generates title candidates (scored), thumbnail concepts, a description,
 * chapters, a pinned comment, keywords and Shorts extraction ideas. Deterministic
 * in mock mode; a real provider can replace the candidate text while reusing the
 * scoring + assembly logic.
 */

const CLICKBAIT_WORDS = ['shocking', 'insane', 'you won\'t believe', 'crazy', 'secret they'];

function scoreTitle(text: string): {scores: TitleScores; overall: number} {
  const lower = text.toLowerCase();
  const len = text.length;
  const hasNumber = /\d/.test(text);
  const hasUsSignal = /\b(america|american|u\.?s\.?|dollar|\$)/i.test(text);
  const clickbaity = CLICKBAIT_WORDS.some((w) => lower.includes(w));

  const scores: TitleScores = {
    clarity: clamp(len <= 60 ? 85 : len <= 80 ? 65 : 45),
    curiosity: clamp((/\?|still|why|really|actually/i.test(text) ? 75 : 55) + (hasNumber ? 5 : 0)),
    searchIntent: clamp(hasNumber ? 70 : 55),
    browsePotential: clamp((/\?|still|nobody|why/i.test(text) ? 78 : 60)),
    clickbaitRisk: clamp(clickbaity ? 70 : len > 85 ? 40 : 20),
    usRelevance: clamp(hasUsSignal ? 90 : 55),
  };
  const overall = clamp(
    scores.clarity * 0.2 +
      scores.curiosity * 0.25 +
      scores.searchIntent * 0.15 +
      scores.browsePotential * 0.25 +
      scores.usRelevance * 0.15 -
      scores.clickbaitRisk * 0.2,
  );
  return {scores, overall};
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function titleCandidates(topic: string, liveTexts?: string[]): TitleCandidate[] {
  const texts =
    liveTexts && liveTexts.length > 0
      ? liveTexts
      : [
          topic,
          `Why $100K Isn't Enough Anymore in America`,
          `The Real Reason Six-Figure Earners Feel Broke`,
          `$100,000 Salary, Empty Bank Account: Where It Goes`,
          `Making $100K and Still Broke? Here's the Math`,
        ];
  return texts.map((text) => {
    const {scores, overall} = scoreTitle(text);
    return {text, scores, overall};
  }).sort((a, b) => b.overall - a.overall);
}

function thumbnailConcepts(): ThumbnailConcept[] {
  return [
    {
      mainSubject: 'Stressed man holding an empty wallet',
      composition: 'Subject left third, large negative space right for text',
      emotion: 'anxious / defeated',
      background: 'Muted paper-tone with faint receipt texture',
      primaryVisualConflict: 'A $100K pay stub next to a $0 balance',
      text: 'STILL BROKE',
    },
    {
      mainSubject: 'Paycheck being shredded into bills',
      composition: 'Centered, downward money flow',
      emotion: 'alarm',
      background: 'Deep navy with a single green accent',
      primaryVisualConflict: 'Big number shrinking to a small number',
      text: '$100K → $0',
    },
    {
      mainSubject: 'House, car and credit card stacked on a scale',
      composition: 'Rule-of-thirds, scale tipping',
      emotion: 'tension',
      background: 'Warm neutral gradient',
      primaryVisualConflict: 'Fixed costs outweighing income',
      text: 'THE SQUEEZE',
    },
  ];
}

function buildChapters(episode: Episode): Chapter[] {
  const chapters: Chapter[] = [];
  let t = 0;
  const labelForType: Record<string, string> = {
    coldOpen: 'The $100K Paradox',
    context: 'Gross vs Take-Home',
    numbers: 'Where Taxes Go',
    escalation: 'The Housing Hit',
    explanation: 'The Stacking Effect',
    payoff: 'Why Raises Feel Invisible',
    takeaway: 'Where to Start',
    nextVideoBridge: 'What\'s Next',
  };
  const beats = episode.script?.beats ?? [];
  for (const beat of beats) {
    if (labelForType[beat.type] && (chapters.length === 0 || chapters[chapters.length - 1].label !== labelForType[beat.type])) {
      chapters.push({startSec: t, label: labelForType[beat.type]});
    }
    t += beat.estimatedSec;
  }
  // YouTube requires the first chapter to start at 0.
  if (chapters.length && chapters[0].startSec !== 0) chapters[0] = {...chapters[0], startSec: 0};
  return chapters;
}

function buildDescription(episode: Episode, chapters: Chapter[]): string {
  const chapterLines = chapters.map((c) => `${fmtTime(c.startSec)} ${c.label}`).join('\n');
  const sourceLines = episode.sources.map((s) => `• ${s.name}${s.url ? ` — ${s.url}` : ''}`).join('\n');
  return [
    `A six-figure salary is supposed to mean financial comfort. For millions of Americans, it doesn't. Here's exactly where the money goes.`,
    ``,
    `This is an educational breakdown, not financial advice.`,
    ``,
    `Chapters:`,
    chapterLines,
    ``,
    `Sources:`,
    sourceLines,
  ].join('\n');
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function shortsIdeas(episode: Episode): ShortIdea[] {
  const interruptScenes = episode.scenes.filter((s) => s.patternInterrupt).map((s) => s.id);
  const numberScenes = episode.scenes.filter((s) => s.numbers.length || s.chartData.length).map((s) => s.id);
  return [
    {hook: `You make $100K. Guess how much is actually left after taxes and housing.`, sceneRefs: numberScenes.slice(0, 2), durationSec: 45},
    {hook: `The expense nobody warns you about when you get a raise.`, sceneRefs: interruptScenes, durationSec: 40},
    {hook: `Why earning more can make you feel poorer.`, sceneRefs: numberScenes.slice(-2), durationSec: 50},
  ];
}

export interface PackagingResult {
  episode: Episode;
  packaging: Packaging;
}

export async function runPackaging(episode: Episode): Promise<PackagingResult> {
  const model = getTextModel('packaging');
  const res = await model.generate('packaging', PACKAGING_PROMPT(episode.topic), {json: true});

  // Prefer validated live output; fall back to deterministic candidates.
  const live = parseWith(LivePackagingSchema, res.text);

  const titles = titleCandidates(episode.topic, live?.titles); // scored by us regardless
  const thumbnails = live?.thumbnails ?? thumbnailConcepts();
  const chapters = buildChapters(episode);
  const description = buildDescription(episode, chapters);
  const packaging: Packaging = {
    titles,
    thumbnails,
    description,
    chapters,
    pinnedComment:
      live?.pinnedComment ??
      `What surprised you most — the taxes, the housing, or how fast a raise disappears? Drop your number below.`,
    keywords:
      live?.keywords && live.keywords.length > 0
        ? live.keywords
        : ['personal finance', 'middle class', 'cost of living', 'budgeting', 'six figure salary', 'inflation', 'US economy'],
    shorts: shortsIdeas(episode),
  };

  const updated = bookCost(episode, 'packaging', res.provider, res.costUsd, 'packaging');
  return {episode: {...updated, packaging}, packaging};
}
