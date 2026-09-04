/**
 * Production Remotion render worker.
 *
 * Flow (matches the Phase-2 spec):
 *   Supabase episode/job  →  fetch episode + storyboard
 *   →  Remotion render (H.264 MP4, FFmpeg-finalized by @remotion/renderer)
 *   →  export publish-package files
 *   →  R2 upload at deterministic paths episodes/{id}/...
 *   →  update episode (video asset + RENDERING complete)
 *
 * The Vercel app never runs this — heavy render/FFmpeg work happens here only.
 *
 * Usage:
 *   npx tsx worker/render.ts <episodeId>          # render one episode
 *   npx tsx worker/render.ts --smoke <episodeId>  # 60-frame smoke render
 */
import path from 'node:path';
import {promises as fs} from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {getStore} from '../lib/store';
import {totalDurationInFrames} from '../video/FinanceEpisode';
import {webpackOverride} from '../video/webpack-override';
import {exportPublishPackage} from '../lib/pipeline/export';
import {markStageRunning, markStageComplete, markStageFailed} from '../lib/pipeline/stateMachine';
import {makeAsset, upsertAsset} from '../lib/assets/manifest';
import {bookCost} from '../lib/pipeline/cost';
import {isR2Configured, episodeKey, uploadFile} from '../lib/storage/r2';
import type {Episode} from '../lib/schemas';

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

function log(msg: string, extra?: Record<string, unknown>) {
  const line = `[worker] ${new Date().toISOString()} ${msg}`;
  if (extra) console.log(line, JSON.stringify(extra));
  else console.log(line);
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      log(`retry ${label} attempt ${i}/${attempts} failed`, {error: (err as Error).message.slice(0, 200)});
      if (i < attempts) await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
  throw lastErr;
}

async function renderEpisode(episodeId: string, smoke: boolean): Promise<void> {
  const store = getStore();
  let episode = await store.get(episodeId);
  if (!episode) throw new Error(`Episode ${episodeId} not found`);
  if (episode.scenes.length === 0) throw new Error('Episode has no scenes — run the storyboard stage first.');

  // Mark RENDERING running + persist.
  episode = markStageRunning(episode, 'RENDERING');
  await store.save(episode);
  log(`rendering episode`, {id: episodeId, scenes: episode.scenes.length, frames: totalDurationInFrames(episode), smoke});

  try {
    // 1) Bundle + select composition.
    const serveUrl = await withRetry('bundle', () =>
      bundle({entryPoint: path.join(process.cwd(), 'video', 'index.ts'), webpackOverride}),
    );
    const inputProps = {episode, showCaptions: true, audioBySceneId: {}};
    const composition = await selectComposition({serveUrl, id: 'FinanceEpisode', inputProps});

    // 2) Render MP4.
    const outDir = path.join(process.cwd(), 'out');
    await fs.mkdir(outDir, {recursive: true});
    const outputLocation = path.join(outDir, `${episodeId}.mp4`);
    const frameRange: [number, number] | undefined = smoke ? [0, 59] : undefined;

    await withRetry('renderMedia', () =>
      renderMedia({
        composition,
        serveUrl,
        codec: 'h264',
        outputLocation,
        inputProps,
        frameRange,
        onProgress: ({progress}) => process.stdout.write(`\r  render ${(progress * 100).toFixed(0)}%   `),
      }),
    );
    process.stdout.write('\n');
    const stat = await fs.stat(outputLocation);
    log(`render complete`, {mp4: outputLocation, kb: Math.round(stat.size / 1024)});

    // 3) Register video asset + book render cost + mark stage complete.
    const asset = makeAsset({
      type: 'video',
      label: 'final-render',
      source: 'generated',
      provider: 'remotion',
      costUsd: 0,
      localPath: outputLocation,
      episodeId,
    });
    episode = upsertAsset(episode, asset);
    episode = bookCost(episode, 'video', 'remotion', 0, 'render');
    episode = markStageComplete(episode, 'RENDERING', 0, 'remotion');
    await store.save(episode);

    // 4) Export publish package (writes exports/{id}/...).
    const pkg = await exportPublishPackage(episode);
    log(`publish package written`, {dir: pkg.dir, files: pkg.files.length, warnings: pkg.warnings.length});

    // 5) Upload artifacts to R2 (deterministic paths) if configured.
    if (isR2Configured()) {
      const uploads: Array<[string, string]> = [[outputLocation, episodeKey(episodeId, 'video.mp4')]];
      for (const f of pkg.files) uploads.push([path.join(pkg.dir, f), episodeKey(episodeId, f)]);
      for (const [local, key] of uploads) {
        const ext = path.extname(local);
        const url = await withRetry(`upload ${key}`, () =>
          uploadFile(key, local, CONTENT_TYPES[ext] ?? 'application/octet-stream'),
        );
        log(`uploaded`, {key, url});
      }
      // Point the video asset at its R2 URL.
      const cfgUrl = episodeKey(episodeId, 'video.mp4');
      episode = upsertAsset(episode, {...asset, storageUrl: `r2://${cfgUrl}`});
      await store.save(episode);
    } else {
      log('R2 not configured — artifacts kept locally in exports/ and out/');
    }

    log(`DONE episode ${episodeId} — stage=${episode.stage}`);
  } catch (err) {
    episode = markStageFailed(episode, 'RENDERING', (err as Error).message);
    await store.save(episode).catch(() => {});
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const smoke = args.includes('--smoke');
  const episodeId = args.find((a) => !a.startsWith('--'));
  if (!episodeId) {
    console.error('Usage: tsx worker/render.ts [--smoke] <episodeId>');
    process.exit(1);
  }
  await renderEpisode(episodeId, smoke);
}

main().catch((err) => {
  log('FATAL', {error: (err as Error).message});
  console.error(err);
  process.exit(1);
});
