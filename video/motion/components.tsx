import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {THEME, formatMoney} from '../theme';

/**
 * Professional motion-graphics component library.
 *
 * Principles: spring/eased motion (never linear fade-wait-fade), number rolling,
 * mask reveals, scale emphasis, physical impacts. Each component tells part of
 * the financial story rather than decorating a card.
 */

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Rolling money counter — digits count up with an ease and a subtle overshoot. */
export const MoneyCounter: React.FC<{
  value: number;
  fromValue?: number;
  durationInFrames?: number;
  delay?: number;
  size?: number;
  color?: string;
  decimals?: number;
}> = ({value, fromValue = 0, durationInFrames = 40, delay = 0, size = 180, color = THEME.ink, decimals = 0}) => {
  const frame = useCurrentFrame();
  const t = easeOutCubic(
    interpolate(frame, [delay, delay + durationInFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );
  const current = fromValue + (value - fromValue) * t;
  const pop = spring({frame: frame - (delay + durationInFrames), fps: 30, config: {damping: 10, stiffness: 200}});
  const scale = 1 + Math.max(0, pop) * 0.04 * (frame >= delay + durationInFrames ? 1 : 0);
  return (
    <span
      style={{
        fontFamily: THEME.fontDisplay,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: -size * 0.03,
        color,
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-block',
        transform: `scale(${scale})`,
      }}
    >
      {formatMoney(current, decimals)}
    </span>
  );
};

/**
 * ExpenseImpact — a labeled cost that flies in and SLAMS into place, shaking,
 * with a red debit. Used when narration names an expense (tax/housing/car).
 */
export const ExpenseImpact: React.FC<{
  label: string;
  amount: number;
  at?: number;
  side?: 'left' | 'right';
}> = ({label, amount, at = 0, side = 'right'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - at, fps, config: {damping: 11, stiffness: 260, mass: 0.7}});
  const dir = side === 'right' ? 1 : -1;
  const x = interpolate(s, [0, 1], [dir * 420, 0]);
  const settle = frame - at;
  const shake = settle >= 0 && settle < 10 ? Math.sin(settle * 3) * (10 - settle) * 0.8 : 0;
  return (
    <div
      style={{
        transform: `translate(${x + shake}px, 0)`,
        opacity: interpolate(s, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        background: 'rgba(229,72,77,0.12)',
        border: `2px solid ${THEME.warn}`,
        borderRadius: 14,
        padding: '18px 30px',
      }}
    >
      <span style={{fontSize: 34, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: THEME.ink}}>{label}</span>
      <span style={{fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 64, color: THEME.warn}}>
        −{formatMoney(amount)}
      </span>
    </div>
  );
};

/**
 * KineticHeadline — words animate in individually with a mask reveal + rise,
 * so a headline "arrives" rather than fading. Optional word to emphasize (scale).
 */
export const KineticHeadline: React.FC<{
  text: string;
  size?: number;
  delay?: number;
  emphasize?: string;
  align?: 'left' | 'center';
}> = ({text, size = 96, delay = 0, emphasize, align = 'left'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `0 ${size * 0.22}px`,
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        fontFamily: THEME.fontDisplay,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: -size * 0.03,
      }}
    >
      {words.map((w, i) => {
        const s = spring({frame: frame - delay - i * 3, fps, config: {damping: 200}});
        const isEmph = emphasize && w.replace(/[^\w$,%.]/g, '').toLowerCase() === emphasize.toLowerCase();
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', paddingBottom: '0.05em'}}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - s) * size * 0.9}px)`,
                color: isEmph ? THEME.accent : THEME.ink,
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/**
 * MoneyTank — visual metaphor: a tank/pile of money that DRAINS as expenses hit.
 * `level` 0..1 (fraction remaining). Liquid drops with easing; label shows amount.
 */
export const MoneyTank: React.FC<{
  level: number;
  fromLevel?: number;
  label?: string;
  amount?: number;
  width?: number;
  height?: number;
  delay?: number;
}> = ({level, fromLevel = 1, label, amount, width = 340, height = 460, delay = 0}) => {
  const frame = useCurrentFrame();
  const t = easeInOutCubic(
    interpolate(frame, [delay, delay + 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );
  const lvl = fromLevel + (level - fromLevel) * t;
  const fillH = height * lvl;
  const wobble = Math.sin(frame * 0.3) * 3 * (1 - t);
  return (
    <div style={{width, height, position: 'relative'}}>
      {/* tank outline */}
      <div style={{position: 'absolute', inset: 0, border: `4px solid ${THEME.inkDim}`, borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.02)'}}>
        {/* liquid */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: fillH,
            background: `linear-gradient(180deg, ${THEME.accent}, ${THEME.accentDim})`,
            borderTop: `4px solid ${THEME.accent}`,
            transform: `translateY(${wobble}px)`,
          }}
        />
        {/* $ marks floating in the liquid */}
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-end', padding: 20, gap: 14, opacity: 0.35}}>
          {Array.from({length: Math.round(lvl * 18)}).map((_, i) => (
            <span key={i} style={{fontSize: 26, color: '#0b0d10', fontWeight: 800}}>$</span>
          ))}
        </div>
      </div>
      {label && (
        <div style={{position: 'absolute', top: -54, width: '100%', textAlign: 'center', fontSize: 26, color: THEME.inkDim, textTransform: 'uppercase', letterSpacing: 2}}>
          {label}
        </div>
      )}
      {amount !== undefined && (
        <div style={{position: 'absolute', bottom: -60, width: '100%', textAlign: 'center'}}>
          <MoneyCounter value={amount} fromValue={amount / Math.max(0.001, level) * fromLevel} durationInFrames={24} delay={delay} size={54} decimals={0} />
        </div>
      )}
    </div>
  );
};

/** BankBalance — a phone/app style balance card whose number drops on cue. */
export const BankBalance: React.FC<{value: number; fromValue?: number; delay?: number}> = ({value, fromValue = 0, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 200}});
  const low = value < 500;
  return (
    <div
      style={{
        width: 460,
        background: '#101319',
        border: `1px solid ${THEME.border}`,
        borderRadius: 28,
        padding: 40,
        transform: `translateY(${(1 - s) * 30}px)`,
        opacity: s,
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{fontSize: 24, color: THEME.inkDim, letterSpacing: 2, textTransform: 'uppercase'}}>Checking · Available</div>
      <div style={{marginTop: 14}}>
        <MoneyCounter value={value} fromValue={fromValue} durationInFrames={34} delay={delay + 4} size={96} color={low ? THEME.warn : THEME.ink} decimals={2} />
      </div>
      <div style={{marginTop: 20, height: 8, borderRadius: 4, background: '#1c2129', overflow: 'hidden'}}>
        <div style={{height: '100%', width: `${Math.min(100, Math.max(3, (value / 8333) * 100))}%`, background: low ? THEME.warn : THEME.accent}} />
      </div>
    </div>
  );
};

/** Callout — a small annotation that pops next to a value. */
export const Callout: React.FC<{text: string; delay?: number; color?: string}> = ({text, delay = 0, color = THEME.gold}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 200}});
  return (
    <span
      style={{
        display: 'inline-block',
        transform: `scale(${s})`,
        background: color,
        color: '#0b0d10',
        fontWeight: 800,
        fontSize: 30,
        padding: '6px 16px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
};
