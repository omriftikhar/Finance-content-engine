import React from 'react';
import type {VerificationStatus, StageStatus} from '@/lib/schemas';

export function money(n: number): string {
  return n.toLocaleString('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 2});
}

export function pct(n: number | undefined): string {
  return n === undefined ? '—' : `${Math.round(n * 100)}%`;
}

export function num(n: number | undefined): string {
  return n === undefined ? '—' : n.toLocaleString('en-US');
}

export function ClaimBadge({status}: {status: VerificationStatus}) {
  const map: Record<VerificationStatus, {cls: string; label: string}> = {
    VERIFIED: {cls: 'verified', label: 'Verified'},
    NEEDS_REVIEW: {cls: 'review', label: 'Needs review'},
    UNSUPPORTED: {cls: 'unsupported', label: 'Unsupported'},
  };
  const it = map[status];
  return <span className={`badge ${it.cls}`}>{it.label}</span>;
}

export function StageDot({status}: {status: StageStatus}) {
  return <span className={`dot ${status}`} />;
}

export function Kpi({n, label, sub, subClass}: {n: React.ReactNode; label: string; sub?: React.ReactNode; subClass?: string}) {
  return (
    <div className="kpi">
      <div className="n">{n}</div>
      <div className="l">{label}</div>
      {sub !== undefined && <div className={`sub ${subClass ?? 'muted'}`}>{sub}</div>}
    </div>
  );
}
