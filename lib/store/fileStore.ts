import 'server-only';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import type {EpisodeStore} from './types';
import {EpisodeSchema, type Episode} from '@/lib/schemas';
import {
  ChannelMetricsSchema,
  EpisodeMetricsSchema,
  type ChannelMetrics,
  type EpisodeMetrics,
} from '@/lib/schemas';

/**
 * File-backed store for local development.
 *
 * Data lives under data/store/. This keeps the whole app runnable with no
 * database. Writes are validated through Zod so persisted documents always
 * match the current schema.
 */
// On writable filesystems this lives in the repo; on ephemeral/serverless
// filesystems (e.g. Vercel) the project root is read-only, so we fall back to a
// writable temp dir. For durable cloud storage use STORE_DRIVER=supabase.
const ROOT =
  process.env.FILE_STORE_DIR ??
  (process.env.VERCEL ? path.join('/tmp', 'finance-store') : path.join(process.cwd(), 'data', 'store'));
const EPISODES_DIR = path.join(ROOT, 'episodes');
const CHANNEL_METRICS_FILE = path.join(ROOT, 'channel-metrics.json');
const EPISODE_METRICS_DIR = path.join(ROOT, 'episode-metrics');

async function ensureDirs() {
  await fs.mkdir(EPISODES_DIR, {recursive: true});
  await fs.mkdir(EPISODE_METRICS_DIR, {recursive: true});
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

export class FileEpisodeStore implements EpisodeStore {
  async list(): Promise<Episode[]> {
    await ensureDirs();
    const files = await fs.readdir(EPISODES_DIR);
    const episodes: Episode[] = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const raw = await readJson<unknown>(path.join(EPISODES_DIR, f));
      const parsed = EpisodeSchema.safeParse(raw);
      if (parsed.success) episodes.push(parsed.data);
    }
    return episodes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async get(id: string): Promise<Episode | null> {
    await ensureDirs();
    const raw = await readJson<unknown>(path.join(EPISODES_DIR, `${id}.json`));
    if (!raw) return null;
    const parsed = EpisodeSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  async save(episode: Episode): Promise<Episode> {
    await ensureDirs();
    const validated = EpisodeSchema.parse(episode);
    await writeJson(path.join(EPISODES_DIR, `${validated.id}.json`), validated);
    return validated;
  }

  async delete(id: string): Promise<void> {
    await ensureDirs();
    await fs.rm(path.join(EPISODES_DIR, `${id}.json`), {force: true});
  }

  async getChannelMetrics(): Promise<ChannelMetrics | null> {
    await ensureDirs();
    const raw = await readJson<unknown>(CHANNEL_METRICS_FILE);
    if (!raw) return null;
    const parsed = ChannelMetricsSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  async saveChannelMetrics(m: ChannelMetrics): Promise<ChannelMetrics> {
    await ensureDirs();
    const validated = ChannelMetricsSchema.parse(m);
    await writeJson(CHANNEL_METRICS_FILE, validated);
    return validated;
  }

  async getEpisodeMetrics(episodeId: string): Promise<EpisodeMetrics | null> {
    await ensureDirs();
    const raw = await readJson<unknown>(path.join(EPISODE_METRICS_DIR, `${episodeId}.json`));
    if (!raw) return null;
    const parsed = EpisodeMetricsSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  async saveEpisodeMetrics(m: EpisodeMetrics): Promise<EpisodeMetrics> {
    await ensureDirs();
    const validated = EpisodeMetricsSchema.parse(m);
    await writeJson(path.join(EPISODE_METRICS_DIR, `${validated.episodeId}.json`), validated);
    return validated;
  }
}
