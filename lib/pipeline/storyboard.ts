import 'server-only';
import type {Episode, Scene, ScriptBeat, VisualType, CharacterEmotion} from '@/lib/schemas';
import {getTextModel} from '@/lib/ai/router';
import {bookCost} from './cost';

/**
 * Storyboard engine.
 *
 * Deterministically maps retention beats onto rich, validated scenes bound to
 * the Remotion visual system. No generative video/image model touches numbers
 * or text — those come from claim data and are rendered by deterministic
 * components.
 */

interface BeatVisual {
  visualType: VisualType;
  characterEmotion?: CharacterEmotion;
  headline: string;
  supportingText: string;
  patternInterrupt?: boolean;
}

const CHARACTER = 'Jack';

function visualForBeat(beat: ScriptBeat): BeatVisual {
  switch (beat.type) {
    case 'coldOpen':
      return {visualType: 'character', characterEmotion: 'stressed', headline: '$100,000 / YEAR', supportingText: 'So why is the account empty?'};
    case 'protagonist':
      return {visualType: 'character', characterEmotion: 'neutral', headline: 'MEET JACK', supportingText: 'Not reckless. Still broke.'};
    case 'openLoop':
      return {visualType: 'headline', headline: 'WHERE DOES IT GO?', supportingText: 'The last expense is the one nobody warns you about.'};
    case 'context':
      return {visualType: 'salaryCounter', headline: '$8,333 / MONTH', supportingText: 'Gross ≠ take-home'};
    case 'numbers':
      return {visualType: 'expenseHit', characterEmotion: 'shocked', headline: 'TAXES', supportingText: 'Before a single bill is paid'};
    case 'escalation':
      return {visualType: 'house', characterEmotion: 'stressed', headline: 'HOUSING', supportingText: 'The biggest fixed cost'};
    case 'patternInterrupt':
      return {visualType: 'comparison', headline: 'HOW MUCH IS LEFT?', supportingText: 'Most people guess too high.', patternInterrupt: true};
    case 'explanation':
      return {visualType: 'barChart', headline: 'THE STACK', supportingText: 'Several systems, one paycheck'};
    case 'payoff':
      return {visualType: 'lineChart', headline: 'RAISES FEEL INVISIBLE', supportingText: 'Every system scales with income'};
    case 'takeaway':
      return {visualType: 'progressiveList', headline: 'WHERE TO START', supportingText: 'Attack the biggest fixed cost first'};
    case 'nextVideoBridge':
      return {visualType: 'transition', headline: 'NEXT: THE SEQUENCE', supportingText: 'Free up the most cash, fastest'};
    default:
      return {visualType: 'headline', headline: String(beat.type).toUpperCase(), supportingText: ''};
  }
}

/** Build placeholder chart/number data flagged as needing verified claims. */
function dataForBeat(beat: ScriptBeat, visual: BeatVisual): Partial<Scene> {
  if (visual.visualType === 'salaryCounter') {
    return {numbers: [{label: 'Monthly gross', value: 8333, prefix: '$', suffix: '', decimals: 0}]};
  }
  if (visual.visualType === 'barChart') {
    // Placeholder proportions — real values require verified claims.
    return {
      chartData: [
        {label: 'Taxes', value: 25},
        {label: 'Housing', value: 30, highlight: true},
        {label: 'Car', value: 12},
        {label: 'Food', value: 10},
        {label: 'Other', value: 13},
        {label: 'Left', value: 10},
      ],
    };
  }
  if (visual.visualType === 'lineChart') {
    return {
      chartData: [
        {label: 'Yr 1', value: 60},
        {label: 'Yr 2', value: 68},
        {label: 'Yr 3', value: 74},
        {label: 'Yr 4', value: 79, highlight: true},
      ],
    };
  }
  if (visual.visualType === 'comparison') {
    return {
      comparison: [
        {label: 'People guess', value: 40, caption: 'left over'},
        {label: 'Reality', value: 10, caption: 'left over'},
      ],
    };
  }
  return {};
}

export interface StoryboardResult {
  episode: Episode;
  scenes: Scene[];
}

export async function runStoryboard(episode: Episode): Promise<StoryboardResult> {
  const beats = episode.script?.beats ?? [];
  const model = getTextModel('scene-plan');
  const res = await model.generate(
    'scene-plan',
    `Map these ${beats.length} narration beats to deterministic finance scene specs. ` +
      `Choose a visualType per beat; never place invented numbers in text.`,
  );

  // Map every critical claim onto the scenes most likely to reference it so the
  // renderer/QA can trace which scenes depend on unverified figures.
  const criticalClaimIds = episode.claims.filter((c) => c.critical).map((c) => c.id);

  const scenes: Scene[] = beats.map((beat, i) => {
    const visual = visualForBeat(beat);
    const data = dataForBeat(beat, visual);
    const refsThisScene =
      beat.type === 'numbers' || beat.type === 'escalation' || beat.type === 'explanation'
        ? criticalClaimIds
        : [];
    return {
      id: i + 1,
      durationSec: Math.max(5, beat.estimatedSec || 8),
      narration: beat.text,
      headline: visual.headline,
      supportingText: visual.supportingText,
      visualType: visual.visualType,
      character: visual.visualType === 'character' ? CHARACTER : undefined,
      characterEmotion: visual.characterEmotion,
      environment: undefined,
      numbers: data.numbers ?? [],
      chartData: data.chartData ?? [],
      comparison: data.comparison ?? [],
      animation: 'default',
      camera: beat.type === 'coldOpen' ? 'slowPushIn' : 'static',
      transition: beat.type === 'patternInterrupt' ? 'zoom' : 'fade',
      sfx: [],
      musicMood:
        beat.type === 'coldOpen' || beat.type === 'escalation'
          ? 'tension'
          : beat.type === 'payoff' || beat.type === 'takeaway'
            ? 'uplifting'
            : 'neutral',
      sourceRefs: refsThisScene,
      assetRefs: [],
      patternInterrupt: Boolean(visual.patternInterrupt),
    };
  });

  const updated = bookCost(episode, 'storyboard', res.provider, res.costUsd, 'storyboard');
  return {episode: {...updated, scenes}, scenes};
}
