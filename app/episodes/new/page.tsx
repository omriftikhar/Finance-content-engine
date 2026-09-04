'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';

const PILOT = 'Why Americans Making $100,000 Still Feel Broke';

export default function NewEpisodePage() {
  const router = useRouter();
  const [topic, setTopic] = useState(PILOT);
  const [minutes, setMinutes] = useState(9);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({topic, targetMinutes: minutes}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create episode');
      router.push(`/episodes/${data.episode.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setBusy(false);
    }
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Production</div>
          <h1>New Episode</h1>
          <div className="muted">Create an episode in the IDEA stage, then run each pipeline stage in the workspace.</div>
        </div>
      </div>

      <div className="panel" style={{maxWidth: 680}}>
        <label>Video topic</label>
        <textarea value={topic} onChange={(e) => setTopic(e.target.value)} />
        <div style={{marginTop: 14, maxWidth: 200}}>
          <label>Target minutes</label>
          <input
            type="number"
            min={6}
            max={20}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </div>
        {error && <div className="warnbox" style={{marginTop: 14}}>{error}</div>}
        <div className="row" style={{marginTop: 16}}>
          <button className="btn primary" onClick={create} disabled={busy || topic.trim().length < 8}>
            {busy ? 'Creating…' : 'Create episode'}
          </button>
          <span className="muted">Tip: the pilot topic loads the gold-standard fixture flow.</span>
        </div>
      </div>
    </>
  );
}
