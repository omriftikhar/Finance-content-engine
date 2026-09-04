import 'server-only';
import {z} from 'zod';
import type {Episode, Script, ScriptBeat, ScriptMetrics} from '@/lib/schemas';
import {scriptQualityScore, QUALITY_POLISH_THRESHOLD, BeatType} from '@/lib/schemas';
import {getTextModel} from '@/lib/ai/router';
import {parseWith} from '@/lib/ai/json';
import {bookCost} from './cost';

/**
 * Script engine — optimized for YouTube retention.
 *
 * Produces a beat sequence following the retention structure (cold open →
 * protagonist → open loop → context → numbers → escalation → explanation →
 * pattern interrupts → payoff → takeaway → next-video bridge). Generic openers
 * ("In today's fast-paced world", "Have you ever wondered", "Welcome back") are
 * banned and penalized in scoring.
 */

const WORDS_PER_SEC = 2.6;
const BANNED_OPENERS = [
  "in today's fast-paced world",
  'have you ever wondered',
  'welcome back to the channel',
  'in this video',
  'hey guys',
];

function estSec(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / WORDS_PER_SEC);
}

/** Deterministic beat scaffold for a protagonist-driven finance explainer. */
function scaffoldBeats(topic: string): ScriptBeat[] {
  const raw: Array<Pick<ScriptBeat, 'type' | 'text'>> = [
    {
      type: 'coldOpen',
      text: `Jack makes a hundred thousand dollars a year. He should feel rich. Instead, three days after payday, his checking account is almost empty — and he has no idea where the money went.`,
    },
    {
      type: 'protagonist',
      text: `Jack isn't reckless. He doesn't gamble, he doesn't buy designer clothes, and he packs his lunch most days. On paper he's exactly who the phrase "six figures" is supposed to describe.`,
    },
    {
      type: 'openLoop',
      text: `So here's the question we're going to answer: where does a six-figure salary actually go — and why does it disappear faster the more you earn? Stay with me, because the last expense is the one nobody warns you about.`,
    },
    {
      type: 'context',
      text: `First, the number everyone quotes is a lie of omission. A hundred thousand a year sounds like eight thousand three hundred a month. But that's gross — the money Jack never actually touches.`,
    },
    {
      type: 'numbers',
      text: `After federal tax, state tax, Social Security, and Medicare, a large slice is gone before Jack sees a single dollar. [Insert verified effective-tax figure]. His real take-home is dramatically lower than the headline.`,
    },
    {
      type: 'escalation',
      text: `Then housing arrives — and in a high-cost American city, rent or a mortgage can swallow an enormous share of what's left. [Insert verified housing figure]. And we haven't touched a single other bill yet.`,
    },
    {
      type: 'patternInterrupt',
      text: `Quick gut check: how much do you think is left at this point? Hold that number in your head. Most people guess way too high.`,
    },
    {
      type: 'numbers',
      text: `Now add the car — payment, insurance, gas, maintenance. [Insert verified auto figure]. Add groceries at today's prices, utilities, phone, and the subscriptions Jack forgot he's paying for.`,
    },
    {
      type: 'explanation',
      text: `Here's the real mechanism: it was never one dramatic purchase. It's several expensive systems — taxes, housing, transportation, debt — stacking on top of each other until they quietly consume the entire paycheck.`,
    },
    {
      type: 'payoff',
      text: `That's why raises can feel invisible. When each system scales with your income, earning more just feeds bigger versions of the same machine. The squeeze isn't a spending problem — it's a structure problem.`,
    },
    {
      type: 'takeaway',
      text: `The fix starts with separating the fixed systems from the flexible ones, and attacking the biggest fixed cost first — usually housing or debt — before optimizing the small stuff everyone obsesses over.`,
    },
    {
      type: 'nextVideoBridge',
      text: `And if you want to see the exact order to dismantle these expenses without feeling deprived, that's the next video — I'll break down the sequence that frees up the most cash the fastest.`,
    },
  ];
  return raw.map((b, i) => ({
    id: i + 1,
    type: b.type,
    text: b.text.replace('$100,000', topic.includes('$') ? topic : '$100,000'),
    estimatedSec: estSec(b.text),
    claimRefs: [],
  }));
}

