import {notFound} from 'next/navigation';
import {getStore} from '@/lib/store';
import {Workspace} from './Workspace';

export const dynamic = 'force-dynamic';

export default async function EpisodeDetailPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const episode = await getStore().get(id);
  if (!episode) notFound();
  return <Workspace initialEpisode={episode} />;
}
