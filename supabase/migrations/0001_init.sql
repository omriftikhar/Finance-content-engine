-- Finance Content Engine — initial schema
-- Supabase/Postgres. UUID primary keys, timestamps, sensible indexes.
-- Local development does NOT require this; the file store is the default.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Episodes (pipeline aggregate root)
-- ─────────────────────────────────────────────────────────────
create table if not exists episodes (
  id            uuid primary key default gen_random_uuid(),
  topic         text not null,
  title         text not null,
  hook          text not null default '',
  target_minutes numeric not null default 9,
  stage         text not null default 'IDEA',
  stages        jsonb not null default '{}'::jsonb,
  script        jsonb,
  packaging     jsonb,
  estimated_cost_usd numeric not null default 0,
  approved      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists episodes_stage_idx on episodes (stage);
create index if not exists episodes_created_idx on episodes (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Research sources
-- ─────────────────────────────────────────────────────────────
create table if not exists research_sources (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references episodes(id) on delete cascade,
  name        text not null,
  authority   text not null,
  url         text,
  publisher   text,
  note        text not null default '',
  retrieved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists research_sources_episode_idx on research_sources (episode_id);

-- ─────────────────────────────────────────────────────────────
-- Financial claims + evidence
-- ─────────────────────────────────────────────────────────────
create table if not exists claims (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references episodes(id) on delete cascade,
  text        text not null,
  value       numeric,
  unit        text,
  period      text,
  confidence  numeric not null default 0,
  status      text not null default 'NEEDS_REVIEW',  -- VERIFIED | NEEDS_REVIEW | UNSUPPORTED
  critical    boolean not null default false,
  evidence    jsonb not null default '[]'::jsonb,     -- array of {sourceId, quote, url, retrievedAt}
  created_at  timestamptz not null default now()
);
create index if not exists claims_episode_idx on claims (episode_id);
create index if not exists claims_status_idx on claims (status);

-- ─────────────────────────────────────────────────────────────
-- Scenes (storyboard)
-- ─────────────────────────────────────────────────────────────
create table if not exists scenes (
  id            uuid primary key default gen_random_uuid(),
  episode_id    uuid not null references episodes(id) on delete cascade,
  scene_index   int not null,
  duration_sec  numeric not null,
  narration     text not null,
  headline      text not null default '',
  supporting_text text not null default '',
  visual_type   text not null,
  spec          jsonb not null default '{}'::jsonb,   -- full Scene JSON
  source_refs   text[] not null default '{}',
  asset_refs    text[] not null default '{}',
  created_at    timestamptz not null default now()
);
create unique index if not exists scenes_episode_index_idx on scenes (episode_id, scene_index);

-- ─────────────────────────────────────────────────────────────
-- Assets
-- ─────────────────────────────────────────────────────────────
create table if not exists assets (
  id                uuid primary key default gen_random_uuid(),
  episode_id        uuid references episodes(id) on delete cascade,
  scene_index       int,
  type              text not null,      -- character|background|icon|image|audio|music|sfx|chart|thumbnail|video
  label             text not null,
  source            text not null default 'placeholder',
  provider          text,
  generation_prompt text,
  cost_usd          numeric not null default 0,
  local_path        text,
  storage_url       text,
  duration_ms       numeric,
  created_at        timestamptz not null default now()
);
create index if not exists assets_episode_idx on assets (episode_id);
create index if not exists assets_type_idx on assets (type);

-- ─────────────────────────────────────────────────────────────
-- Generation jobs + costs
-- ─────────────────────────────────────────────────────────────
create table if not exists generation_jobs (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references episodes(id) on delete cascade,
  stage       text not null,
  status      text not null,           -- pending|running|awaiting_review|complete|failed
  provider    text,
  task        text,
  cost_usd    numeric not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists jobs_episode_idx on generation_jobs (episode_id);
create index if not exists jobs_status_idx on generation_jobs (status);

create table if not exists generation_costs (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references episodes(id) on delete cascade,
  category    text not null,           -- research|script|storyboard|voice|images|video|packaging
  provider    text not null,
  cost_usd    numeric not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists costs_episode_idx on generation_costs (episode_id);

-- ─────────────────────────────────────────────────────────────
-- Packaging variants (titles/thumbnails candidates)
-- ─────────────────────────────────────────────────────────────
create table if not exists packaging_variants (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references episodes(id) on delete cascade,
  kind        text not null,           -- title | thumbnail | short
  content     jsonb not null,
  score       numeric,
  selected    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists packaging_episode_idx on packaging_variants (episode_id);

-- ─────────────────────────────────────────────────────────────
-- Channel + episode performance metrics
-- ─────────────────────────────────────────────────────────────
create table if not exists channel_metrics (
  id            uuid primary key default gen_random_uuid(),
  captured_at   timestamptz not null default now(),
  subscribers   numeric not null default 0,
  watch_hours   numeric not null default 0,
  videos_published int not null default 0,
  views         numeric not null default 0,
  impressions   numeric not null default 0,
  ctr           numeric,
  avg_view_duration_sec numeric,
  avg_percentage_viewed numeric,
  us_audience_pct numeric,
  browse_pct    numeric,
  suggested_pct numeric,
  search_pct    numeric,
  source        text not null default 'manual'  -- manual | imported | youtube_api
);
create index if not exists channel_metrics_captured_idx on channel_metrics (captured_at desc);

create table if not exists episode_metrics (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references episodes(id) on delete cascade,
  window      text not null,           -- h24 | h48 | d7
  views       numeric not null default 0,
  impressions numeric not null default 0,
  ctr         numeric,
  avg_percentage_viewed numeric,
  subscribers_gained numeric not null default 0,
  watch_hours numeric not null default 0,
  source      text not null default 'manual',
  captured_at timestamptz not null default now()
);
create unique index if not exists episode_metrics_window_idx on episode_metrics (episode_id, window);

-- updated_at trigger for episodes
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists episodes_set_updated_at on episodes;
create trigger episodes_set_updated_at before update on episodes
  for each row execute function set_updated_at();
