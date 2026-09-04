import type {Episode} from '@/lib/schemas';
import type {PipelineStage, StageState, StageStatus} from '@/lib/schemas';

/**
 * Episode pipeline state machine.
 *
 * The pipeline is a linear sequence of stages, most of which are followed by a
 * human review gate. A stage can be re-run in isolation (regenerate) without
 * restarting earlier stages. Failed stages can be retried.
 */

/** Canonical forward order of stages. */
export const STAGE_ORDER: PipelineStage[] = [
  'IDEA',
  'RESEARCHING',
  'RESEARCH_REVIEW',
  'SCRIPTING',
  'SCRIPT_REVIEW',
  'STORYBOARDING',
  'VOICE_GENERATION',
  'ASSET_GENERATION',
  'READY_TO_RENDER',
  'RENDERING',
  'RENDER_REVIEW',
  'PACKAGING',
  'READY_TO_PUBLISH',
  'PUBLISHED',
];

/** Stages the orchestrator can execute directly (rendering is external). */
export const RUNNABLE_STAGES: PipelineStage[] = [
  'RESEARCHING',
  'SCRIPTING',
  'STORYBOARDING',
  'VOICE_GENERATION',
  'PACKAGING',
];

/** Stages that are automated work (as opposed to review/terminal gates). */
export const AUTOMATED_STAGES: Set<PipelineStage> = new Set([
  'RESEARCHING',
  'SCRIPTING',
  'STORYBOARDING',
  'VOICE_GENERATION',
  'ASSET_GENERATION',
  'RENDERING',
  'PACKAGING',
]);

/** The review gate that immediately follows each automated stage, if any. */
export const REVIEW_AFTER: Partial<Record<PipelineStage, PipelineStage>> = {
  RESEARCHING: 'RESEARCH_REVIEW',
  SCRIPTING: 'SCRIPT_REVIEW',
  RENDERING: 'RENDER_REVIEW',
  PACKAGING: 'READY_TO_PUBLISH',
};

export function stageIndex(stage: PipelineStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function nextStage(stage: PipelineStage): PipelineStage | null {
  const idx = stageIndex(stage);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function getStageState(episode: Episode, stage: PipelineStage): StageState {
  return (
    episode.stages[stage] ?? {
      stage,
      status: 'pending' as StageStatus,
      costUsd: 0,
      attempts: 0,
    }
  );
}

export function setStageState(
  episode: Episode,
  stage: PipelineStage,
  patch: Partial<StageState>,
): Episode {
  const current = getStageState(episode, stage);
  const merged: StageState = {...current, ...patch, stage};
  return {
    ...episode,
    stages: {...episode.stages, [stage]: merged},
    updatedAt: new Date().toISOString(),
  };
}

export function markStageRunning(episode: Episode, stage: PipelineStage): Episode {
  const state = getStageState(episode, stage);
  return setStageState(episode, stage, {
    status: 'running',
    startedAt: new Date().toISOString(),
    error: undefined,
    attempts: state.attempts + 1,
  });
}

export function markStageComplete(
  episode: Episode,
  stage: PipelineStage,
  costUsd = 0,
  provider?: string,
): Episode {
  const withState = setStageState(episode, stage, {
    status: 'complete',
    completedAt: new Date().toISOString(),
    costUsd: getStageState(episode, stage).costUsd + costUsd,
    provider,
  });
  // Advance the episode's current stage to the following review/terminal gate.
  const review = REVIEW_AFTER[stage];
  const advanceTo = review ?? nextStage(stage) ?? withState.stage;
  return {...withState, stage: advanceTo};
}

export function markStageFailed(episode: Episode, stage: PipelineStage, error: string): Episode {
  const withState = setStageState(episode, stage, {
    status: 'failed',
    completedAt: new Date().toISOString(),
    error,
  });
  return {...withState, stage: 'FAILED'};
}

/** Approve a review gate and advance to the next work stage. */
export function approveReview(episode: Episode, reviewStage: PipelineStage): Episode {
  const advanceTo = nextStage(reviewStage) ?? reviewStage;
  return setStageState(
    {...episode, stage: advanceTo},
    reviewStage,
    {status: 'complete', completedAt: new Date().toISOString()},
  );
}
