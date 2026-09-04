import {getStore} from '@/lib/store';
import {GrowthForm} from './GrowthForm';

export const dynamic = 'force-dynamic';

export default async function GrowthPage() {
  const [metrics, episodes] = await Promise.all([
    getStore().getChannelMetrics(),
    getStore().list(),
  ]);
  const published = episodes.filter((e) => e.stage === 'PUBLISHED').length;
  return <GrowthForm initial={metrics} publishedCount={published} />;
}
