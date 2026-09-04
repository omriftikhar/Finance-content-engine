import {NextResponse} from 'next/server';
import {z} from 'zod';
import {PipelineStage} from '@/lib/schemas';
import {runStage, approveStage, RUNNABLE_STAGES} from '@/lib/pipeline/orchestrator';

interface Ctx {
  params: Promise<{id: string}>;
}

const BodySchema = z.object({
  action: z.enum(['run', 'regenerate', 'approve']),
  stage: PipelineStage,
});

export async function POST(req: Request, {params}: Ctx) {
  const {id} = await params;
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({error: 'Invalid body', details: parsed.error.flatten()}, {status: 400});
  }
  const {action, stage} = parsed.data;

  try {
    if (action === 'approve') {
      const episode = await approveStage(id, stage);
      return NextResponse.json({episode});
    }
    // run + regenerate both execute the stage in isolation.
    if (!RUNNABLE_STAGES.includes(stage)) {
      return NextResponse.json({error: `Stage ${stage} is not runnable here.`}, {status: 400});
    }
    const {episode, budgetWarning} = await runStage(id, stage);
    return NextResponse.json({episode, budgetWarning});
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stage failed';
    return NextResponse.json({error: message}, {status: 500});
  }
}
