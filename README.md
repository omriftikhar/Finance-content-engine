# Finance Content Engine

Internal, AI-assisted production engine for US personal-finance YouTube videos.

**Pipeline:** Topic → verified research → retention-optimized script → storyboard → voice → assets → animated Remotion render → titles/thumbnails/description/chapters → publish package. Human review is required; the system never auto-publishes and never presents unverified financial statistics as fact.

First milestone: one publishable episode — **"Why Americans Making $100,000 Still Feel Broke"** (loaded as the gold-standard fixture in `data/pilot.ts`).

## Run locally (no API keys required)

```bash
npm install
cp .env.example .env.local   # defaults to full MOCK mode
npm run dev                  # http://localhost:3000
```

Screens: `/` dashboard · `/episodes` · `/episodes/new` · `/episodes/[id]` (workspace) · `/growth` · `/settings`.

Remotion studio / render:
```bash
npm run remotion:studio                 # preview the composition
npm run worker:render <episodeId>       # render an episode to out/<id>.mp4
```

## Architecture

- `app/` — Next.js dashboard + API routes (compact internal tooling, dark theme)
- `lib/schemas/` — Zod contracts (episode, scene, research/claims/evidence, script, packaging, assets, pipeline, metrics)
- `lib/ai/` — provider abstraction: mock + DeepSeek + MiniMax + OpenAI-compatible premium, routed per task by cost tier
- `lib/tts/` — TTS abstraction: mock + MiniMax (ElevenLabs-ready)
- `lib/pipeline/` — state machine, orchestrator, research/script/storyboard/voice/packaging engines, cost governor, approval gate, export
- `lib/store/` — file store (default, local) + Supabase adapter (`STORE_DRIVER=supabase`)
- `lib/storage/` — Cloudflare R2 client (optional)
- `video/` — Remotion visual system (charts, character, scene components) + composition
- `worker/` — standalone Remotion render worker (Render.com)
- `supabase/migrations/` — Postgres schema
- `data/pilot.ts` — gold-standard pilot fixture

See `docs/ARCHITECTURE.md` for the design principles and deployment guide.

## Deploy

**Vercel (dashboard):**
1. Import the repo (framework auto-detected). `vercel.json` is included.
2. Set env: `TEXT_PROVIDER`, `TTS_PROVIDER`, `STORE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, provider keys, `MAX_VIDEO_BUDGET_USD`.
   - Without Supabase the file store falls back to `/tmp` (ephemeral) — fine for a demo, **use Supabase for anything real.**
3. Deploy. Verify at `/api/health`.

**Supabase (data):** run `supabase/migrations/0001_init.sql` then `0002_document_store.sql`; `npm i @supabase/supabase-js`.

**Render.com (video worker):** deploy `render.yaml`; invoke `npm run worker:render <episodeId>`. Rendering never runs on Vercel — the render API defers to the worker there.

**Cloudflare R2 (media):** set `R2_*` env on the worker; `npm i @aws-sdk/client-s3`. The worker uploads finished MP4s automatically.

## Safety

- Every important numeric claim carries source, evidence, confidence and a verification status (`VERIFIED` / `NEEDS_REVIEW` / `UNSUPPORTED`).
- Critical unverified claims **block** publish approval.
- The narrator is educational/documentary — never an "AI financial advisor".