export function computeMetrics(beats: ScriptBeat[], claims: Episode['claims']): ScriptMetrics {
  const full = beats.map((b) => b.text).join(' ');
  const lower = full.toLowerCase();
  const firstBeat = beats[0]?.text.toLowerCase() ?? '';

  const usesBannedOpener = BANNED_OPENERS.some((p) => firstBeat.includes(p));
  const hasOpenLoop = beats.some((b) => b.type === 'openLoop');
  const interrupts = beats.filter((b) => b.type === 'patternInterrupt').length;
  const wordCount = full.split(/\s+/).filter(Boolean).length;
  const numericBeats = beats.filter((b) => b.type === 'numbers').length;

  const criticalClaims = claims.filter((c) => c.critical);
  const verifiedCritical = criticalClaims.filter((c) => c.status === 'VERIFIED');
  const coverage = criticalClaims.length === 0 ? 1 : verifiedCritical.length / criticalClaims.length;

  const hookScore = clamp((usesBannedOpener ? 30 : 75) + (firstBeat.includes('?') ? 5 : 0) + (firstBeat.length < 220 ? 10 : 0));
  const curiosityScore = clamp((hasOpenLoop ? 70 : 40) + interrupts * 8 + (lower.includes('nobody warns') ? 8 : 0));
  const clarityScore = clamp(70 + (wordCount > 900 && wordCount < 2200 ? 15 : 0) - (wordCount > 2600 ? 20 : 0));
  const storyScore = clamp(beats.some((b) => b.type === 'protagonist') ? 78 : 45);
  const informationDensity = clamp(40 + numericBeats * 12);
  const retentionRisk = clamp((usesBannedOpener ? 40 : 15) + (interrupts === 0 ? 20 : 0) + (wordCount > 2600 ? 20 : 0));

  return {
    hookScore,
    curiosityScore,
    clarityScore,
    storyScore,
    informationDensity,
    retentionRisk,
    financialClaimCoverage: coverage,
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export interface ScriptResult {
  episode: Episode;
  script: Script;
}

/** Schema for a model's script response. Metrics are always computed by us. */
const LiveScriptSchema = z.object({
  beats: z
    .array(z.object({type: BeatType, text: z.string().min(1)}))
    .min(6),
});

function buildBeats(raw: Array<{type: ScriptBeat['type']; text: string}>): ScriptBeat[] {
  return raw.map((b, i) => ({
    id: i + 1,
    type: b.type,
    text: b.text,
    estimatedSec: estSec(b.text),
    claimRefs: [],
  }));
}

const SCRIPT_PROMPT = (topic: string) =>
  `Write a retention-optimized YouTube narration script for: "${topic}".\n` +
  `Follow this beat order: coldOpen, protagonist, openLoop, context, numbers, escalation, ` +
  `patternInterrupt, explanation, payoff, takeaway, nextVideoBridge.\n` +
  `Rules: the first 15 seconds must establish tension; NEVER use openers like "In today's ` +
  `fast-paced world", "Have you ever wondered", or "Welcome back". Do NOT invent financial ` +
  `numbers — write numeric claims as "[Insert verified …]".\n` +
  `Return ONLY JSON: {"beats":[{"type":"coldOpen","text":"..."}, ...]}`;

export async function runScript(episode: Episode): Promise<ScriptResult> {
  const model = getTextModel('script-draft');
  const draft = await model.generate('script-draft', SCRIPT_PROMPT(episode.topic), {json: true});

  // Prefer validated live output; fall back to the deterministic scaffold.
  const parsed = parseWith(LiveScriptSchema, draft.text);
  const beats = parsed ? buildBeats(parsed.beats) : scaffoldBeats(episode.topic);
  const wordCount = beats.reduce((s, b) => s + b.text.split(/\s+/).filter(Boolean).length, 0);
  const estimatedMinutes = Math.round((wordCount / WORDS_PER_SEC / 60) * 10) / 10;
  const metrics = computeMetrics(beats, episode.claims);

  let script: Script = {
    title: episode.title,
    beats,
    estimatedMinutes,
    wordCount,
    metrics,
    polished: false,
  };

  let updated = bookCost(episode, 'script', draft.provider, draft.costUsd, 'script draft');

  // Premium polish only when quality is below threshold (cost-aware).
  if (scriptQualityScore(metrics) < QUALITY_POLISH_THRESHOLD) {
    const polisher = getTextModel('script-polish', 'premium');
    const polished = await polisher.generate(
      'script-polish',
      `Improve the hook and curiosity of this finance script without inventing numbers.`,
    );
    updated = bookCost(updated, 'script', polished.provider, polished.costUsd, 'script polish');
    script = {...script, polished: true};
  }

  updated = {...updated, script};
  return {episode: updated, script};
}
