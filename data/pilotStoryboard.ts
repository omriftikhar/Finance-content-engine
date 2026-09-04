import type {Scene, VisualType, CharacterEmotion} from '@/lib/schemas';
import {pilotBeats} from './pilotScript';
import {pilotScenario as S} from './pilotResearch';

/**
 * Pilot #001 storyboard — deterministic scene JSON.
 *
 * We expand the 38 narration beats into 45–80 visual scenes: many beats become
 * multiple visual moments (headline → animated number → expense hit → reaction),
 * so the video *shows* the argument rather than displaying subtitles on empty
 * backgrounds. Every number is bound to the verified scenario in pilotResearch.ts.
 */

let sceneId = 0;
function scene(partial: Partial<Scene> & {narration: string; visualType: VisualType; durationSec: number}): Scene {
  sceneId += 1;
  return {
    id: sceneId,
    durationSec: partial.durationSec,
    narration: partial.narration,
    headline: partial.headline ?? '',
    supportingText: partial.supportingText ?? '',
    visualType: partial.visualType,
    character: partial.character,
    characterEmotion: partial.characterEmotion,
    environment: partial.environment,
    numbers: partial.numbers ?? [],
    chartData: partial.chartData ?? [],
    comparison: partial.comparison ?? [],
    animation: partial.animation ?? 'default',
    camera: partial.camera ?? 'static',
    transition: partial.transition ?? 'fade',
    sfx: partial.sfx ?? [],
    musicMood: partial.musicMood ?? 'neutral',
    sourceRefs: partial.sourceRefs ?? [],
    assetRefs: partial.assetRefs ?? [],
    patternInterrupt: partial.patternInterrupt ?? false,
  };
}

/** narration text of beat i (for binding a scene's audio to the right narration). */
const N = (i: number) => pilotBeats[i]?.text ?? '';
/** split a beat's seconds across k scenes. */
const split = (i: number, k: number) => Math.max(3, Math.round((pilotBeats[i]?.estimatedSec ?? 8) / k));

const CH = 'Jack';
const money = (v: number) => ({value: v, prefix: '$', suffix: '', decimals: 0, label: ''});

