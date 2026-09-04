import type {Episode, FinancialClaim, ResearchSource, Scene, Script} from '@/lib/schemas';

/**
 * Gold-standard pilot fixture: "Why Americans Making $100,000 Still Feel Broke".
 *
 * This is a realistic, full-length episode used as the demo and Remotion default.
 * IMPORTANT: current financial statistics are NOT invented here. Numeric claims
 * are flagged NEEDS_REVIEW / UNSUPPORTED and their values are placeholders until
 * a human attaches verified evidence. The UI differentiates VERIFIED / NEEDS
 * REVIEW / UNSUPPORTED, and critical unsupported claims block publish approval.
 */

const RETRIEVED = '2026-09-04';

const sources: ResearchSource[] = [
  {id: 'src-irs', name: 'IRS', authority: 'IRS', url: 'https://www.irs.gov', note: 'Federal income-tax brackets and rules', retrievedAt: RETRIEVED},
  {id: 'src-bls', name: 'Bureau of Labor Statistics', authority: 'BLS', url: 'https://www.bls.gov', note: 'Consumer Expenditure Survey; CPI inflation', retrievedAt: RETRIEVED},
  {id: 'src-fed', name: 'Federal Reserve', authority: 'FEDERAL_RESERVE', url: 'https://www.federalreserve.gov', note: 'Consumer credit (G.19); household debt', retrievedAt: RETRIEVED},
  {id: 'src-fred', name: 'FRED (St. Louis Fed)', authority: 'FRED', url: 'https://fred.stlouisfed.org', note: 'Time-series economic data', retrievedAt: RETRIEVED},
  {id: 'src-cfpb', name: 'CFPB', authority: 'CFPB', url: 'https://www.consumerfinance.gov', note: 'Consumer debt burden research', retrievedAt: RETRIEVED},
  {id: 'src-census', name: 'US Census Bureau', authority: 'CENSUS', url: 'https://www.census.gov', note: 'Household income; housing costs', retrievedAt: RETRIEVED},
];

const claims: FinancialClaim[] = [
  {
    id: 'claim-tax',
    text: 'Effective federal + payroll tax on a $100k single filer reduces take-home pay by roughly [FILL]%.',
    unit: '%',
    period: '[FILL year]',
    evidence: [],
    confidence: 0,
    status: 'NEEDS_REVIEW',
    critical: true,
  },
  {
    id: 'claim-housing',
    text: 'Median monthly housing cost in high-cost US metros is approximately $[FILL].',
    unit: 'USD/month',
    period: '[FILL year]',
    evidence: [],
    confidence: 0,
    status: 'NEEDS_REVIEW',
    critical: true,
  },
  {
    id: 'claim-car',
    text: 'Average new-car monthly payment in the US is about $[FILL].',
    unit: 'USD/month',
    period: '[FILL year]',
    evidence: [],
    confidence: 0,
    status: 'UNSUPPORTED',
    critical: true,
  },
  {
    id: 'claim-cc',
    text: 'Total US credit card balances recently reached $[FILL] trillion.',
    unit: 'USD trillion',
    period: '[FILL quarter]',
    evidence: [],
    confidence: 0,
    status: 'UNSUPPORTED',
    critical: true,
  },
  {
    id: 'claim-cpi',
    text: 'Annual US consumer inflation (CPI) was approximately [FILL]%.',
    unit: '%',
    period: '[FILL year]',
    evidence: [],
    confidence: 0,
    status: 'NEEDS_REVIEW',
    critical: false,
  },
];

