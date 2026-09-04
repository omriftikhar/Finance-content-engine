-- Document-store tables used by the Supabase adapter (lib/store/supabaseStore.ts).
-- The relational tables in 0001_init.sql remain the analytical/query model; this
-- table is the fast path the app reads/writes the full Episode aggregate through.
-- Keeping both lets you migrate to fully-normalized reads later without a rewrite.

create table if not exists episode_docs (
  id         uuid primary key,
  doc        jsonb not null,
  stage      text generated always as (doc->>'stage') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists episode_docs_stage_idx on episode_docs (stage);
create index if not exists episode_docs_updated_idx on episode_docs (updated_at desc);

create table if not exists channel_metrics_doc (
  id         int primary key default 1,
  doc        jsonb not null,
  updated_at timestamptz not null default now(),
  constraint channel_metrics_singleton check (id = 1)
);

create table if not exists episode_metrics_docs (
  episode_id uuid primary key,
  doc        jsonb not null,
  updated_at timestamptz not null default now()
);
