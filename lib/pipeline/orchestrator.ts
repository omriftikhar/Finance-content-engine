import 'server-only';
import type {Episode, PipelineStage} from '@/lib/schemas';
import {uuid, nowIso} from '@/lib/util/id';
import {getStore} from '@/lib/store';
import {
  markStageComplete,
  markStageFailed,
  markStageRunning,
  approveReview,
  RUNNABLE_STAGES,
} from './stateMachine';
import {runResearch} from './research';
import {runScript} from './script';
import {runStoryboard} from './storyboard';
import {runVoice} from './voice';
import {runPackaging} from './packaging';
import {checkBudget} from './cost';

/**
 * Pipeline orchestrator.
 *
 * Runs one automated stage at a time, updating the state machine and persisting
 * the result. Any stage can be regenerated in isolation (regenerate) and failed
 * stages can be retried. Rendering is delegated to the Render worker; here it is
 * marked awaiting the external render job.
 */

export function createEpisode(topic: string, targetMinutes = 9): Episode {
  const now = nowIso();
  return {
    id: uuid(),
    topic,
    title: topic,
    hook: '',
    targetMinutes,
    createdAt: now,
    updatedAt: now,
    stage: 'IDEA',
    stages: {},
    sources: [],
    claims: [],
    scenes: [],
    assets: [],
    costs: [],
    estimatedCostUsd: 0,
    approved: false,
  };
}

export {RUNNABLE_STAGES};

async function execute(stage: PipelineStage, episode: Episode): Promise<Episode> {
  switch (stage) {
    case 'RESEARCHING':
      return (await runResearch(episode)).episode;
    case 'SCRIPTING':
      return (await runScript(episode)).episode;
    case 'STORYBOARDING':
      return (await runStoryboard(episode)).episode;
    case 'VOICE_GENERATION':
      return (await runVoice(episode)).episode;
    case 'PACKAGING':
      return (await runPackaging(episode)).episode;
    default:
      throw new Error(`Stage ${stage} is not directly runnable by the orchestrator.`);
  }
}

export interface RunStageResult {
  episode: Episode;
  budgetWarning?: string;
}

/**
 * Runs a single stage: budget-check → mark running → execute → mark complete
 * (or failed) → persist. Works for both first-run and regeneration.
 */
export async function runStage(episodeId: string, stage: PipelineStage): Promise<RunStageResult> {
  const store = getStore();
  const loaded = await store.get(episodeId);
  if (!loaded) throw new Error(`Episode ${episodeId} not found`);
  if (!RUNNABLE_STAGES.includes(stage)) {
    throw new Error(`Stage ${stage} cannot be executed here (external or review stage).`);
  }

  // Budget pre-check (rough estimate — most cheap stages are well under $0.10).
  const pre = checkBudget(loaded, 0.1);
  const budgetWarning = pre.overBy > 0 ? `Episode is $${pre.overBy.toFixed(2)} over the $${pre.budget.toFixed(2)} budget.` : undefined;

  let working = markStageRunning(loaded, stage);
  await store.save(working);

  try {
    const before = working.estimatedCostUsd;
    working = await execute(stage, working);
    const stageCost = working.estimatedCostUsd - before;
    const provider = working.costs[working.costs.length - 1]?.provider;
    working = markStageComplete(working, stage, stageCost, provider);
    const saved = await store.save(working);
    return {episode: saved, budgetWarning};
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    working = markStageFailed(working, stage, message);
    await store.save(working);
    throw err;
  }
}

/** Approve a review gate and advance the pipeline. */
export async function approveStage(episodeId: string, reviewStage: PipelineStage): Promise<Episode> {
  const store = getStore();
  const loaded = await store.get(episodeId);
  if (!loaded) throw new Error(`Episode ${episodeId} not found`);
  const advanced = approveReview(loaded, reviewStage);
  return store.save(advanced);
}
