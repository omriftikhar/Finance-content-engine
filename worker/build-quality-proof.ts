/**
 * Assemble pilot-001-quality-proof.mp4:
 *   1. (video already rendered to out/proof-video.mp4 with narration audio)
 *   2. generate license-clean SFX + music bed
 *   3. mix narration (from video) + music (low) + story-timed SFX + loudnorm
 *   4. mux mixed audio back onto the video
 *
 *   npx tsx --tsconfig tsconfig.worker.json worker/build-quality-proof.ts
 */
import path from 'node:path';
import {promises as fs} from 'node:fs';
import {writeSfx, writeMusic} from './audio/synth';
import {ffmpeg} from './ffmpeg';
import {mixAudio, type SfxEvent} from './audio/mix';

const VIDEO = 'out/proof-video.mp4';
const FINAL = 'out/pilot-001-quality-proof.mp4';

/** Beat boundaries in seconds (cumulative) matching QualityProof.tsx. */
const B = [0, 9.6, 21.5, 34.6, 50.8, 62.7, 75.7];

async function main() {
  const lib = path.join(process.cwd(), 'data', 'audio-lib');
  const sfx = await writeSfx(path.join(lib, 'sfx'));
  const music = await writeMusic(path.join(lib, 'music'), 'documentary', 92000);
  console.log('[proof] audio library ready');

  // Extract narration track from the rendered video (WAV for mixing).
  const narr = 'out/proof-narration.wav';
  await ffmpeg(['-y', '-i', VIDEO, '-vn', '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', narr]);

  // Story-timed SFX events (ms).
  const ev: SfxEvent[] = [
    {file: sfx.money_in, atMs: 400, gainDb: -10}, // salary reveal
    {file: sfx.counter, atMs: 9800, gainDb: -16}, // monthly counter
    {file: sfx.money_out, atMs: 10600, gainDb: -12},
    {file: sfx.impact_soft, atMs: 22700, gainDb: -8}, // federal tax
    {file: sfx.impact_soft, atMs: 23900, gainDb: -8}, // fica
    {file: sfx.impact_soft, atMs: 25100, gainDb: -8}, // state
    {file: sfx.impact_heavy, atMs: 35900, gainDb: -5}, // housing (big)
    {file: sfx.card_swipe, atMs: 51000, gainDb: -9}, // car
    {file: sfx.failure, atMs: 63300, gainDb: -8}, // balance collapse
    {file: sfx.riser, atMs: 77000, gainDb: -12}, // open-loop riser
    {file: sfx.whoosh, atMs: 75700, gainDb: -12}, // transition into question
  ];

  // Mix to a single AAC track.
  const mixed = 'out/proof-mixed.m4a';
  await mixAudio({
    narrationFile: narr,
    musicFile: music,
    sfx: ev,
    out: mixed,
    narrationGainDb: 0,
    musicGainDb: -19, // narration-safe bed
    targetLufs: -14,
  });
  console.log('[proof] audio mixed + normalized');

  // Mux mixed audio onto the video (copy video, replace audio).
  await ffmpeg([
    '-y',
    '-i',
    VIDEO,
    '-i',
    mixed,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    FINAL,
  ]);

  // Cleanup intermediates.
  await fs.rm(narr, {force: true});
  await fs.rm(mixed, {force: true});

  const st = await fs.stat(FINAL);
  console.log(`[proof] FINAL ${FINAL} ${(st.size / 1024 / 1024).toFixed(1)}MB`);
  void B;
}

main().catch((e) => {
  console.error('[proof] FATAL', e);
  process.exit(1);
});