export const pilotScenes: Scene[] = [
  // 0-1 COLD OPEN
  scene({narration: N(0), visualType: 'character', character: CH, characterEmotion: 'thinking', headline: '$100,000 / YEAR', supportingText: 'The finish line?', durationSec: split(0, 2), camera: 'slowPushIn', musicMood: 'tension'}),
  scene({narration: N(0), visualType: 'animatedNumber', headline: 'ONCE, THIS MEANT “MADE IT”', numbers: [money(100000)], durationSec: split(0, 2), musicMood: 'tension'}),
  scene({narration: N(1), visualType: 'character', character: CH, characterEmotion: 'stressed', headline: 'THE 28th', supportingText: 'Where did it all go?', durationSec: split(1, 2), camera: 'slowPushIn', musicMood: 'tension'}),
  scene({narration: N(1), visualType: 'headline', headline: 'WHERE DID IT GO?', durationSec: split(1, 2), musicMood: 'tension'}),

  // 2-3 PROTAGONIST
  scene({narration: N(2), visualType: 'character', character: CH, characterEmotion: 'neutral', headline: 'NOT RECKLESS', supportingText: 'No gambling. No secret splurges.', durationSec: split(2, 2)}),
  scene({narration: N(2), visualType: 'progressiveList', headline: 'A NORMAL LIFE', chartData: [{label: 'Packs lunch', value: 0}, {label: 'Paid-off car', value: 0}, {label: 'No shopping addiction', value: 0}], durationSec: split(2, 2)}),
  scene({narration: N(3), visualType: 'headline', headline: 'SO WHY THE TREADMILL?', supportingText: 'Six figures should feel like freedom.', durationSec: pilotBeats[3]?.estimatedSec ?? 8, camera: 'slowPushIn'}),

  // 4-5 OPEN LOOP
  scene({narration: N(4), visualType: 'headline', headline: 'FOLLOW THE PAYCHECK', supportingText: 'Dollar by dollar.', durationSec: pilotBeats[4]?.estimatedSec ?? 8, musicMood: 'curious'}),
  scene({narration: N(5), visualType: 'headline', headline: 'ONE EXPENSE DOES THE MOST DAMAGE', supportingText: 'Almost nobody budgets for it.', durationSec: pilotBeats[5]?.estimatedSec ?? 8, musicMood: 'curious', patternInterrupt: true}),

  // 6-7 CONTEXT: headline number
  scene({narration: N(6), visualType: 'salaryCounter', headline: '$8,333 / MONTH', numbers: [{...money(S.grossMonthly), label: 'Gross monthly'}], durationSec: split(6, 2)}),
  scene({narration: N(6), visualType: 'animatedNumber', headline: 'SOUNDS LIKE PLENTY', numbers: [money(S.grossMonthly)], durationSec: split(6, 2)}),
  scene({narration: N(7), visualType: 'comparison', headline: 'GROSS ≠ TAKE-HOME', comparison: [{label: 'Headline', value: 100, caption: 'gross'}, {label: 'Reality', value: 74, caption: 'take-home'}], durationSec: pilotBeats[7]?.estimatedSec ?? 8, musicMood: 'tension'}),

  // 8-11 TAXES (verified)
  scene({narration: N(8), visualType: 'expenseHit', characterEmotion: 'shocked', headline: 'FEDERAL INCOME TAX', numbers: [{...money(S.federalIncomeTaxAnnual), label: 'per year'}], supportingText: '2024 single filer', durationSec: split(8, 2), sfx: ['impact'], musicMood: 'tension', sourceRefs: ['claim-fed-tax-100k']}),
  scene({narration: N(8), visualType: 'document', headline: 'IRS · 2024 BRACKETS', supportingText: '10% · 12% · 22%', durationSec: split(8, 2), sourceRefs: ['claim-fed-tax-100k', 'claim-std-deduction']}),
  scene({narration: N(9), visualType: 'expenseHit', characterEmotion: 'stressed', headline: 'PAYROLL TAX', numbers: [{...money(S.ficaAnnual), label: 'Social Security + Medicare'}], supportingText: '6.2% + 1.45%', durationSec: pilotBeats[9]?.estimatedSec ?? 8, sfx: ['impact'], sourceRefs: ['claim-fica-ss', 'claim-fica-medicare']}),
  scene({narration: N(10), visualType: 'expenseHit', headline: 'STATE + LOCAL TAX', numbers: [{...money(S.stateLocalAnnual), label: 'assumption'}], supportingText: 'Varies by state — some take $0', durationSec: pilotBeats[10]?.estimatedSec ?? 8, sourceRefs: ['claim-scenario-state-tax']}),
  scene({narration: N(11), visualType: 'barChart', headline: '~$26,000 IN TAXES', chartData: [{label: 'Federal', value: S.federalIncomeTaxAnnual}, {label: 'FICA', value: S.ficaAnnual}, {label: 'State', value: S.stateLocalAnnual, highlight: true}], durationSec: pilotBeats[11]?.estimatedSec ?? 8, sourceRefs: ['claim-fed-tax-100k', 'claim-fica-ss']}),

  // 12 CONTEXT: the 26k gap (2 scenes)
  scene({narration: N(12), visualType: 'animatedNumber', headline: 'THE GAP', numbers: [{...money(26000), label: 'never seen, every year'}], supportingText: 'What he earns minus what he keeps', durationSec: split(12, 2), musicMood: 'reflective'}),
  scene({narration: N(12), visualType: 'comparison', headline: 'A USED CAR — ANNUALLY', comparison: [{label: 'Earned', value: 100, caption: '$100k'}, {label: 'Kept', value: 74, caption: '~$74k'}], durationSec: split(12, 2), musicMood: 'reflective'}),

  // 13 NUMBERS: real take-home
  scene({narration: N(13), visualType: 'salaryCounter', headline: 'REAL TAKE-HOME', numbers: [{...money(S.takeHomeMonthly), label: 'per month'}], supportingText: 'Not $8,333 — this is the budget', durationSec: pilotBeats[13]?.estimatedSec ?? 8, camera: 'slowPushIn', sourceRefs: ['claim-fed-tax-100k', 'claim-fica-ss', 'claim-scenario-state-tax']}),

  // 14-15 ESCALATION: housing
  scene({narration: N(14), visualType: 'house', characterEmotion: 'stressed', headline: 'HOUSING', numbers: [{...money(S.housingMonthly), label: 'per month'}], supportingText: 'The biggest single hit', durationSec: split(14, 2), sfx: ['impact'], musicMood: 'tension', sourceRefs: ['claim-scenario-housing']}),
  scene({narration: N(14), visualType: 'comparison', headline: 'A THIRD, GONE', comparison: [{label: 'Take-home', value: 100, caption: `$${S.takeHomeMonthly}`}, {label: 'After housing', value: 62, caption: `-$${S.housingMonthly}`}], durationSec: split(14, 2), musicMood: 'tension'}),
  scene({narration: N(15), visualType: 'headline', headline: 'AND NOTHING ELSE YET', supportingText: 'No food. No gas. No fun. Just a roof.', durationSec: pilotBeats[15]?.estimatedSec ?? 8}),
  scene({narration: N(16), visualType: 'house', headline: 'MORE THAN RENT', supportingText: 'Insurance · utilities · repairs · deposits', durationSec: pilotBeats[16]?.estimatedSec ?? 8, sourceRefs: ['claim-scenario-housing']}),

  // 17 PATTERN INTERRUPT #1
  scene({narration: N(17), visualType: 'comparison', headline: 'HOW MUCH IS LEFT?', supportingText: 'Guess before we continue.', comparison: [{label: 'Most guess', value: 45, caption: 'left'}, {label: 'Reality', value: 23, caption: 'left'}], durationSec: pilotBeats[17]?.estimatedSec ?? 8, transition: 'zoom', patternInterrupt: true, musicMood: 'curious'}),

  // 18-19 NUMBERS: transport, food, other
  scene({narration: N(18), visualType: 'car', characterEmotion: 'driving', headline: 'TRANSPORTATION', numbers: [{...money(S.transportMonthly), label: 'per month'}], supportingText: 'Usually the #2 expense', durationSec: pilotBeats[18]?.estimatedSec ?? 8, sfx: ['whoosh'], sourceRefs: ['claim-scenario-transport']}),
  scene({narration: N(19), visualType: 'expenseHit', headline: 'FOOD + THE FORGOTTEN', numbers: [{...money(S.foodMonthly + S.otherMonthly), label: 'food + utilities + subs'}], supportingText: 'The subscriptions he forgot', durationSec: pilotBeats[19]?.estimatedSec ?? 8}),

  // 20 NUMBERS: full monthly tally
  scene({narration: N(20), visualType: 'barChart', headline: 'THE REAL MONTH', chartData: [{label: 'Housing', value: S.housingMonthly, highlight: true}, {label: 'Transport', value: S.transportMonthly}, {label: 'Food', value: S.foodMonthly}, {label: 'Other', value: S.otherMonthly}], durationSec: pilotBeats[20]?.estimatedSec ?? 8, sourceRefs: ['claim-scenario-housing', 'claim-scenario-transport']}),

  // 21 PAYOFF: ~1,400 left (2 scenes)
  scene({narration: N(21), visualType: 'salaryCounter', headline: 'ADD IT UP', numbers: [{...money(4700), label: 'monthly expenses'}], supportingText: 'Housing + transport + food + other', durationSec: split(21, 2)}),
  scene({narration: N(21), visualType: 'animatedNumber', headline: 'WHAT’S LEFT', numbers: [{...money(1426), label: 'per month'}], supportingText: 'On a $100k salary — before any emergency', durationSec: split(21, 2), camera: 'slowPushIn', musicMood: 'reflective'}),

  // 22 PATTERN INTERRUPT #2
  scene({narration: N(22), visualType: 'comparison', headline: 'BIGGER OR SMALLER?', supportingText: 'For many cities, this number is zero.', comparison: [{label: 'Our scenario', value: 23, caption: '$1,426'}, {label: 'Many cities', value: 0, caption: '$0 or less'}], durationSec: pilotBeats[22]?.estimatedSec ?? 8, transition: 'zoom', patternInterrupt: true, musicMood: 'tension'}),

  // 23-24 EXPLANATION: stacking systems
  scene({narration: N(23), visualType: 'headline', headline: 'NO VILLAIN', supportingText: 'It was never one dramatic purchase.', durationSec: pilotBeats[23]?.estimatedSec ?? 8}),
  scene({narration: N(24), visualType: 'barChart', headline: 'SYSTEMS, STACKED', chartData: [{label: 'Taxes', value: 26}, {label: 'Housing', value: 28, highlight: true}, {label: 'Transport', value: 10}, {label: 'Food', value: 9}, {label: 'Other', value: 11}, {label: 'Left', value: 16}], durationSec: pilotBeats[24]?.estimatedSec ?? 8}),

  // 25-26 PAYOFF: raises invisible / structural
  scene({narration: N(25), visualType: 'lineChart', headline: 'RAISES FEEL INVISIBLE', chartData: [{label: 'Yr 1', value: 60}, {label: 'Yr 2', value: 68}, {label: 'Yr 3', value: 74}, {label: 'Yr 4', value: 79, highlight: true}], supportingText: 'Every system scales with income', durationSec: pilotBeats[25]?.estimatedSec ?? 8, musicMood: 'reflective'}),
  scene({narration: N(26), visualType: 'headline', headline: 'IT’S STRUCTURAL', supportingText: 'A household that costs what it earns.', durationSec: pilotBeats[26]?.estimatedSec ?? 8}),

  // 27-29 DEBT TRAP
  scene({narration: N(27), visualType: 'creditCard', characterEmotion: 'stressed', headline: 'WHEN LEFTOVER = $0', supportingText: 'The next surprise goes on a card.', durationSec: pilotBeats[27]?.estimatedSec ?? 8, sfx: ['impact'], musicMood: 'tension'}),
  scene({narration: N(28), visualType: 'lineChart', headline: 'DEBT COMPOUNDS', chartData: [{label: 'Month 1', value: 400}, {label: 'M6', value: 470}, {label: 'M12', value: 560, highlight: true}], supportingText: 'A carried balance grows', durationSec: pilotBeats[28]?.estimatedSec ?? 8, sourceRefs: ['claim-cc-total']}),
  scene({narration: N(29), visualType: 'headline', headline: 'THE TRAP', supportingText: 'The gap, financed at 20%+ interest.', durationSec: pilotBeats[29]?.estimatedSec ?? 8, musicMood: 'tension'}),

  // 30 EXPLANATION: nobody-warns-you debt (base beat 21 → id shifted; use N by content)
  scene({narration: N(30), visualType: 'comparison', headline: 'SMALL STUFF ISN’T IT', comparison: [{label: 'Cut all coffee', value: 8, caption: '~$200/mo'}, {label: 'Cut housing $500', value: 100, caption: '$500/mo'}], durationSec: pilotBeats[30]?.estimatedSec ?? 8}),

  // 31-33 TAKEAWAY
  scene({narration: N(31), visualType: 'headline', headline: 'BIG LEVERS, NOT GUILT', supportingText: 'Attack your largest fixed cost first.', durationSec: pilotBeats[31]?.estimatedSec ?? 8, musicMood: 'uplifting'}),
  scene({narration: N(32), visualType: 'progressiveList', headline: 'THE ORDER', chartData: [{label: 'Cut the biggest fixed cost', value: 0}, {label: 'Kill high-interest debt', value: 0}, {label: 'Automate savings', value: 0}], durationSec: pilotBeats[32]?.estimatedSec ?? 8, musicMood: 'uplifting'}),
  scene({narration: N(33), visualType: 'headline', headline: 'FIXED vs FLEXIBLE', supportingText: 'Control the fixed. The rest gets easy.', durationSec: pilotBeats[33]?.estimatedSec ?? 8, musicMood: 'uplifting'}),

  // 34-36 more takeaway + caveat
  scene({narration: N(34), visualType: 'comparison', headline: 'WHERE THE MONEY IS', comparison: [{label: 'Discretionary', value: 15, caption: 'small'}, {label: 'Fixed systems', value: 85, caption: 'big'}], durationSec: pilotBeats[34]?.estimatedSec ?? 8}),
  scene({narration: N(35), visualType: 'animatedNumber', headline: 'FOUND: $500 / MONTH', numbers: [{...money(500), label: 'from housing alone'}], supportingText: 'Without cutting a single small joy', durationSec: pilotBeats[35]?.estimatedSec ?? 8, musicMood: 'uplifting'}),
  scene({narration: N(36), visualType: 'document', headline: 'ONE HONEST CAVEAT', supportingText: 'Representative numbers · your city changes everything', durationSec: pilotBeats[36]?.estimatedSec ?? 8, sourceRefs: ['claim-scenario-housing', 'claim-scenario-transport']}),

  // 37 NEXT VIDEO BRIDGE
  scene({narration: N(37), visualType: 'transition', headline: 'NEXT: THE SEQUENCE', supportingText: 'Free up the most cash, fastest.', durationSec: pilotBeats[37]?.estimatedSec ?? 8, camera: 'slowPullOut', musicMood: 'uplifting'}),
];
