import {NextResponse} from 'next/server';
import {getStore} from '@/lib/store';
import {exportPublishPackage} from '@/lib/pipeline/export';

interface Ctx {
  params: Promise<{id: string}>;
}

export async function POST(_req: Request, {params}: Ctx) {
  const {id} = await params;
  const episode = await getStore().get(id);
  if (!episode) return NextResponse.json({error: 'Not found'}, {status: 404});
  const result = await exportPublishPackage(episode);
  return NextResponse.json(result);
}
