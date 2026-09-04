'use client';

import {useMemo, useState} from 'react';
import type {ChannelMetrics} from '@/lib/schemas';
import {computeMonetizationProgress, MONETIZATION_TARGET} from '@/lib/schemas';
import {Kpi, num} from '../_components/ui';

const EMPTY: Partial<ChannelMetrics> = {source: 'manual'};

export function GrowthForm({initial, publishedCount}: {initial: ChannelMetrics | null; publishedCount: number}) {
  const [m, setM] = useState<Partial<ChannelMetrics>>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof ChannelMetrics>(key: K, value: ChannelMetrics[K]) {
    setM((prev) => ({...prev, [key]: value}));
  }

  const progress = useMemo(
    () =>
      computeMonetizationProgress(
        {
          subscribers: m.subscribers ?? 0,
          watchHours: m.watchHours ?? 0,
          avgViewDurationSec: m.avgViewDurationSec,
        },
        90,
      ),
    [m],
  );

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/metrics/channel', {
        method: 'PUT',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({...m, source: 'manual'}),
      });
      if (!res.ok) throw new Error('Save failed');
      setMsg('Saved.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Monetization command center</div>
          <h1>Growth</h1>
          <div className="muted">
            Targets: {num(MONETIZATION_TARGET.subscribers)} subscribers · {num(MONETIZATION_TARGET.watchHours)} watch hours.
            All figures below are <strong>manually entered</strong> until the YouTube Analytics API is connected — nothing here is invented.
          </div>
        </div>
      </div>

      <div className="grid3" style={{marginBottom: 16}}>
        <Kpi n={num(progress.remainingSubscribers)} label="Subscribers remaining" sub={`${progress.requiredSubsPerDay.toFixed(1)}/day for 90 days`} />
        <Kpi n={num(Math.round(progress.remainingWatchHours))} label="Watch hours remaining" sub={`${progress.requiredWatchHoursPerDay.toFixed(1)}/day for 90 days`} />
        <Kpi
          n={progress.estimatedViewsForWatchHours ? num(progress.estimatedViewsForWatchHours) : '—'}
          label="Est. views for watch-hours"
          sub={m.avgViewDurationSec ? `at ${m.avgViewDurationSec}s AVD` : 'enter AVD below'}
        />
      </div>

      <div className="panel">
        <h2>Channel metrics (manual entry)</h2>
        <div className="grid4">
          <Field label="Subscribers" v={m.subscribers} onChange={(n) => set('subscribers', n)} />
          <Field label="Watch hours" v={m.watchHours} onChange={(n) => set('watchHours', n)} />
          <Field label="Videos published" v={m.videosPublished ?? publishedCount} onChange={(n) => set('videosPublished', n)} />
          <Field label="Views" v={m.views} onChange={(n) => set('views', n)} />
          <Field label="Impressions" v={m.impressions} onChange={(n) => set('impressions', n)} />
          <Field label="CTR (%)" v={pctToNum(m.ctr)} onChange={(n) => set('ctr', n / 100)} />
          <Field label="Avg view duration (s)" v={m.avgViewDurationSec} onChange={(n) => set('avgViewDurationSec', n)} />
          <Field label="Avg % viewed (%)" v={pctToNum(m.avgPercentageViewed)} onChange={(n) => set('avgPercentageViewed', n / 100)} />
          <Field label="US audience (%)" v={pctToNum(m.usAudiencePct)} onChange={(n) => set('usAudiencePct', n / 100)} />
          <Field label="Browse (%)" v={pctToNum(m.browsePct)} onChange={(n) => set('browsePct', n / 100)} />
          <Field label="Suggested (%)" v={pctToNum(m.suggestedPct)} onChange={(n) => set('suggestedPct', n / 100)} />
          <Field label="Search (%)" v={pctToNum(m.searchPct)} onChange={(n) => set('searchPct', n / 100)} />
        </div>
        <div className="row" style={{marginTop: 14}}>
          <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save metrics'}</button>
          {msg && <span className="muted">{msg}</span>}
        </div>
      </div>
    </>
  );
}

function Field({label, v, onChange}: {label: string; v: number | undefined; onChange: (n: number) => void}) {
  return (
    <div>
      <label>{label}</label>
      <input type="number" value={v ?? ''} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function pctToNum(frac: number | undefined): number | undefined {
  return frac === undefined ? undefined : Math.round(frac * 1000) / 10;
}
