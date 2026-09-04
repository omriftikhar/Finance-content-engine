import {NextResponse} from 'next/server';
import {CreateEpisodeInputSchema} from '@/lib/schemas';
import {getStore} from '@/lib/store';
import {buildEpisode} from '@/lib/pipeline/buildEpisode';

export async function GET() {
  const episodes = await getStore().list();
  return NextResponse.json({episodes});
}

export async function POST(request: Request) {
  const parsed = CreateEpisodeInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({error: 'Invalid input', details: parsed.error.flatten()}, {status: 400});
  }
  const episode = await buildEpisode(parsed.data.topic, parsed.data.targetMinutes);
  return NextResponse.json({episode}, {status: 201});
}