const script: Script = {
  title: 'Why Americans Making $100,000 Still Feel Broke',
  beats: [
    {id: 1, type: 'coldOpen', text: `Jack makes a hundred thousand dollars a year. He should feel rich. Instead, three days after payday, his checking account is almost empty — and he has no idea where the money went.`, estimatedSec: 12, claimRefs: []},
    {id: 2, type: 'protagonist', text: `Jack isn't reckless. He doesn't gamble, he doesn't buy designer clothes, and he packs his lunch most days. On paper he's exactly who the phrase "six figures" is supposed to describe.`, estimatedSec: 12, claimRefs: []},
    {id: 3, type: 'openLoop', text: `So here's the question we're going to answer: where does a six-figure salary actually go — and why does it disappear faster the more you earn? Stay with me, because the last expense is the one nobody warns you about.`, estimatedSec: 13, claimRefs: []},
    {id: 4, type: 'context', text: `First, the number everyone quotes is a lie of omission. A hundred thousand a year sounds like eight thousand three hundred a month. But that's gross — the money Jack never actually touches.`, estimatedSec: 12, claimRefs: []},
    {id: 5, type: 'numbers', text: `After federal tax, state tax, Social Security, and Medicare, a large slice is gone before Jack sees a single dollar. His real take-home is dramatically lower than the headline.`, estimatedSec: 11, claimRefs: ['claim-tax']},
    {id: 6, type: 'escalation', text: `Then housing arrives — and in a high-cost American city, rent or a mortgage can swallow an enormous share of what's left. And we haven't touched a single other bill yet.`, estimatedSec: 11, claimRefs: ['claim-housing']},
    {id: 7, type: 'patternInterrupt', text: `Quick gut check: how much do you think is left at this point? Hold that number in your head. Most people guess way too high.`, estimatedSec: 9, claimRefs: []},
    {id: 8, type: 'numbers', text: `Now add the car — payment, insurance, gas, maintenance. Add groceries at today's prices, utilities, phone, and the subscriptions Jack forgot he's paying for.`, estimatedSec: 11, claimRefs: ['claim-car']},
    {id: 9, type: 'explanation', text: `Here's the real mechanism: it was never one dramatic purchase. It's several expensive systems — taxes, housing, transportation, debt — stacking on top of each other until they quietly consume the entire paycheck.`, estimatedSec: 13, claimRefs: ['claim-cc']},
    {id: 10, type: 'payoff', text: `That's why raises can feel invisible. When each system scales with your income, earning more just feeds bigger versions of the same machine. The squeeze isn't a spending problem — it's a structure problem.`, estimatedSec: 13, claimRefs: []},
    {id: 11, type: 'takeaway', text: `The fix starts with separating the fixed systems from the flexible ones, and attacking the biggest fixed cost first — usually housing or debt — before optimizing the small stuff everyone obsesses over.`, estimatedSec: 12, claimRefs: []},
    {id: 12, type: 'nextVideoBridge', text: `And if you want to see the exact order to dismantle these expenses without feeling deprived, that's the next video — I'll break down the sequence that frees up the most cash the fastest.`, estimatedSec: 12, claimRefs: []},
  ],
  estimatedMinutes: 9.2,
  wordCount: 360,
  metrics: {
    hookScore: 85,
    clarityScore: 82,
    curiosityScore: 84,
    storyScore: 80,
    informationDensity: 64,
    retentionRisk: 15,
    financialClaimCoverage: 0,
  },
  polished: false,
};

