import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * CinematicScene — the core reusable "shot" primitive.
 *
 * A full-bleed illustrated environment plate with a slow directed camera move
 * (Ken-Burns push/track), an optional directional scrim so integrated
 * typography stays legible, and an optional foreground vignette for depth. This
 * replaces the flat dark-grid + icon approach: every story beat is a SHOT of a
 * real environment. Text/number overlays are composited ON TOP by the caller
 * (deterministic Remotion — never baked into the image).
 */
const smooth = (n: number) => n * n * (3 - 2 * n);

export type ScrimSide = 'left' | 'right' | 'bottom' | 'none';

export interface CinematicSceneProps {
  /** public-relative image path (staticFile). */
  src: string;
  /** camera scale keyframes */
  scaleFrom?: number;
  scaleTo?: number;
  /** horizontal track (px) for parallax feel */
  xFrom?: number;
  xTo?: number;
  yFrom?: number;
  yTo?: number;
  scrim?: ScrimSide;
  scrimStrength?: number; // 0..1
  /** color grade tint overlay (rgba) */
  grade?: string;
  vignette?: boolean;
  children?: React.ReactNode;
}

const scrimGradient = (side: ScrimSide, s: number): string => {
  const a = Math.min(0.92, 0.55 + s * 0.4);
  switch (side) {
    case 'left':
      return `linear-gradient(90deg, rgba(5,7,9,${a}), rgba(5,7,9,${a * 0.15}) 58%, rgba(5,7,9,${a * 0.25}))`;
    case 'right':
      return `linear-gradient(270deg, rgba(5,7,9,${a}), rgba(5,7,9,0) 58%)`;
    case 'bottom':
      return `linear-gradient(0deg, rgba(5,7,9,${a}), rgba(5,7,9,0) 55%)`;
    default:
      return 'none';
  }
};

export const CinematicScene: React.FC<CinematicSceneProps> = ({
  src,
  scaleFrom = 1.04,
  scaleTo = 1.14,
  xFrom = 0,
  xTo = 0,
  yFrom = 0,
  yTo = 0,
  scrim = 'left',
  scrimStrength = 0.5,
  grade = 'linear-gradient(180deg, rgba(10,20,30,0.10), rgba(20,10,6,0.16))',
  vignette = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const p = smooth(interpolate(frame, [0, durationInFrames], [0, 1], {extrapolateRight: 'clamp'}));
  const scale = scaleFrom + (scaleTo - scaleFrom) * p;
  const x = xFrom + (xTo - xFrom) * p;
  const y = yFrom + (yTo - yFrom) * p;

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#05070a'}}>
      <AbsoluteFill style={{transform: `scale(${scale}) translate(${x}px, ${y}px)`, transformOrigin: 'center', willChange: 'transform'}}>
        <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      {grade && <AbsoluteFill style={{background: grade, mixBlendMode: 'soft-light'}} />}
      {scrim !== 'none' && <AbsoluteFill style={{background: scrimGradient(scrim, scrimStrength)}} />}
      {vignette && (
        <AbsoluteFill
          style={{
            boxShadow: 'inset 0 0 320px rgba(0,0,0,0.7)',
            background: 'radial-gradient(130% 120% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45))',
          }}
        />
      )}
      {children}
    </AbsoluteFill>
  );
};
