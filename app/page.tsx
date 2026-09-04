import Link from 'next/link';
import {getStore} from '@/lib/store';
import {computeMonetizationProgress, MONETIZATION_TARGET, totalCost} from '@/lib/schemas';
import {Kpi, money, num} from './_components/ui';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const store = getStore();
  const [episodes, metrics] = await Promise.all([store.list(), store.getChannelMetrics()]);

  const published = episodes.filter((e) => e.stage === 'PUBLISHED').length;
  const inProgress = episodes.filter((e) => e.stage !== 'PUBLISHED' && e.stage !== 'FAILED').length;
  const spend = episodes.reduce((s, e) => s + totalCost(e), 0);

  const progress = metrics
    ? computeMonetizationProgress(
        {subscribers: metrics.subscribers, watchHours: metrics.watchHours, avgViewDurationSec: metrics.avgViewDurationSec},
        90,
      )
    : null;

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Internal Production System</div>
          <h1>Dashboard</h1>
          <div className="muted">Topic → verified research → script → storyboard → voice → render → publish package.</div>
        </div>
        <Link className="btn primary" href="/episodes/new">
          + New Episode
        </Link>
      </div>

      <div className="grid4">
        <Kpi n={num(episodes.length)} label="Episodes" />
        <Kpi n={num(published)} label="Published" sub={`${inProgress} in progress`} />
        <Kpi n={money(spend)} label="Variable spend (all)" sub={`Budget target ${money(Number(process.env.MAX_VIDEO_BUDGET_USD ?? 3))}/ep`} />
        <Kpi
          n={metrics ? num(metrics.subscribers) : '—'}
          label="Subscribers"
          sub={metrics ? `of ${num(MONETIZATION_TARGET.subscribers)} target` : 'no data yet'}
        />
      </div>

      <div className="stack" style={{marginTop: 20}}>
        <div className="panel">
          <div className="spread">
            <h2>Monetization progress (90-day horizon)</h2>
            <Link className="tag" href="/growth">
              Growth →
            </Link>
          </div>
          {progress ? (
            <div className="grid3" style={{marginTop: 8}}>
              <Kpi n={num(progress.remainingSubscribers)} label="Subs remaining" sub={`${progress.requiredSubsPerDay.toFixed(1)}/day needed`} />
              <Kpi n={num(Math.round(progress.remainingWatchHours))} label="Watch hours remaining" sub={`${progress.requiredWatchHoursPerDay.toFixed(1)}/day needed`} />
              <Kpi
                n={progress.estimatedViewsForWatchHours ? num(progress.estimatedViewsForWatchHours) : '—'}
                label="Est. views for watch-hours"
                sub={metrics?.avgViewDurationSec ? `at ${metrics.avgViewDurationSec}s AVD` : 'enter AVD in Growth'}
              />
            </div>
          ) : (
            <div className="muted" style={{marginTop: 8}}>
              No channel metrics entered yet. Add them in <Link href="/growth" className="tag">Growth</Link> — nothing here is invented.
            </div>
          )}
        </div>

        <div className="panel">
          <div className="spread">
            <h2>Recent episodes</h2>
            <Link className="tag" href="/episodes">
              All episodes →
            </Link>
          </div>
          {episodes.length === 0 ? (
            <div className="muted" style={{marginTop: 8}}>No episodes yet. Create your first one.</div>
          ) : (
            <table style={{marginTop: 8}}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Stage</th>
                  <th>Scenes</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {episodes.slice(0, 6).map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/episodes/${e.id}`}>{e.title}</Link>
                    </td>
                    <td className="muted">{e.stage}</td>
                    <td>{e.scenes.length}</td>
                    <td>{money(totalCost(e))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
