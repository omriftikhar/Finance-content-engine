import {NextResponse} from 'next/server';
import {CreateEpisodeInputSchema} from '@/lib/schemas';
import {buildEpisode} from '@/lib/pipeline/buildEpisode';

/**
 * Legacy endpoint retained for compatibility. Prefer POST /api/episodes.
 * Accepts { topic } and creates a new episode in the IDEA stage.
 */
export async function POST(request: Request) {
  const parsed = CreateEpisodeInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({error: 'Invalid topic'}, {status: 400});
  }
  const episode = await buildEpisode(parsed.data.topic, parsed.data.targetMinutes);
  return NextResponse.json(episode);
}