const scenes: Scene[] = [
  {id: 1, durationSec: 12, narration: script.beats[0].text, headline: '$100,000 / YEAR', supportingText: 'So why is the account empty?', visualType: 'character', character: 'Jack', characterEmotion: 'stressed', numbers: [], chartData: [], comparison: [], animation: 'default', camera: 'slowPushIn', transition: 'fade', sfx: [], musicMood: 'tension', sourceRefs: [], assetRefs: [], patternInterrupt: false},
  {id: 2, durationSec: 12, narration: script.beats[1].text, headline: 'MEET JACK', supportingText: 'Not reckless. Still broke.', visualType: 'character', character: 'Jack', characterEmotion: 'neutral', numbers: [], chartData: [], comparison: [], animation: 'default', camera: 'static', transition: 'fade', sfx: [], musicMood: 'neutral', sourceRefs: [], assetRefs: [], patternInterrupt: false},
  {id: 3, durationSec: 13, narration: script.beats[2].text, headline: 'WHERE DOES IT GO?', supportingText: 'The last expense is the one nobody warns you about.', visualType: 'headline', numbers: [], chartData: [], comparison: [], animation: 'default', camera: 'static', transition: 'fade', sfx: [], musicMood: 'curious', sourceRefs: [], assetRefs: [], patternInterrupt: false},
  {id: 4, durationSec: 12, narration: script.beats[3].text, headline: '$8,333 / MONTH', supportingText: 'Gross ≠ take-home', visualType: 'salaryCounter', numbers: [{label: 'Monthly gross', value: 8333, prefix: '$', suffix: '', decimals: 0}], chartData: [], comparison: [], animation: 'default', camera: 'static', transition: 'fade', sfx: [], musicMood: 'neutral', sourceRefs: [], assetRefs: [], patternInterrupt: false},
  {id: 5, durationSec: 11, narration: script.beats[4].text, headline: 'TAXES', supportingText: 'Before a single bill is paid', visualType: 'expenseHit', characterEmotion: 'shocked', numbers: [], chartData: [], comparison: [], animation: 'default', camera: 'static', transition: 'fade', sfx: [], musicMood: 'neutral', sourceRefs: ['claim-tax'], assetRefs: [], patternInterrupt: false},
  {id: 6, durationSec: 11, narration: script.beats[5].text, headline: 'HOUSING', supportingText: 'The biggest fixed cost', visualType: 'house', characterEmotion: 'stressed', numbers: [], chartData: [], comparison: [], animation: 'default', camera: 'static', transition: 'fade', sfx: [], musicMood: 'tension', sourceRefs: ['claim-housing'], assetRefs: [], patternInterrupt: false},
  {id: 7, durationSec: 9, narration: script.beats[6].text, headline: 'HOW MUCH IS LEFT?', supportingText: 'Most people guess too high.', visualType: 'comparison', numbers: [], chartData: [], comparison: [{label: 'People guess', value: 40, caption: 'left over'}, {label: 'Reality', value: 10, caption: 'left over'}], animation: 'default', camera: 'static', transition: 'zoom', sfx: [], musicMood: 'curious', sourceRefs: [], assetRefs: [], patternInterrupt: true},
  {id: 8, durationSec: 11, narration: script.beats[7].text, headline: 'CAR + INSURANCE', supportingText: 'Another large slice disappears', visualType: 'car', characterEmotion: 'driving', numbers: [], chartData: [], comparison: [], animation: 'default', camera: 'static', transition: 'fade', sfx: [], musicMood: 'neutral', sourceRefs: ['claim-car'], assetRefs: [], patternInterrupt: false},
  {id: 9, durationSec: 13, narration: script.beats[8].text, headline: 'THE STACK', supportingText: 'Several systems, one paycheck', visualType: 'barChart', numbers: [], chartData: [{label: 'Taxes', value: 25}, {label: 'Housing', value: 30, highlight: true}, {label: 'Car', value: 12}, {label: 'Food', value: 10}, {label: 'Other', value: 13}, {label: 'Left', value: 10}], comparison: [], animation: 'default', camera: 'static', transition: 'fade', sfx: [], musicMood: 'neutral', sourceRefs: ['claim-cc'], assetRefs: [], patternInterrupt: false},
  {id: 10, durationSec: 13, narration: script.beats[9].text, headline: 'RAISES FEEL INVISIBLE', supportingText: 'Every system scales with income', visualType: 'lineChart', numbers: [], chartData: [{label: 'Yr 1', value: 60}, {label: 'Yr 2', value: 68}, {label: 'Yr 3', value: 74}, {label: 'Yr 4', value: 79, highlight: true}], comparison: [], animation: 'default', camera: 'static', transition: 'fade', sfx: [], musicMood: 'reflective', sourceRefs: [], assetRefs: [], patternInterrupt: false},
  {id: 11, durationSec: 12, narration: script.beats[10].text, headline: 'WHERE TO START', supportingText: 'Attack the biggest fixed cost first', visualType: 'progressiveList', numbers: [], chartData: [{label: 'Cut the biggest fixed cost', value: 0}, {label: 'Kill high-interest debt', value: 0}, {label: 'Automate savings', value: 0}], comparison: [], animation: 'default', camera: 'static', transition: 'fade', sfx: [], musicMood: 'uplifting', sourceRefs: [], assetRefs: [], patternInterrupt: false},
  {id: 12, durationSec: 12, narration: script.beats[11].text, headline: 'NEXT: THE SEQUENCE', supportingText: 'Free up the most cash, fastest', visualType: 'transition', numbers: [], chartData: [], comparison: [], animation: 'default', camera: 'static', transition: 'fade', sfx: [], musicMood: 'uplifting', sourceRefs: [], assetRefs: [], patternInterrupt: false},
];

export const pilotEpisode: Episode = {
  id: 'pilot-100k-broke',
  topic: 'Why Americans Making $100,000 Still Feel Broke',
  title: 'Why Americans Making $100,000 Still Feel Broke',
  hook: 'A six-figure salary sounds rich—until taxes, housing, cars, insurance and everyday life start taking their cut.',
  targetMinutes: 9,
  createdAt: '2026-09-04T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
  stage: 'SCRIPT_REVIEW',
  stages: {
    RESEARCHING: {stage: 'RESEARCHING', status: 'complete', costUsd: 0, attempts: 1},
    RESEARCH_REVIEW: {stage: 'RESEARCH_REVIEW', status: 'awaiting_review', costUsd: 0, attempts: 0},
    SCRIPTING: {stage: 'SCRIPTING', status: 'complete', costUsd: 0, attempts: 1},
  },
  sources,
  claims,
  script,
  scenes,
  assets: [],
  costs: [],
  estimatedCostUsd: 0,
  approved: false,
};
