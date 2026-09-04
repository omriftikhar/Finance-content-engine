import {getBudgetUsd} from '@/lib/pipeline/cost';

export const dynamic = 'force-dynamic';

/**
 * Settings — read-only view of provider/env status. Only booleans are surfaced;
 * API keys are never sent to the client. Change values via environment variables.
 */
export default function SettingsPage() {
  const textProvider = (process.env.TEXT_PROVIDER ?? 'mock').toLowerCase();
  const ttsProvider = (process.env.TTS_PROVIDER ?? 'mock').toLowerCase();
  const rows: {label: string; value: string; ok: boolean}[] = [
    {label: 'Text provider', value: textProvider, ok: true},
    {label: 'TTS provider', value: ttsProvider, ok: true},
    {label: 'DeepSeek key', value: bool(process.env.DEEPSEEK_API_KEY), ok: !!process.env.DEEPSEEK_API_KEY},
    {label: 'MiniMax key', value: bool(process.env.MINIMAX_API_KEY), ok: !!process.env.MINIMAX_API_KEY},
    {label: 'MiniMax group id', value: bool(process.env.MINIMAX_GROUP_ID), ok: !!process.env.MINIMAX_GROUP_ID},
    {label: 'Premium/OpenAI key', value: bool(process.env.PREMIUM_API_KEY ?? process.env.OPENAI_API_KEY), ok: !!(process.env.PREMIUM_API_KEY ?? process.env.OPENAI_API_KEY)},
    {label: 'Supabase URL', value: bool(process.env.SUPABASE_URL), ok: !!process.env.SUPABASE_URL},
    {label: 'R2 bucket', value: bool(process.env.R2_BUCKET), ok: !!process.env.R2_BUCKET},
    {label: 'Store driver', value: (process.env.STORE_DRIVER ?? 'file').toLowerCase(), ok: true},
  ];
  const mock = textProvider === 'mock';

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Configuration</div>
          <h1>Settings</h1>
          <div className="muted">Read-only. Configure everything via environment variables — keys never reach the browser.</div>
        </div>
      </div>

      {mock && (
        <div className="okbox" style={{marginBottom: 16}}>
          Running in <strong>mock mode</strong>: the full pipeline works with no API keys. Set TEXT_PROVIDER=deepseek (and a key) to use real providers.
        </div>
      )}

      <div className="panel">
        <h2>Providers & infrastructure</h2>
        <table>
          <thead><tr><th>Setting</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td><span className={`badge ${r.ok ? 'verified' : 'neutral'}`}>{r.value}</span></td>
              </tr>
            ))}
            <tr><td>Per-episode budget</td><td><span className="badge neutral">${getBudgetUsd().toFixed(2)}</span></td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function bool(v: string | undefined): string {
  return v ? 'set' : 'not set';
}
