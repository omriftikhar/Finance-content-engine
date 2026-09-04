import 'server-only';
import type {Episode} from '@/lib/schemas';
import {getStore} from '@/lib/store';
import {createEpisode} from './orchestrator';

/**
 * Creates and persists a new episode in the IDEA stage.
 *
 * Stage execution (research → script → …) is driven separately via the
 * orchestrator so each stage can be run, reviewed and regenerated independently.
 */
export async function buildEpisode(topic: string, targetMinutes?: number): Promise<Episode> {
  const episode = createEpisode(topic, targetMinutes);
  return getStore().save(episode);
}
