import 'server-only';
import type {EpisodeStore} from './types';
import {EpisodeSchema, type Episode} from '@/lib/schemas';
import {
  ChannelMetricsSchema,
  EpisodeMetricsSchema,
  type ChannelMetrics,
  type EpisodeMetrics,
} from '@/lib/schemas';

/**
 * Supabase-backed store (document model — see 0002_document_store.sql).
 *
 * Uses @supabase/supabase-js, lazy-imported so the file store (default) never
 * requires it. Selected when STORE_DRIVER=supabase and credentials are present.
 */
type SupabaseClient = import('@supabase/supabase-js').SupabaseClient;

async function client(): Promise<SupabaseClient> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase not configured (SUPABASE_URL / key missing).');
  let mod: typeof import('@supabase/supabase-js');
  try {
    mod = await import('@supabase/supabase-js');
  } catch {
    throw new Error('Install @supabase/supabase-js to use STORE_DRIVER=supabase.');
  }
  return mod.createClient(url, key, {auth: {persistSession: false}});
}

export class SupabaseEpisodeStore implements EpisodeStore {
  async list(): Promise<Episode[]> {
    const db = await client();
    const {data, error} = await db.from('episode_docs').select('doc').order('updated_at', {ascending: false});
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((r) => EpisodeSchema.safeParse((r as {doc: unknown}).doc))
      .filter((p): p is {success: true; data: Episode} => p.success)
      .map((p) => p.data);
  }

  async get(id: string): Promise<Episode | null> {
    const db = await client();
    const {data, error} = await db.from('episode_docs').select('doc').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const parsed = EpisodeSchema.safeParse((data as {doc: unknown}).doc);
    return parsed.success ? parsed.data : null;
  }

  async save(episode: Episode): Promise<Episode> {
    const db = await client();
    const validated = EpisodeSchema.parse(episode);
    const {error} = await db
      .from('episode_docs')
      .upsert({id: validated.id, doc: validated, updated_at: new Date().toISOString()});
    if (error) throw new Error(error.message);
    return validated;
  }

  async delete(id: string): Promise<void> {
    const db = await client();
    const {error} = await db.from('episode_docs').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async getChannelMetrics(): Promise<ChannelMetrics | null> {
    const db = await client();
    const {data, error} = await db.from('channel_metrics_doc').select('doc').eq('id', 1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const parsed = ChannelMetricsSchema.safeParse((data as {doc: unknown}).doc);
    return parsed.success ? parsed.data : null;
  }

  async saveChannelMetrics(m: ChannelMetrics): Promise<ChannelMetrics> {
    const db = await client();
    const validated = ChannelMetricsSchema.parse(m);
    const {error} = await db
      .from('channel_metrics_doc')
      .upsert({id: 1, doc: validated, updated_at: new Date().toISOString()});
    if (error) throw new Error(error.message);
    return validated;
  }

  async getEpisodeMetrics(episodeId: string): Promise<EpisodeMetrics | null> {
    const db = await client();
    const {data, error} = await db.from('episode_metrics_docs').select('doc').eq('episode_id', episodeId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const parsed = EpisodeMetricsSchema.safeParse((data as {doc: unknown}).doc);
    return parsed.success ? parsed.data : null;
  }

  async saveEpisodeMetrics(m: EpisodeMetrics): Promise<EpisodeMetrics> {
    const db = await client();
    const validated = EpisodeMetricsSchema.parse(m);
    const {error} = await db
      .from('episode_metrics_docs')
      .upsert({episode_id: validated.episodeId, doc: validated, updated_at: new Date().toISOString()});
    if (error) throw new Error(error.message);
    return validated;
  }
}
