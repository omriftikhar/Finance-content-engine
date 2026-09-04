/**
 * Remotion render worker.
 *
 * Renders an episode to MP4 using @remotion/bundler + @remotion/renderer. Runs
 * standalone (e.g. on Render) so heavy rendering never blocks the Next server.
 *
 * Usage:
 *   npx tsx worker/render.ts <episodeId>
 *
 * Reads the episode from the file store (or Supabase when configured), renders
 * the FinanceEpisode composition with that episode's props, writes to
 * out/<episodeId>.mp4, and (if R2 is configured) uploads the result.
 */
import path from 'node:path';
import {promises as fs} from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {getStore} from '../lib/store';
import {totalDurationInFrames} from '../video/FinanceEpisode';
import {webpackOverride} from '../video/webpack-override';

async function main() {
  const episodeId = process.argv[2];
  if (!episodeId) {
    console.error('Usage: tsx worker/render.ts <episodeId>');
    process.exit(1);
  }

  const store = getStore();
  const episode = await store.get(episodeId);
  if (!episode) {
    console.error(`Episode ${episodeId} not found`);
    process.exit(1);
  }
  if (episode.scenes.length === 0) {
    console.error('Episode has no scenes — run the storyboard stage first.');
    process.exit(1);
  }

  console.log(`Bundling Remotion project…`);
  const serveUrl = await bundle({
    entryPoint: path.join(process.cwd(), 'video', 'index.ts'),
    webpackOverride,
  });

  const inputProps = {episode, showCaptions: true, audioBySceneId: {}};

  const composition = await selectComposition({
    serveUrl,
    id: 'FinanceEpisode',
    inputProps,
  });

  const outDir = path.join(process.cwd(), 'out');
  await fs.mkdir(outDir, {recursive: true});
  const outputLocation = path.join(outDir, `${episodeId}.mp4`);

  console.log(`Rendering ${totalDurationInFrames(episode)} frames → ${outputLocation}`);
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation,
    inputProps,
    onProgress: ({progress}) => {
      process.stdout.write(`\r  ${(progress * 100).toFixed(1)}%   `);
    },
  });
  console.log(`\nDone: ${outputLocation}`);

  // Optional R2 upload.
  if (process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID) {
    const {uploadFile} = await import('../lib/storage/r2');
    const key = `episodes/${episodeId}/video.mp4`;
    const url = await uploadFile(key, outputLocation, 'video/mp4');
    console.log(`Uploaded to R2: ${url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
