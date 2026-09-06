import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {THEME} from './theme';
import {CinematicScene} from './scenes/CinematicScene';

/**
 * Pilot #001 — VISUAL STYLE TEST (~20s, 2 shots).
 *
 * SCENE-FIRST: both shots are cinematic environment plates (real illustrated
 * world) with integrated editorial typography composited on top. No dark-grid,
 * no UI cards, no floating icons. Camera direction (push + track) gives depth.
 * Numbers are Remotion overlays (never baked into the image).
 */
const NARR = 'narration/pilot-100k-broke';
const HOME = 'assets/style-test/jack-home-hero-v1.png';

const DISPLAY = THEME.fontDisplay;
const MONO = THEME.fontMono;
const GOLD = '#e7b95d';
const CREAM = '#f6f2e9';

export const VisualStyleTest: React.FC = () => {
  const {fps} = useVideoConfig();
  const s1 = Math.round(9.6 * fps);
  const s2 = Math.round(10.4 * fps);
  return (
    <AbsoluteFill style={{background: '#05070a'}}>
      <Sequence durationInFrames={s1}>
        <ShotMilestone />
      </Sequence>
      <Sequence from={s1} durationInFrames={s2}>
        <ShotMonthlyReality />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Editorial kicker + reveal helpers (integrated typography, not subtitle box). */
const useReveal = (startSec: number, durSec = 0.6) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return interpolate(f, [startSec * fps, (startSec + durSec) * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
};

// ─────────────────────────────────────────────────────────────
// SHOT 1 — The six-figure milestone (cinematic home, achievement then tension)
// ─────────────────────────────────────────────────────────────
const ShotMilestone: React.FC = () => {
  const {fps} = useVideoConfig();
  const reveal = useReveal(1.1);
  const line = useReveal(1.6, 0.7);
  const tension = useReveal(6.1, 0.9);
  const caption = useReveal(2.8, 0.5);

  return (
    <CinematicScene src={HOME} scaleFrom={1.03} scaleTo={1.16} xFrom={-6} xTo={-30} scrim="left" scrimStrength={0.55}>
      <Audio src={staticFile(`${NARR}/narration-scene-1.mp3`)} />
      <div style={{position: 'absolute', top: 150, left: 150, fontFamily: MONO, color: '#a7b2bd', fontSize: 21, letterSpacing: 5}}>
        THE SIX-FIGURE MILESTONE
      </div>
      <div
        style={{
          position: 'absolute',
          top: 208,
          left: 142,
          opacity: reveal,
          transform: `translateY(${(1 - reveal) * 34}px)`,
          color: CREAM,
          fontFamily: DISPLAY,
          fontSize: 176,
          fontWeight: 900,
          letterSpacing: -8,
          textShadow: '0 6px 40px rgba(0,0,0,0.5)',
        }}
      >
        $100,000
      </div>
      <div style={{position: 'absolute', top: 400, left: 156, opacity: reveal, color: GOLD, fontFamily: MONO, fontSize: 29, letterSpacing: 8}}>
        A&nbsp;YEAR
      </div>
      <div style={{position: 'absolute', left: 150, top: 548, width: 470, height: 2, background: GOLD, transform: `scaleX(${line})`, transformOrigin: 'left'}} />
      <div
        style={{
          position: 'absolute',
          top: 588,
          left: 150,
          opacity: tension,
          transform: `translateY(${(1 - tension) * 16}px)`,
          color: '#fff',
          fontFamily: DISPLAY,
          fontSize: 62,
          fontWeight: 800,
          lineHeight: 1.04,
        }}
      >
        SO WHY DOESN'T
        <br />
        <span style={{color: GOLD}}>IT FEEL RICH?</span>
      </div>
      {/* integrated editorial caption — emphasis phrase only, no box */}
      <div
        style={{
          position: 'absolute',
          bottom: 104,
          left: 150,
          opacity: caption,
          transform: `translateY(${(1 - caption) * 14}px)`,
          color: '#fff',
          fontFamily: DISPLAY,
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: 1.5,
          textShadow: '0 3px 20px #000',
        }}
      >
        ON PAPER, HE MADE IT.
      </div>
      {/* subtle film grain */}
      <Grain opacity={0.05} />
      <SafeGuides show={false} />
      <span style={{display: 'none'}}>{fps}</span>
    </CinematicScene>
  );
};

// ─────────────────────────────────────────────────────────────
// SHOT 2 — Annual number enters real life → one month (NO grid, NO card)
// The "12 months" is a sweeping light band of ticks; camera punches into one
// month; $8,333 is integrated kinetic type; income arrives as a warm light sweep.
// ─────────────────────────────────────────────────────────────
const ShotMonthlyReality: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // annual number holds, then lifts away as the monthly number rises
  const toMonthly = interpolate(frame, [fps * 2.6, fps * 4.0], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const em = (n: number) => n * n * (3 - 2 * n);
  const t = em(toMonthly);

  // rolling $8,333 counter
  const countP = interpolate(frame, [fps * 3.0, fps * 4.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const monthly = Math.round(8333 * em(countP));

  // income light-sweep across the frame (money entering the month)
  const sweep = interpolate(frame, [fps * 5.0, fps * 7.6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // camera pushes further in on shot 2 for progression
  const kicker = useReveal(0.4, 0.5);
  const caption = useReveal(6.4, 0.5);

  return (
    <CinematicScene src={HOME} scaleFrom={1.16} scaleTo={1.42} xFrom={-30} xTo={-96} yFrom={0} yTo={-14} scrim="left" scrimStrength={0.72}>
      <Audio src={staticFile(`${NARR}/narration-scene-4.mp3`)} />

      <div style={{position: 'absolute', top: 104, left: 150, opacity: kicker, color: '#d7e2e9', fontFamily: MONO, fontSize: 22, letterSpacing: 5}}>
        THE ANNUAL NUMBER ENTERS REAL LIFE
      </div>

      {/* annual number (lifts up + fades as we move to monthly) */}
      <div
        style={{
          position: 'absolute',
          top: 176,
          left: 150,
          color: '#f7f4ee',
          fontFamily: DISPLAY,
          fontWeight: 900,
          fontSize: 116,
          letterSpacing: -5,
          opacity: 1 - t,
          transform: `translateY(${-96 * t}px)`,
        }}
      >
        $100,000 <span style={{fontSize: 40, letterSpacing: 2, color: GOLD}}>/ YEAR</span>
      </div>

      {/* twelve-month light band — thin ticks sweeping in, not boxy cards */}
      <div style={{position: 'absolute', left: 154, top: 330, display: 'flex', gap: 10, opacity: 0.8 * (1 - t * 0.2)}}>
        {Array.from({length: 12}).map((_, i) => {
          const on = interpolate(frame, [fps * 0.7 + i * 2.5, fps * 1.0 + i * 2.5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const isFirst = i === 0;
          return (
            <div
              key={i}
              style={{
                width: isFirst ? 10 : 6,
                height: interpolate(on, [0, 1], [8, isFirst ? 64 : 40]),
                borderRadius: 4,
                background: isFirst ? GOLD : 'rgba(231,185,93,0.35)',
                boxShadow: isFirst ? `0 0 18px ${GOLD}` : 'none',
                alignSelf: 'flex-end',
                opacity: on,
              }}
            />
          );
        })}
      </div>

      {/* monthly number rises up as annual lifts away — integrated, not a card */}
      <div
        style={{
          position: 'absolute',
          top: 176,
          left: 150,
          opacity: t,
          transform: `translateY(${60 * (1 - t)}px)`,
          color: '#f7f4ee',
          fontFamily: DISPLAY,
          fontWeight: 900,
          fontSize: 150,
          letterSpacing: -7,
          textShadow: '0 6px 40px rgba(0,0,0,0.5)',
        }}
      >
        ${monthly.toLocaleString('en-US')}
      </div>
      <div style={{position: 'absolute', top: 350, left: 158, opacity: t, color: GOLD, fontFamily: MONO, fontSize: 27, letterSpacing: 7}}>
        GROSS · ONE MONTH
      </div>

      {/* income light-sweep: a warm bar of light crossing the month */}
      <div
        style={{
          position: 'absolute',
          top: 470,
          left: 150,
          width: 620,
          height: 6,
          borderRadius: 6,
          background: `linear-gradient(90deg, rgba(231,185,93,0) , ${GOLD} , rgba(231,185,93,0))`,
          transform: `translateX(${interpolate(sweep, [0, 1], [-80, 40])}px)`,
          opacity: interpolate(sweep, [0, 0.1, 0.9, 1], [0, 1, 1, 0.2]),
          filter: 'blur(0.3px)',
          boxShadow: `0 0 26px ${GOLD}`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 104,
          left: 150,
          opacity: caption,
          transform: `translateY(${(1 - caption) * 14}px)`,
          color: '#fff',
          fontFamily: DISPLAY,
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: 1.2,
          textShadow: '0 3px 20px #000',
        }}
      >
        THEN REALITY STARTS TAKING ITS CUT.
      </div>
      <Grain opacity={0.05} />
    </CinematicScene>
  );
};

/** Subtle animated film grain for texture (kills the flat digital look). */
const Grain: React.FC<{opacity: number}> = ({opacity}) => {
  const frame = useCurrentFrame();
  const shift = (frame * 7) % 12;
  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: 'overlay',
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.5%22/%3E%3C/svg%3E")',
        backgroundSize: '260px 260px',
        transform: `translate(${shift}px, ${-shift}px)`,
      }}
    />
  );
};

const SafeGuides: React.FC<{show: boolean}> = ({show}) => (show ? <AbsoluteFill style={{border: '1px solid rgba(255,0,0,0.3)', margin: 54}} /> : null);

export const visualStyleTestDuration = (fps = 30) => Math.round(20 * fps);
