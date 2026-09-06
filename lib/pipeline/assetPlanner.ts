import type {Episode, Scene} from '@/lib/schemas';
import type {AssetPlan, AssetPlanItem, VisualPrompt} from '@/lib/schemas/visual';

/**
 * Asset Planner.
 *
 * Decides HOW each storyboard beat is visualized so we DON'T generate an image
 * for every beat (cost + character-consistency control). Heuristics:
 *   - character / house / car / establishing beats  -> ai_environment (cinematic)
 *   - barChart / lineChart                           -> data_viz (Remotion)
 *   - document                                       -> source_document (Remotion)
 *   - salaryCounter / animatedNumber / expenseHit    -> remotion_motion
 *   - headline / transition                          -> typography
 *   - repeats of an environment already planned      -> reuse_asset
 *
 * The result lists exactly which beats need paid AI generation.
 */

const JACK = 'Jack, a 30s American man, short dark hair, light stubble, navy jacket over a white shirt, tan chinos — consistent across every scene';

const ENV_BY_VISUAL: Record<string, string> = {
  character: 'suburban-home-interior',
  house: 'american-suburban-house-exterior',
  car: 'car-interior-commute-highway',
  creditCard: 'kitchen-table-bills',
};

function envPrompt(scene: Scene, environment: string): VisualPrompt {
  const base: Record<string, string> = {
    'suburban-home-interior':
      'Cinematic photoreal illustration: Jack standing in a warm, modern American living room at dusk, large window with a suburban street beyond, soft lamplight, shallow depth of field, film grain, moody teal-and-amber grade, no text',
    'american-suburban-house-exterior':
      'Cinematic photoreal illustration: a modest two-story American suburban house at golden hour, driveway and lawn, Jack walking toward the front door with a bag, atmospheric depth, cinematic lighting, no text',
    'car-interior-commute-highway':
      'Cinematic photoreal illustration: Jack driving on an American highway at dusk seen from the passenger side, dashboard glow, blurred traffic and overpass lights, motion, shallow depth of field, cinematic grade, no text',
    'kitchen-table-bills':
      'Cinematic photoreal illustration: Jack at a kitchen table late evening, a small stack of paper bills and a laptop, warm overhead light, concerned mood, shallow depth of field, cinematic, no text',
  };
  return {
    visualPrompt: `${base[environment] ?? base['suburban-home-interior']}. Character: ${JACK}.`,
    environment,
    framing: scene.visualType === 'house' ? 'establishing' : 'wide',
    characterReference: 'assets/style-test/jack-home-hero-v1.png',
    requiredLayers: ['background', 'character', 'overlay'],
    negativePrompt:
      'text, words, numbers, captions, charts, graphs, ui, dashboard, watermark, logo, deformed face, extra fingers, low quality',
    continuity: 'Same Jack identity, wardrobe and lighting palette across all scenes; dusk/evening warmth.',
    aspect: '16:9',
  };
}

function strategyFor(scene: Scene): AssetPlanItem {
  const vt = scene.visualType;
  if (vt === 'barChart' || vt === 'lineChart' || vt === 'comparison' || vt === 'investmentGrowth') {
    return {sceneId: scene.id, strategy: 'data_viz', reason: `${vt} rendered as animated Remotion chart`, estimatedCostUsd: 0};
  }
  if (vt === 'document') {
    return {sceneId: scene.id, strategy: 'source_document', reason: 'source/document visualization in Remotion', estimatedCostUsd: 0};
  }
  if (vt === 'salaryCounter' || vt === 'animatedNumber' || vt === 'expenseHit' || vt === 'progressiveList') {
    return {sceneId: scene.id, strategy: 'remotion_motion', reason: `${vt} is deterministic motion graphics`, estimatedCostUsd: 0};
  }
  if (vt === 'headline' || vt === 'transition') {
    return {sceneId: scene.id, strategy: 'typography', reason: 'typographic/transition beat', estimatedCostUsd: 0};
  }
  // character / house / car / creditCard -> cinematic environment
  const environment = ENV_BY_VISUAL[vt] ?? 'suburban-home-interior';
  return {
    sceneId: scene.id,
    strategy: 'ai_environment',
    prompt: envPrompt(scene, environment),
    reason: `${vt} needs a cinematic ${environment} plate`,
    estimatedCostUsd: Number(process.env.OPENAI_IMAGE_COST ?? process.env.REPLICATE_IMAGE_COST ?? 0.04),
  };
}

export function planAssets(episode: Episode, costPerImage = 0.04): AssetPlan {
  const seenEnv = new Map<string, number>(); // environment -> first sceneId
  const items: AssetPlanItem[] = episode.scenes.map((scene) => {
    const item = strategyFor(scene);
    if (item.strategy === 'ai_environment' && item.prompt) {
      const env = item.prompt.environment;
      if (seenEnv.has(env)) {
        // Reuse the earlier plate for the same environment (cost + consistency).
        return {
          sceneId: scene.id,
          strategy: 'reuse_asset',
          reuseKey: `env:${env}`,
          reason: `reuses ${env} plate from scene ${seenEnv.get(env)}`,
          estimatedCostUsd: 0,
        };
      }
      seenEnv.set(env, scene.id);
    }
    return item;
  });

  const aiItems = items.filter((i) => i.strategy === 'ai_environment');
  return {
    episodeId: episode.id,
    items,
    aiGenerationCount: aiItems.length,
    estimatedTotalCostUsd: Number((aiItems.length * costPerImage).toFixed(4)),
  };
}
