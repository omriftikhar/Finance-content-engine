import 'server-only';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import type {Episode, Scene} from '@/lib/schemas';
import {getTTSProvider, isMockTTS} from '@/lib/tts/router';
import {bookCost} from './cost';
import {makeAsset, upsertAsset, attachAssetToScene, findReusable} from '@/lib/assets/manifest';

/**
 * Voice generation stage.
 *
 * Synthesizes narration per scene, stores audio as episode assets, and makes
 * scene durations audio-aware (duration follows narration length). In mock mode
 * no audio bytes are written but durations still update from the estimate.
 */
export interface VoiceResult {
  episode: Episode;
}

export async function runVoice(episode: Episode): Promise<VoiceResult> {
  const tts = getTTSProvider();
  const mock = isMockTTS();
  const audioDir = path.join(process.cwd(), 'data', 'store', 'assets', episode.id, 'audio');
  if (!mock) await fs.mkdir(audioDir, {recursive: true});

  let updated: Episode = episode;
  const newScenes: Scene[] = [];

  for (const scene of episode.scenes) {
    const label = `narration-scene-${scene.id}`;
    const existing = findReusable(updated, 'audio', label);
    if (existing?.durationMs) {
      newScenes.push({...scene, durationSec: Math.max(3, Math.round(existing.durationMs / 1000))});
      continue;
    }

    const result = await tts.synthesize(scene.narration, {format: 'mp3'});

    let localPath: string | undefined;
    if (!mock && result.audio.length > 0) {
      localPath = path.join(audioDir, `${label}.mp3`);
      await fs.writeFile(localPath, result.audio);
    }

    const asset = makeAsset({
      type: 'audio',
      label,
      source: mock ? 'placeholder' : 'generated',
      provider: result.provider,
      costUsd: result.costUsd,
      localPath,
      episodeId: episode.id,
      sceneId: scene.id,
      durationMs: result.durationMs,
      timestamps: result.timestamps.length ? result.timestamps : undefined,
    });

    updated = upsertAsset(updated, asset);
    updated = bookCost(updated, 'voice', result.provider, result.costUsd, label);

    // Audio-aware duration: scene follows narration length (min 3s).
    newScenes.push({
      ...scene,
      durationSec: Math.max(3, Math.round(result.durationMs / 1000)),
      assetRefs: scene.assetRefs.includes(asset.id) ? scene.assetRefs : [...scene.assetRefs, asset.id],
    });
  }

  updated = {...updated, scenes: newScenes};
  // Ensure scene<->asset links are consistent.
  for (const s of newScenes) {
    for (const ref of s.assetRefs) updated = attachAssetToScene(updated, s.id, ref);
  }
  return {episode: updated};
}
