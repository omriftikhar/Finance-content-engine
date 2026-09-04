import 'server-only';
import type {GenerationJob, PipelineStage, StageStatus} from '@/lib/schemas';
import {uuid, nowIso} from '@/lib/util/id';

/**
 * Generation-job helpers.
 *
 * Jobs are the hand-off between the Vercel app (which enqueues a RENDERING job)
 * and the Render worker (which claims and executes it). With the Supabase driver
 * these live in the generation_jobs table; with the file store they live inside
 * the episode document under `jobs`. Both share this shape.
 */
export function createJob(episodeId: string, stage: PipelineStage, task: string): GenerationJob {
  return {
    id: uuid(),
    episodeId,
    stage,
    status: 'pending',
    task,
    costUsd: 0,
    createdAt: nowIso(),
  };
}

export function markJob(job: GenerationJob, status: StageStatus, patch: Partial<GenerationJob> = {}): GenerationJob {
  return {
    ...job,
    status,
    ...patch,
    finishedAt: status === 'complete' || status === 'failed' ? nowIso() : job.finishedAt,
  };
}
