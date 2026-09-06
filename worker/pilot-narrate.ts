/**
 * Generate full narration for Pilot #001 and align scene timing to real audio.
 *
 * For each scene: synthesize narration via the configured TTS provider/voice,
 * write the MP3 into public/narration/<episodeId>/ (so Remotion staticFile can
 * load it at render time), record real duration + any word timings on an audio
 * Asset, and set the scene's durationSec from the actual audio length so the
 * narration becomes the master timeline.
 *
 *   npx tsx --tsconfig tsconfig.worker.json --env-file=.env.local worker/pilot-narrate.ts
 */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {getStore} from '../lib/store';
import {pilotEpisode} from '../data/pilot';
import {getTTSProvider, isMockTTS} from '../lib/tts/router';
import {makeAsset, upsertAsset} from '../lib/assets/manifest';
import {bookCost} from '../lib/pipeline/cost';
import {markStageComplete} from '../lib/pipeline/stateMachine';
import type {Episode, Scene} from '../lib/schemas';

async function main() {
  const store = getStore();
  // Ensure the pilot exists in the store (seed from fixture if needed).
  let episode = (await store.get(pilotEpisode.id)) ?? (await store.save(pilotEpisode));

  const tts = getTTSProvider();
  if (isMockTTS()) {
    console.error('TTS is in mock mode — set TTS_PROVIDER + credentials to generate real audio.');
    process.exit(1);
  }
  const voice = process.env.SONIOX_TTS_VOICE ?? process.env.MINIMAX_TTS_VOICE;
  console.log(`[narrate] provider=${tts.name} voice=${voice} scenes=${episode.scenes.length}`);

  const publicDir = path.join(process.cwd(), 'public', 'narration', episode.id);
  await fs.mkdir(publicDir, {recursive: true});

  const newScenes: Scene[] = [];
  let working: Episode = episode;
  let totalCost = 0;
  let totalMs = 0;

  for (const scene of episode.scenes) {
    const label = `narration-scene-${scene.id}`;
    const rel = `narration/${episode.id}/${label}.mp3`;
    const abs = path.join(publicDir, `${label}.mp3`);
    const started = Date.now();

    // Resume support: skip scenes already rendered on a previous (interrupted) run.
    const prior = await fs.stat(abs).catch(() => null);
    if (prior && prior.size > 1000) {
      const existingAsset = working.assets.find((a) => a.label === label);
      const durMs = existingAsset?.durationMs ?? 8000;
      newScenes.push({
        ...scene,
        durationSec: Math.max(2, durMs / 1000 + 0.4),
        assetRefs: existingAsset ? [...new Set([...scene.assetRefs, existingAsset.id])] : scene.assetRefs,
      });
      console.log(`  scene ${String(scene.id).padStart(2)}  (cached ${(durMs / 1000).toFixed(1)}s)`);
      continue;
    }

    // Per-scene retry loop tolerant of a slow/jittery connection.
    let result: Awaited<ReturnType<typeof tts.synthesize>> | null = null;
    for (let attempt = 1; attempt <= 5 && !result; attempt++) {
      try {
        result = await tts.synthesize(scene.narration, {voice, format: 'mp3'});
      } catch (err) {
        console.log(`  scene ${scene.id} attempt ${attempt}/5 failed: ${(err as Error).message.slice(0, 80)}`);
        if (attempt === 5) throw err;
        await new Promise((r) => setTimeout(r, 3000 * attempt)); // 3s,6s,9s,12s
      }
    }
    if (!result) throw new Error(`scene ${scene.id} produced no audio`);
    await fs.writeFile(abs, result.audio);

    const asset = makeAsset({
      type: 'audio',
      label,
      source: 'generated',
      provider: result.provider,
      costUsd: result.estimatedCostUsd,
      localPath: rel, // public-relative path for Remotion staticFile()
      episodeId: episode.id,
      sceneId: scene.id,
      durationMs: result.durationMs,
      timestamps: result.timestamps.length ? result.timestamps : undefined,
    });
    working = upsertAsset(working, asset);
    working = bookCost(working, 'voice', result.provider, result.estimatedCostUsd, label);
    totalCost += result.estimatedCostUsd;
    totalMs += result.durationMs;

    // Narration is the master timeline: scene length = audio length (+0.4s pad).
    newScenes.push({
      ...scene,
      durationSec: Math.max(2, result.durationMs / 1000 + 0.4),
      assetRefs: scene.assetRefs.includes(asset.id) ? scene.assetRefs : [...scene.assetRefs, asset.id],
    });
    console.log(
      `  scene ${String(scene.id).padStart(2)}  ${(result.durationMs / 1000).toFixed(1)}s  ${(result.audio.length / 1024) | 0}KB  $${result.estimatedCostUsd.toFixed(5)}  (${Date.now() - started}ms)`,
    );
  }

  working = {...working, scenes: newScenes};
  working = markStageComplete(working, 'VOICE_GENERATION', totalCost, tts.name);
  await store.save(working);

  console.log(
    `\n[narrate] DONE ${newScenes.length} scenes | total audio ${(totalMs / 1000 / 60).toFixed(1)} min | cost $${totalCost.toFixed(4)} | stage ${working.stage}`,
  );
  console.log(`[narrate] audio in public/narration/${episode.id}/`);
}

main().catch((e) => {
  console.error('[narrate] FATAL', e);
  process.exit(1);
});
