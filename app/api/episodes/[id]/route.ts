import {NextResponse} from 'next/server';
import {getStore} from '@/lib/store';
import {EpisodeSchema} from '@/lib/schemas';

interface Ctx {
  params: Promise<{id: string}>;
}

export async function GET(_req: Request, {params}: Ctx) {
  const {id} = await params;
  const episode = await getStore().get(id);
  if (!episode) return NextResponse.json({error: 'Not found'}, {status: 404});
  return NextResponse.json({episode});
}

export async function PATCH(req: Request, {params}: Ctx) {
  const {id} = await params;
  const store = getStore();
  const existing = await store.get(id);
  if (!existing) return NextResponse.json({error: 'Not found'}, {status: 404});

  const body = await req.json();
  const merged = EpisodeSchema.safeParse({...existing, ...body, id, updatedAt: new Date().toISOString()});
  if (!merged.success) {
    return NextResponse.json({error: 'Invalid episode', details: merged.error.flatten()}, {status: 400});
  }
  const saved = await store.save(merged.data);
  return NextResponse.json({episode: saved});
}

export async function DELETE(_req: Request, {params}: Ctx) {
  const {id} = await params;
  await getStore().delete(id);
  return NextResponse.json({ok: true});
}
