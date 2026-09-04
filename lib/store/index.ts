import 'server-only';
import type {EpisodeStore} from './types';
import {FileEpisodeStore} from './fileStore';

export type {EpisodeStore} from './types';

let instance: EpisodeStore | null = null;

/**
 * Returns the active store.
 *
 * Defaults to the file store (no external services). When STORE_DRIVER=supabase
 * and Supabase credentials exist, the Supabase adapter is used instead. The app
 * always works locally with the file store.
 */
export function getStore(): EpisodeStore {
  if (instance) return instance;
  const driver = (process.env.STORE_DRIVER ?? 'file').toLowerCase();
  if (driver === 'supabase' && process.env.SUPABASE_URL) {
    // Loaded eagerly here (server-only module) so callers keep a sync API.
    const {SupabaseEpisodeStore} = require('./supabaseStore') as typeof import('./supabaseStore');
    instance = new SupabaseEpisodeStore();
  } else {
    instance = new FileEpisodeStore();
  }
  return instance;
}
