import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {THEME, SAFE, formatMoney} from '../theme';

/** Full-frame background with a subtle vignette + grid for depth. */
export const Stage: React.FC<{children: React.ReactNode; tone?: 'cool' | 'warm'}> = ({
  children,
  tone = 'cool',
}) => (
  <AbsoluteFill
    style={{
      background:
        tone === 'warm'
          ? `radial-gradient(120% 120% at 50% 0%, ${THEME.bgWarm}, ${THEME.bg})`
          : `radial-gradient(120% 120% at 50% 0%, ${THEME.panel}, ${THEME.bg})`,
      color: THEME.ink,
      fontFamily: THEME.fontBody,
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${THEME.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${THEME.gridLine} 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
        opacity: 0.5,
      }}
    />
    {children}
  </AbsoluteFill>
);

/** Content constrained to the YouTube-safe area. */
export const SafeArea: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({
  children,
  style,
}) => (
  <AbsoluteFill style={{padding: `${SAFE.y}px ${SAFE.x}px`, ...style}}>{children}</AbsoluteFill>
);

/** Fade + rise entrance driven by a spring. */
export const Enter: React.FC<{children: React.ReactNode; delay?: number; y?: number}> = ({
  children,
  delay = 0,
  y = 40,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 200}});
  return (
    <div style={{opacity: s, transform: `translateY(${(1 - s) * y}px)`}}>{children}</div>
  );
};

/** Count-up number. Value comes from scene data (never generated at render). */
export const AnimatedNumber: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  money?: boolean;
  durationInFrames?: number;
  style?: React.CSSProperties;
}> = ({value, prefix = '', suffix = '', decimals = 0, money = false, durationInFrames = 45, style}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const eased = 1 - Math.pow(1 - t, 3);
  const current = value * eased;
  const text = money
    ? formatMoney(current, decimals)
    : `${prefix}${current.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
  return <span style={{fontVariantNumeric: 'tabular-nums', ...style}}>{text}</span>;
};

/** Kicker label above a headline. */
export const Kicker: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      textTransform: 'uppercase',
      letterSpacing: 6,
      fontSize: 26,
      fontWeight: 700,
      color: THEME.accent,
      fontFamily: THEME.fontMono,
    }}
  >
    {children}
  </div>
);

export const Headline: React.FC<{children: React.ReactNode; size?: number}> = ({
  children,
  size = 108,
}) => (
  <div
    style={{
      fontFamily: THEME.fontDisplay,
      fontWeight: 800,
      fontSize: size,
      lineHeight: 1.0,
      letterSpacing: -3,
    }}
  >
    {children}
  </div>
);

/** Lower-third caption/subtitle. */
export const Caption: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 70,
        display: 'flex',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          textAlign: 'center',
          fontSize: 40,
          lineHeight: 1.3,
          fontWeight: 600,
          color: THEME.ink,
          background: 'rgba(0,0,0,0.55)',
          padding: '14px 28px',
          borderRadius: 10,
        }}
      >
        {text}
      </div>
    </div>
  );
};
