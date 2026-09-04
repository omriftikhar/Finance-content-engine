import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {THEME} from '../theme';
import type {ChartPoint} from '@/lib/schemas';

const CHART_W = 1100;
const CHART_H = 480;

/** Deterministic animated bar chart. Values come from scene.chartData. */
export const BarChart: React.FC<{data: ChartPoint[]}> = ({data}) => {
  const frame = useCurrentFrame();
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = 28;
  const barW = (CHART_W - gap * (data.length - 1)) / Math.max(1, data.length);

  return (
    <svg width={CHART_W} height={CHART_H + 70}>
      {data.map((d, i) => {
        const grow = interpolate(frame, [i * 4, i * 4 + 22], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const h = (d.value / max) * CHART_H * grow;
        const x = i * (barW + gap);
        const y = CHART_H - h;
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={8}
              fill={d.highlight ? THEME.warn : THEME.accent}
            />
            <text x={x + barW / 2} y={CHART_H + 34} textAnchor="middle" fontSize={26} fill={THEME.inkDim}>
              {d.label}
            </text>
            <text x={x + barW / 2} y={y - 14} textAnchor="middle" fontSize={28} fontWeight={700} fill={THEME.ink} opacity={grow}>
              {Math.round(d.value * grow)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/** Deterministic animated line chart. */
export const LineChart: React.FC<{data: ChartPoint[]}> = ({data}) => {
  const frame = useCurrentFrame();
  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value), 0);
  const stepX = CHART_W / Math.max(1, data.length - 1);
  const toY = (v: number) => CHART_H - ((v - min) / (max - min || 1)) * CHART_H;
  const reveal = interpolate(frame, [0, 40], [0, 1], {extrapolateRight: 'clamp'});
  const shown = Math.max(1, Math.floor(reveal * data.length));
  const pts = data.slice(0, shown).map((d, i) => `${i * stepX},${toY(d.value)}`);

  return (
    <svg width={CHART_W} height={CHART_H + 70}>
      <polyline points={pts.join(' ')} fill="none" stroke={THEME.accent} strokeWidth={6} strokeLinecap="round" />
      {data.slice(0, shown).map((d, i) => (
        <g key={d.label}>
          <circle cx={i * stepX} cy={toY(d.value)} r={d.highlight ? 12 : 8} fill={d.highlight ? THEME.gold : THEME.accent} />
          <text x={i * stepX} y={CHART_H + 40} textAnchor="middle" fontSize={24} fill={THEME.inkDim}>
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

export interface ComparisonSide {
  label: string;
  value?: number;
  caption?: string;
}

export const ComparisonPanel: React.FC<{sides: ComparisonSide[]}> = ({sides}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'flex', gap: 60, alignItems: 'stretch'}}>
      {sides.map((s, i) => {
        const enter = interpolate(frame, [i * 8, i * 8 + 16], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: THEME.panel,
              borderRadius: 20,
              padding: 48,
              border: `2px solid ${i === sides.length - 1 ? THEME.warn : THEME.gridLine}`,
              opacity: enter,
              transform: `translateY(${(1 - enter) * 30}px)`,
            }}
          >
            <div style={{fontSize: 30, color: THEME.inkDim, marginBottom: 16}}>{s.label}</div>
            {s.value !== undefined && (
              <div style={{fontSize: 96, fontWeight: 800, color: i === sides.length - 1 ? THEME.warn : THEME.accent}}>
                {Math.round(s.value * enter)}%
              </div>
            )}
            {s.caption && <div style={{fontSize: 28, color: THEME.inkDim, marginTop: 8}}>{s.caption}</div>}
          </div>
        );
      })}
    </div>
  );
};
