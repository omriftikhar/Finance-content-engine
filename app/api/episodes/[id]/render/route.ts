import {NextResponse} from 'next/server';
import {startRender, finalizeRenderIfReady} from '@/lib/pipeline/render';

interface Ctx {
  params: Promise<{id: string}>;
}

/** Start a render (spawns the worker locally, or defers on serverless). */
export async function POST(_req: Request, {params}: Ctx) {
  const {id} = await params;
  try {
    const result = await startRender(id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({error: err instanceof Error ? err.message : 'Render failed'}, {status: 500});
  }
}

/** Poll: finalizes the stage if the output file is now present. */
export async function GET(_req: Request, {params}: Ctx) {
  const {id} = await params;
  try {
    const episode = await finalizeRenderIfReady(id);
    const rendered = episode.assets.some((a) => a.type === 'video');
    return NextResponse.json({episode, rendered, stage: episode.stage});
  } catch (err) {
    return NextResponse.json({error: err instanceof Error ? err.message : 'Poll failed'}, {status: 500});
  }
}
