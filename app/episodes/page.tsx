import Link from 'next/link';
import {getStore} from '@/lib/store';
import {totalCost} from '@/lib/schemas';
import {money} from '../_components/ui';

export const dynamic = 'force-dynamic';

export default async function EpisodesPage() {
  const episodes = await getStore().list();
  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Production</div>
          <h1>Episodes</h1>
        </div>
        <Link className="btn primary" href="/episodes/new">
          + New Episode
        </Link>
      </div>

      <div className="panel">
        {episodes.length === 0 ? (
          <div className="muted">No episodes yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Stage</th>
                <th>Scenes</th>
                <th>Runtime</th>
                <th>Cost</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/episodes/${e.id}`}>{e.title}</Link>
                  </td>
                  <td className="muted">{e.stage}</td>
                  <td>{e.scenes.length}</td>
                  <td>{e.targetMinutes}m</td>
                  <td>{money(totalCost(e))}</td>
                  <td className="muted">{new Date(e.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
