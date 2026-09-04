import type {Packaging, TitleCandidate, TitleScores} from '@/lib/schemas';
import {pilotBeats} from './pilotScript';

/**
 * Pilot #001 packaging — titles, thumbnails, description, chapters, shorts.
 * Optimized for CTR + retention + US relevance. Title scores are computed by the
 * same heuristic the packaging engine uses so they're consistent with generated
 * episodes.
 */

function scoreTitle(text: string): {scores: TitleScores; overall: number} {
  const lower = text.toLowerCase();
  const len = text.length;
  const hasNumber = /\d/.test(text);
  const hasUs = /\b(america|american|u\.?s\.?|\$)/i.test(text);
  const clickbaity = ['shocking', 'insane', "you won't believe", 'crazy'].some((w) => lower.includes(w));
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const scores: TitleScores = {
    clarity: clamp(len <= 60 ? 85 : len <= 80 ? 65 : 45),
    curiosity: clamp((/\?|still|why|really/i.test(text) ? 78 : 55) + (hasNumber ? 6 : 0)),
    searchIntent: clamp(hasNumber ? 74 : 55),
    browsePotential: clamp(/\?|still|nobody|why/i.test(text) ? 80 : 60),
    clickbaitRisk: clamp(clickbaity ? 70 : len > 85 ? 40 : 18),
    usRelevance: clamp(hasUs ? 92 : 55),
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

const titleTexts = [
  'Why Americans Making $100,000 Still Feel Broke',
  "$100K a Year — and Still Broke? Here's the Real Math",
  'The Real Reason a Six-Figure Salary Feels Like Nothing',
  'I Followed a $100,000 Paycheck. This Is Where It Goes.',
  'Making $100K and Living Paycheck to Paycheck: The Breakdown',
];

const titles: TitleCandidate[] = titleTexts
  .map((text) => {
    const {scores, overall} = scoreTitle(text);
    return {text, scores, overall};
  })
  .sort((a, b) => b.overall - a.overall);

// Chapters derived from the real script beat structure.
const chapterPlan: Array<{label: string; afterBeatType: string}> = [
  {label: 'The $100K Paradox', afterBeatType: 'coldOpen'},
  {label: 'Gross vs. Take-Home', afterBeatType: 'context'},
  {label: 'Where the Taxes Go', afterBeatType: 'numbers'},
  {label: 'The Housing Hit', afterBeatType: 'escalation'},
  {label: 'How Much Is Actually Left?', afterBeatType: 'patternInterrupt'},
  {label: 'The Stacking Effect', afterBeatType: 'explanation'},
  {label: 'Why Raises Feel Invisible', afterBeatType: 'payoff'},
  {label: 'Where to Start', afterBeatType: 'takeaway'},
  {label: "What's Next", afterBeatType: 'nextVideoBridge'},
];

function buildChapters() {
  const chapters: {startSec: number; label: string}[] = [];
  let t = 0;
  const used = new Set<string>();
  for (const beat of pilotBeats) {
    const plan = chapterPlan.find((c) => c.afterBeatType === beat.type && !used.has(c.label));
    if (plan) {
      chapters.push({startSec: t, label: plan.label});
      used.add(plan.label);
    }
    t += beat.estimatedSec;
  }
  if (chapters.length && chapters[0].startSec !== 0) chapters[0] = {...chapters[0], startSec: 0};
  return chapters;
}

const chapters = buildChapters();

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const description = [
  `A $100,000 salary is supposed to mean you've made it. So why do so many Americans earning six figures still feel broke? We follow one representative paycheck — dollar by dollar — from the headline number down to what's actually left.`,
  ``,
  `This is an educational breakdown, not financial advice. Figures use 2024 federal tax rules; household expenses are a clearly-labeled representative scenario and vary by city, state, and family size.`,
  ``,
  `Chapters:`,
  ...chapters.map((c) => `${fmt(c.startSec)} ${c.label}`),
  ``,
  `Sources: IRS (2024 brackets), SSA/IRS (FICA), BLS Consumer Expenditure Survey, Federal Reserve (G.19), CFPB.`,
].join('\n');

export const pilotPackaging: Packaging = {
  titles,
  thumbnails: [
    {
      mainSubject: 'Man in his 30s staring at a phone showing a near-zero bank balance',
      composition: 'Subject on the left third; bold negative space on the right for text',
      emotion: 'quiet disbelief',
      background: 'Desaturated apartment interior with a soft green rim light',
      primaryVisualConflict: 'A $100K pay stub in one hand, an empty balance on screen',
      text: 'STILL BROKE',
    },
    {
      mainSubject: 'A crisp $100,000 paycheck being pulled apart by labeled hands (TAX, RENT, CAR)',
      composition: 'Centered, symmetrical tug-of-war',
      emotion: 'tension',
      background: 'Deep navy with a single money-green accent',
      primaryVisualConflict: 'One paycheck, four forces pulling it apart',
      text: '$100K → $1,426',
    },
    {
      mainSubject: 'A house, a car and a credit card stacked on a tilting balance scale',
      composition: 'Rule-of-thirds; scale visibly tipping',
      emotion: 'pressure',
      background: 'Warm neutral gradient with subtle grid',
      primaryVisualConflict: 'Fixed costs outweighing the income',
      text: 'THE SQUEEZE',
    },
  ],
  description,
  chapters,
  pinnedComment: `The honest caveat: these are representative numbers for one household in a high-cost area. Change the city or state and every line moves — some of you have it easier, many have it harder. What does YOUR "left over at the end of the month" look like?`,
  keywords: [
    'personal finance',
    'six figure salary',
    'cost of living',
    'middle class squeeze',
    'budgeting',
    'take home pay',
    'inflation',
    'US economy',
    'paycheck to paycheck',
    'money',
  ],
  shorts: [
    {hook: 'You make $100K. Guess how much is actually left after taxes and housing.', sceneRefs: [9, 13, 14], durationSec: 45},
    {hook: 'The $100,000 salary is a lie of omission — here\'s the real take-home.', sceneRefs: [9, 10, 13], durationSec: 40},
    {hook: 'Why your raise disappeared before it even arrived.', sceneRefs: [30, 31], durationSec: 40},
    {hook: 'Cutting coffee won\'t fix this. The math proves it.', sceneRefs: [36, 40], durationSec: 45},
    {hook: 'After taxes, housing, and a car — a six-figure earner has $1,426 left.', sceneRefs: [24, 26], durationSec: 50},
  ],
};
