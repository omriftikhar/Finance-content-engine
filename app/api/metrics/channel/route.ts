import {NextResponse} from 'next/server';
import {ChannelMetricsSchema} from '@/lib/schemas';
import {getStore} from '@/lib/store';

export async function GET() {
  const metrics = await getStore().getChannelMetrics();
  return NextResponse.json({metrics});
}

export async function PUT(req: Request) {
  const parsed = ChannelMetricsSchema.safeParse({
    ...(await req.json()),
    capturedAt: new Date().toISOString(),
  });
  if (!parsed.success) {
    return NextResponse.json({error: 'Invalid metrics', details: parsed.error.flatten()}, {status: 400});
  }
  const saved = await getStore().saveChannelMetrics(parsed.data);
  return NextResponse.json({metrics: saved});
}
