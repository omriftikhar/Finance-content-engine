/**
 * Disk-safe chunked renderer.
 *
 * Renders the episode in scene-range chunks to separate MP4s (each frees its
 * temp frames before the next), then concatenates them with Remotion's bundled
 * FFmpeg. Keeps peak scratch-disk usage low on constrained machines.
 *
 *   npx tsx --tsconfig tsconfig.worker.json --env-file=.env.local \
 *     worker/render-chunked.ts pilot-100k-broke [scenesPerChunk]
 */
import path from 'node:path';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import {getStore} from '../lib/store';
import {webpackOverride} from '../video/webpack-override';
import type {Episode} from '../lib/schemas';

const FPS = 30;

async function main() {
  const episodeId = process.argv[2] ?? 'pilot-100k-broke';
  const scenesPerChunk = Number(process.argv[3] ?? 10);

  const store = getStore();
  const episode = (await store.get(episodeId)) as Episode | null;
  if (!episode) throw new Error(`Episode ${episodeId} not found`);

  // Build audio + timing maps from assets.
  const audioBySceneId: Record<number, string> = {};
  const timingsBySceneId: Record<number, Array<{text: string; startMs: number; endMs: number}>> = {};
  for (const a of episode.assets) {
    if (a.type === 'audio' && a.sceneId != null && a.localPath) {
      audioBySceneId[a.sceneId] = a.localPath;
      if (a.timestamps?.length) timingsBySceneId[a.sceneId] = a.timestamps;
    }
  }

  // Cumulative frame offsets per scene.
  const frameOf: number[] = [];
  let acc = 0;
  for (const s of episode.scenes) {
    frameOf.push(acc);
    acc += Math.max(1, Math.round(s.durationSec * FPS));
  }
  const totalFrames = acc;

  console.log(`[chunked] ${episode.scenes.length} scenes, ${totalFrames} frames, chunk=${scenesPerChunk} scenes`);
  const serveUrl = await bundle({entryPoint: path.join(process.cwd(), 'video', 'index.ts'), webpackOverride});
  const inputProps = {episode, showCaptions: true, audioBySceneId, timingsBySceneId};
  const composition = await selectComposition({serveUrl, id: 'FinanceEpisode', inputProps});

  const outDir = path.join(process.cwd(), 'out');
  const chunkDir = path.join(outDir, 'chunks');
  await fs.mkdir(chunkDir, {recursive: true});
  const chunkFiles: string[] = [];

  for (let start = 0; start < episode.scenes.length; start += scenesPerChunk) {
    const end = Math.min(start + scenesPerChunk, episode.scenes.length);
    const startFrame = frameOf[start];
    const endFrame = (end < episode.scenes.length ? frameOf[end] : totalFrames) - 1;
    const out = path.join(chunkDir, `chunk-${String(start).padStart(3, '0')}.mp4`);
    const t0 = Date.now();
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: out,
      inputProps,
      frameRange: [startFrame, endFrame],
      concurrency: 2, // keep memory/temp modest
      onProgress: ({progress}) => process.stdout.write(`\r  chunk ${start}-${end} ${(progress * 100).toFixed(0)}%   `),
    });
    process.stdout.write('\n');
    const st = await fs.stat(out);
    console.log(`  chunk scenes ${start}-${end} frames ${startFrame}-${endFrame} -> ${(st.size / 1024 / 1024).toFixed(1)}MB (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    chunkFiles.push(out);
  }

  // Concatenate with Remotion's bundled FFmpeg (concat demuxer).
  const listFile = path.join(chunkDir, 'concat.txt');
  await fs.writeFile(listFile, chunkFiles.map((f) => `file '${f}'`).join('\n'));
  const finalOut = path.join(outDir, `${episodeId}.mp4`);

  const {ffmpeg} = await import('./ffmpeg');
  await ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', finalOut]);

  const st = await fs.stat(finalOut);
  console.log(`\n[chunked] FINAL ${finalOut} ${(st.size / 1024 / 1024).toFixed(1)}MB`);

  // Cleanup chunk temp to reclaim space.
  await fs.rm(chunkDir, {recursive: true, force: true});
  console.log('[chunked] cleaned chunk temp');
  void os;
}

main().catch((e) => {
  console.error('[chunked] FATAL', e);
  process.exit(1);
});
