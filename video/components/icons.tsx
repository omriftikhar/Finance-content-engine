import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, spring} from 'remotion';
import {THEME} from '../theme';

/**
 * Original, deterministic finance iconography (no copyrighted art). Each icon
 * animates in with a spring so expense scenes feel alive rather than static.
 */

function useEnter(delay = 0) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping: 200}});
}

export const HouseIcon: React.FC<{size?: number}> = ({size = 360}) => {
  const s = useEnter();
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{transform: `scale(${0.8 + s * 0.2})`, opacity: s}}>
      <path d="M12 58 L60 20 L108 58 Z" fill={THEME.accent} />
      <rect x="24" y="58" width="72" height="46" rx="4" fill={THEME.panel} stroke={THEME.accent} strokeWidth="3" />
      <rect x="52" y="76" width="16" height="28" fill={THEME.accent} />
      <rect x="32" y="66" width="14" height="14" fill={THEME.gold} opacity="0.9" />
      <rect x="74" y="66" width="14" height="14" fill={THEME.gold} opacity="0.9" />
    </svg>
  );
};

export const CarIcon: React.FC<{size?: number}> = ({size = 360}) => {
  const frame = useCurrentFrame();
  const s = useEnter();
  const roll = interpolate(frame, [0, 30], [-40, 0], {extrapolateRight: 'clamp'});
  return (
    <svg width={size} height={size} viewBox="0 0 140 100" style={{opacity: s, transform: `translateX(${roll}px)`}}>
      <path d="M14 64 L28 40 L96 40 L114 64 Z" fill={THEME.blue} />
      <rect x="8" y="62" width="118" height="20" rx="8" fill={THEME.accent} />
      <circle cx="36" cy="84" r="12" fill="#0b0d10" stroke={THEME.ink} strokeWidth="3" />
      <circle cx="100" cy="84" r="12" fill="#0b0d10" stroke={THEME.ink} strokeWidth="3" />
      <rect x="40" y="44" width="24" height="16" fill={THEME.panel} />
      <rect x="70" y="44" width="24" height="16" fill={THEME.panel} />
    </svg>
  );
};

export const CreditCardIcon: React.FC<{size?: number}> = ({size = 360}) => {
  const frame = useCurrentFrame();
  const s = useEnter();
  const tilt = interpolate(frame, [0, 40], [8, 0], {extrapolateRight: 'clamp'});
  return (
    <svg width={size} height={size} viewBox="0 0 160 110" style={{opacity: s, transform: `rotate(${tilt}deg)`}}>
      <rect x="10" y="14" width="140" height="88" rx="12" fill={THEME.warn} />
      <rect x="10" y="34" width="140" height="16" fill="#0b0d10" opacity="0.5" />
      <rect x="24" y="60" width="34" height="24" rx="4" fill={THEME.gold} />
      <rect x="24" y="90" width="90" height="6" rx="3" fill={THEME.ink} opacity="0.7" />
    </svg>
  );
};

export const DocumentIcon: React.FC<{size?: number}> = ({size = 320}) => {
  const frame = useCurrentFrame();
  const s = useEnter();
  const lines = interpolate(frame, [8, 40], [0, 5], {extrapolateRight: 'clamp'});
  return (
    <svg width={size} height={size} viewBox="0 0 120 140" style={{opacity: s}}>
      <rect x="20" y="10" width="80" height="120" rx="6" fill="#f4f1e9" />
      <rect x="20" y="10" width="80" height="22" rx="6" fill={THEME.accent} />
      {Array.from({length: Math.floor(lines)}).map((_, i) => (
        <rect key={i} x="30" y={44 + i * 16} width={i % 2 ? 46 : 60} height="6" rx="3" fill="#9aa4b2" />
      ))}
      {/* official stamp */}
      <circle cx="82" cy="112" r="14" fill="none" stroke={THEME.warn} strokeWidth="3" opacity={interpolate(frame, [30, 45], [0, 1], {extrapolateRight: 'clamp'})} />
    </svg>
  );
};
