# V1 Architecture

## Principle
Do not ask one generative model to create the whole video. Models plan; the renderer executes.

## Pipeline
1. Topic
2. Research-source plan
3. Claim extraction
4. Script
5. Financial-claim review
6. Scene JSON
7. TTS
8. Deterministic Remotion render
9. Thumbnail/title/description packaging
10. Human approval

## Provider routing
High-volume tasks should use low-cost providers such as DeepSeek or MiniMax.
Critical financial claims must be grounded in authoritative US sources and should have a human-review gate.

## Next engineering milestones
- DeepSeek adapter
- MiniMax adapter
- source fetcher + claim evidence store
- real script-to-scene generation
- TTS adapter
- audio-aware scene duration
- reusable character/asset system
- chart animation components
- thumbnail renderer
- render queue + job status

---

# V2 Implementation (deployed architecture)

## Runtime topology
- **Vercel** — Next.js dashboard + API routes (episode CRUD, stage execution, export, metrics).
- **Supabase** — Postgres store for episodes/research/claims/scenes/assets/jobs/costs/packaging/metrics (`STORE_DRIVER=supabase`). Local dev uses the file store instead.
- **Render.com** — standalone Remotion render worker (`worker/render.ts`); rendering never blocks the web tier.
- **Cloudflare R2** — S3-compatible object storage for finished media (optional; used by the worker).

Everything runs locally with none of the above: mock AI + mock TTS + file store.

## Provider routing (lib/ai/router.ts)
Tasks map to a cost tier. Cheap tier → DeepSeek (then MiniMax). Premium tier → OpenAI-compatible, used only when a quality score is low (e.g. script polish). Missing keys fall back to mock, then to the cheap tier. Pricing table in `lib/ai/pricing.ts` feeds the cost governor.

## Cost governor (lib/pipeline/cost.ts)
Per-episode ledger by category (research/script/voice/images/video/packaging). `MAX_VIDEO_BUDGET_USD` (default $3) is enforced with a 10% hard-block margin.

## Pipeline state machine (lib/pipeline/stateMachine.ts + orchestrator.ts)
Linear stages with review gates after research/script/render/packaging. Each stage can be run, regenerated in isolation, retried on failure, and approved. Rendering is delegated to the external worker.
