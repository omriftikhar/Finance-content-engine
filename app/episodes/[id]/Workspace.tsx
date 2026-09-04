'use client';

import {useMemo, useState} from 'react';
import type {Episode, PipelineStage} from '@/lib/schemas';
import {scriptQualityScore} from '@/lib/schemas';
import {STAGE_ORDER, getStageState, REVIEW_AFTER, RUNNABLE_STAGES} from '@/lib/pipeline/stateMachine';
import {costBreakdown, getBudgetUsd} from '@/lib/pipeline/cost';
import {checkApproval} from '@/lib/pipeline/approval';
import {ClaimBadge, Kpi, money} from '../../_components/ui';

type Tab = 'research' | 'script' | 'storyboard' | 'packaging' | 'cost';

const RUN_LABEL: Partial<Record<PipelineStage, string>> = {
  RESEARCHING: 'Run research',
  SCRIPTING: 'Generate script',
  STORYBOARDING: 'Generate storyboard',
  VOICE_GENERATION: 'Generate voice',
  PACKAGING: 'Generate packaging',
};

export function Workspace({initialEpisode}: {initialEpisode: Episode}) {
  const [episode, setEpisode] = useState(initialEpisode);
  const [tab, setTab] = useState<Tab>('script');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{kind: 'warn' | 'ok'; text: string} | null>(null);

  const budget = getBudgetUsd();
  const cost = useMemo(() => costBreakdown(episode), [episode]);
  const approval = useMemo(() => checkApproval(episode), [episode]);

  async function post(body: unknown, path = 'stage') {
    setBusy(path + JSON.stringify(body));
    setMsg(null);
    try {
      const res = await fetch(`/api/episodes/${episode.id}/${path}`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      if (data.episode) setEpisode(data.episode);
      if (data.budgetWarning) setMsg({kind: 'warn', text: data.budgetWarning});
      if (data.files) {
        setMsg({
          kind: data.warnings?.length ? 'warn' : 'ok',
          text: `Exported ${data.files.length} files to ${data.dir}.` + (data.warnings?.length ? ` ${data.warnings.join(' ')}` : ''),
        });
      }
    } catch (err) {
      setMsg({kind: 'warn', text: err instanceof Error ? err.message : 'Failed'});
    } finally {
      setBusy(null);
    }
  }

  const runStage = (stage: PipelineStage, action: 'run' | 'regenerate' = 'run') => post({action, stage});
  const approve = (stage: PipelineStage) => post({action: 'approve', stage});
  const exportPackage = () => post({}, 'export');
  const startRender = () => post({}, 'render');

  async function checkRender() {
    setBusy('render-poll');
    setMsg(null);
    try {
      const res = await fetch(`/api/episodes/${episode.id}/render`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Poll failed');
      if (data.episode) setEpisode(data.episode);
      setMsg({kind: data.rendered ? 'ok' : 'warn', text: data.rendered ? 'Render complete — video asset registered.' : 'Still rendering (or run the worker). Check again shortly.'});
    } catch (err) {
      setMsg({kind: 'warn', text: err instanceof Error ? err.message : 'Failed'});
    } finally {
      setBusy(null);
    }
  }

  const hasVideo = episode.assets.some((a) => a.type === 'video');

  const quality = episode.script?.metrics ? scriptQualityScore(episode.script.metrics) : null;

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Episode workspace · {episode.stage}</div>
          <h1>{episode.title}</h1>
          <div className="muted">{episode.hook || episode.topic}</div>
        </div>
        <div className="row">
          <span className="tag">{money(cost.total)} / {money(budget)} budget</span>
        </div>
      </div>

      {msg && <div className={msg.kind === 'warn' ? 'warnbox' : 'okbox'} style={{marginBottom: 16}}>{msg.text}</div>}

      {/* Pipeline rail */}
      <div className="panel" style={{marginBottom: 16}}>
        <div className="rail">
          {STAGE_ORDER.map((stage) => {
            const st = getStageState(episode, stage);
            const isCurrent = episode.stage === stage;
            const runnable = RUNNABLE_STAGES.includes(stage);
            const isReview = Object.values(REVIEW_AFTER).includes(stage);
            return (
              <div key={stage} className={`stage ${st.status}`} style={isCurrent ? {outline: '2px solid var(--blue)'} : undefined}>
                <div className="row" style={{gap: 6}}>
                  <span className={`dot ${st.status}`} />
                  <span className="t">{stage.replace(/_/g, ' ')}</span>
                </div>
                <span className="s muted">{st.status}</span>
                {runnable && (
                  <button
                    className="btn sm"
                    style={{marginTop: 6}}
                    disabled={!!busy}
                    onClick={() => runStage(stage, st.status === 'complete' ? 'regenerate' : 'run')}
                  >
                    {st.status === 'complete' ? 'Regenerate' : RUN_LABEL[stage] ?? 'Run'}
                  </button>
                )}
                {isReview && isCurrent && (
                  <button className="btn sm primary" style={{marginTop: 6}} disabled={!!busy} onClick={() => approve(stage)}>
                    Approve
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Approval gate */}
      {approval.blockingClaims.length > 0 && (
        <div className="warnbox" style={{marginBottom: 16}}>
          <strong>Publish blocked:</strong> {approval.blockingClaims.length} critical claim(s) are not verified. Verify them in Research before approving publish.
        </div>
      )}

      {/* Tabs */}
      <div className="row" style={{gap: 6, marginBottom: 12}}>
        {(['research', 'script', 'storyboard', 'packaging', 'cost'] as Tab[]).map((t) => (
          <button key={t} className={`btn sm ${tab === t ? 'primary' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div style={{flex: 1}} />
        <button className="btn sm" disabled={!!busy || episode.scenes.length === 0} onClick={startRender}>
          {hasVideo ? 'Re-render video' : 'Render video'}
        </button>
        <button className="btn sm" disabled={!!busy} onClick={checkRender}>
          Check render
        </button>
        <button className="btn sm" disabled={!!busy} onClick={exportPackage}>
          Export publish package
        </button>
      </div>

      {tab === 'research' && <ResearchView episode={episode} />}
      {tab === 'script' && <ScriptView episode={episode} quality={quality} />}
      {tab === 'storyboard' && <StoryboardView episode={episode} />}
      {tab === 'packaging' && <PackagingView episode={episode} />}
      {tab === 'cost' && <CostView episode={episode} />}
    </>
  );
}

function ResearchView({episode}: {episode: Episode}) {
  return (
    <div className="grid2">
      <div className="panel">
        <h2>Sources ({episode.sources.length})</h2>
        {episode.sources.length === 0 ? (
          <div className="muted">Run the research stage to populate sources.</div>
        ) : (
          episode.sources.map((s) => (
            <div key={s.id} className="scene">
              <div className="spread">
                <strong>{s.name}</strong>
                <span className="tag">{s.authority}</span>
              </div>
              <p className="muted">{s.note}</p>
              {s.url && <p><a className="tag" href={s.url} target="_blank" rel="noreferrer">{s.url}</a></p>}
            </div>
          ))
        )}
      </div>
      <div className="panel">
        <h2>Financial claims ({episode.claims.length})</h2>
        {episode.claims.length === 0 ? (
          <div className="muted">No claims yet.</div>
        ) : (
          episode.claims.map((c) => (
            <div key={c.id} className="scene">
              <div className="spread">
                <span className="tag">{c.critical ? 'CRITICAL' : 'context'}</span>
                <ClaimBadge status={c.status} />
              </div>
              <p>{c.text}</p>
              <p className="muted">Evidence: {c.evidence.length} · confidence {Math.round(c.confidence * 100)}%</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ScriptView({episode, quality}: {episode: Episode; quality: number | null}) {
  const s = episode.script;
  if (!s) return <div className="panel muted">No script yet. Run the Scripting stage.</div>;
  const m = s.metrics;
  return (
    <div className="stack">
      {m && (
        <div className="grid4">
          <Kpi n={m.hookScore} label="Hook" />
          <Kpi n={m.curiosityScore} label="Curiosity" />
          <Kpi n={m.clarityScore} label="Clarity" />
          <Kpi n={m.retentionRisk} label="Retention risk" subClass={m.retentionRisk > 30 ? 'sub warnbox' : 'muted'} />
        </div>
      )}
      <div className="panel">
        <div className="spread">
          <h2>Script — {s.estimatedMinutes}m · {s.wordCount} words</h2>
          <span className="tag">{quality !== null ? `quality ${quality}/100` : ''}{s.polished ? ' · polished' : ''}</span>
        </div>
        {s.beats.map((b) => (
          <div key={b.id} className="scene">
            <small className="muted">{b.type} · ~{b.estimatedSec}s</small>
            <p>{b.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryboardView({episode}: {episode: Episode}) {
  if (episode.scenes.length === 0) return <div className="panel muted">No storyboard yet. Run the Storyboarding stage.</div>;
  return (
    <div className="panel">
      <h2>Storyboard ({episode.scenes.length} scenes)</h2>
      {episode.scenes.map((sc) => (
        <div key={sc.id} className="scene">
          <div className="spread">
            <small className="muted">Scene {sc.id} · {sc.durationSec}s · {sc.visualType}{sc.patternInterrupt ? ' · pattern interrupt' : ''}</small>
            {sc.sourceRefs.length > 0 && <span className="tag">{sc.sourceRefs.length} claim ref(s)</span>}
          </div>
          <p><strong>{sc.headline}</strong>{sc.supportingText ? ` — ${sc.supportingText}` : ''}</p>
          <p className="muted">{sc.narration}</p>
        </div>
      ))}
    </div>
  );
}

function PackagingView({episode}: {episode: Episode}) {
  const p = episode.packaging;
  if (!p) return <div className="panel muted">No packaging yet. Run the Packaging stage.</div>;
  return (
    <div className="stack">
      <div className="panel">
        <h2>Title candidates</h2>
        {p.titles.map((t) => (
          <div key={t.text} className="scene spread">
            <span>{t.text}</span>
            <span className="tag">{t.overall}/100 · clickbait {t.scores.clickbaitRisk}</span>
          </div>
        ))}
      </div>
      <div className="grid2">
        <div className="panel">
          <h2>Thumbnail concepts</h2>
          {p.thumbnails.map((t, i) => (
            <div key={i} className="scene">
              <div className="spread"><strong>{t.mainSubject}</strong><span className="tag">“{t.text}”</span></div>
              <p className="muted">{t.composition} · {t.emotion}</p>
              <p className="muted">Conflict: {t.primaryVisualConflict}</p>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>Chapters & Shorts</h2>
          {p.chapters.map((c, i) => (
            <div key={i} className="row" style={{justifyContent: 'space-between'}}>
              <span className="muted">{fmt(c.startSec)}</span>
              <span style={{flex: 1, marginLeft: 10}}>{c.label}</span>
            </div>
          ))}
          <hr className="hr" />
          {p.shorts.map((s, i) => (
            <div key={i} className="scene"><p>{s.hook}</p><small className="muted">~{s.durationSec}s · scenes {s.sceneRefs.join(', ') || '—'}</small></div>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>Description</h2>
        <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0}}>{p.description}</pre>
      </div>
    </div>
  );
}

function CostView({episode}: {episode: Episode}) {
  const c = costBreakdown(episode);
  return (
    <div className="stack">
      <div className="grid4">
        <Kpi n={money(c.research)} label="Research" />
        <Kpi n={money(c.script)} label="Script" />
        <Kpi n={money(c.voice)} label="Voice" />
        <Kpi n={money(c.total)} label="Total" />
      </div>
      <div className="panel">
        <h2>Cost ledger</h2>
        {episode.costs.length === 0 ? (
          <div className="muted">No costs booked yet (mock mode is free).</div>
        ) : (
          <table>
            <thead><tr><th>Category</th><th>Provider</th><th>Cost</th><th>Note</th></tr></thead>
            <tbody>
              {episode.costs.map((e, i) => (
                <tr key={i}><td>{e.category}</td><td>{e.provider}</td><td>{money(e.costUsd)}</td><td className="muted">{e.note}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
