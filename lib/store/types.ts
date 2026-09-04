import type {Episode} from '@/lib/schemas';
import type {ChannelMetrics, EpisodeMetrics} from '@/lib/schemas';

/**
 * Persistence abstraction.
 *
 * Local development uses a file-backed store (no external services). A Supabase
 * adapter implementing the same interface can be swapped in for production via
 * the STORE_DRIVER env var.
 */
export interface EpisodeStore {
  list(): Promise<Episode[]>;
  get(id: string): Promise<Episode | null>;
  save(episode: Episode): Promise<Episode>;
  delete(id: string): Promise<void>;

  getChannelMetrics(): Promise<ChannelMetrics | null>;
  saveChannelMetrics(m: ChannelMetrics): Promise<ChannelMetrics>;

  getEpisodeMetrics(episodeId: string): Promise<EpisodeMetrics | null>;
  saveEpisodeMetrics(m: EpisodeMetrics): Promise<EpisodeMetrics>;
}
