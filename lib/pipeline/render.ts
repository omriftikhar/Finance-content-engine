import 'server-only';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {promises as fs} from 'node:fs';
import type {Episode} from '@/lib/schemas';
import {getStore} from '@/lib/store';
import {markStageRunning, markStageComplete, markStageFailed} from './stateMachine';
import {makeAsset, upsertAsset} from '@/lib/assets/manifest';
import {bookCost} from './cost';

/**
 * Render orchestration.
 *
 * Rendering is CPU/RAM-heavy and belongs on the dedicated worker (Render.com),
 * NOT in a serverless function. This module supports two modes:
 *
 *  - Local/self-hosted (RENDER_MODE=local, default off-Vercel): spawn the
 *    Remotion worker as a detached child process and mark the stage running.
 *  - Serverless (Vercel): return `deferred`, instructing the operator to run
 *    `npm run worker:render <id>` on the worker. Nothing hangs the request.
 *
 * When RENDER_WEBHOOK_URL is set, the worker can call back to finalize; for now
 * the local spawn finalizes by polling for the output file.
 */
export interface RenderResult {
  episode: Episode;
  mode: 'local' | 'deferred';
  message: string;
  outputPath?: string;
}

function canRenderInProcess(): boolean {
  // Vercel/serverless: never render in-process.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return false;
  return (process.env.RENDER_MODE ?? 'local') === 'local';
}

export async function startRender(episodeId: string): Promise<RenderResult> {
  const store = getStore();
  const episode = await store.get(episodeId);
  if (!episode) throw new Error(`Episode ${episodeId} not found`);
  if (episode.scenes.length === 0) throw new Error('No storyboard — run the Storyboarding stage first.');

  if (!canRenderInProcess()) {
    const deferred = markStageRunning(episode, 'RENDERING');
    await store.save(deferred);
    return {
      episode: deferred,
      mode: 'deferred',
      message: `Rendering is deferred to the worker. Run: npm run worker:render ${episodeId}`,
    };
  }

  const outDir = path.join(process.cwd(), 'out');
  await fs.mkdir(outDir, {recursive: true});
  const outputPath = path.join(outDir, `${episodeId}.mp4`);

  const running = markStageRunning(episode, 'RENDERING');
  await store.save(running);

  // Spawn the worker detached so the HTTP request returns immediately.
  const child = spawn('npm', ['run', 'worker:render', episodeId], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();

  return {
    episode: running,
    mode: 'local',
    message: 'Render started in the background. Refresh to check status / finalize.',
    outputPath,
  };
}

/**
 * Finalizes a render if the output file now exists: registers the video asset,
 * books render cost, and marks the stage complete. Idempotent.
 */
export async function finalizeRenderIfReady(episodeId: string): Promise<Episode> {
  const store = getStore();
  const episode = await store.get(episodeId);
  if (!episode) throw new Error(`Episode ${episodeId} not found`);

  const outputPath = path.join(process.cwd(), 'out', `${episodeId}.mp4`);
  let exists = false;
  try {
    await fs.access(outputPath);
    exists = true;
  } catch {
    exists = false;
  }

  if (!exists) return episode;
  if (episode.assets.some((a) => a.type === 'video' && a.localPath === outputPath)) return episode;

  const asset = makeAsset({
    type: 'video',
    label: 'final-render',
    source: 'generated',
    provider: 'remotion',
    costUsd: 0,
    localPath: outputPath,
    episodeId,
  });
  let updated = upsertAsset(episode, asset);
  updated = bookCost(updated, 'video', 'remotion', 0, 'render');
  updated = markStageComplete(updated, 'RENDERING', 0, 'remotion');
  return store.save(updated);
}

export async function failRender(episodeId: string, error: string): Promise<Episode> {
  const store = getStore();
  const episode = await store.get(episodeId);
  if (!episode) throw new Error(`Episode ${episodeId} not found`);
  return store.save(markStageFailed(episode, 'RENDERING', error));
}
