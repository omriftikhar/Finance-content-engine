import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * Virtual camera system.
 *
 * A camera is a transform applied to a whole scene's content: it can push in on
 * a target, pull out, pan, punch in (fast), shake (impact), or add parallax
 * depth. Camera motion is used to DIRECT ATTENTION, not for random movement —
 * scenes declare intentful moves keyed to the narration.
 */
export type CameraAction =
  | {type: 'static'}
  | {type: 'pushIn'; from?: number; to?: number; delay?: number}
  | {type: 'pullOut'; from?: number; to?: number; delay?: number}
  | {type: 'pan'; dx?: number; dy?: number}
  | {type: 'punchIn'; at: number; amount?: number} // fast scale hit at frame `at`
  | {type: 'shake'; at: number; intensity?: number; decay?: number}
  | {type: 'focus'; x: number; y: number; scale?: number; delay?: number}; // push toward a point (0..1 of frame)

interface CameraProps {
  action?: CameraAction;
  durationInFrames: number;
  children: React.ReactNode;
}

/** Ease-out cubic. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const Camera: React.FC<CameraProps> = ({action = {type: 'static'}, durationInFrames, children}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  let scale = 1;
  let x = 0;
  let y = 0;
  let originX = 50;
  let originY = 50;

  const p = (delay = 0) =>
    easeOut(interpolate(frame, [delay, durationInFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));

  switch (action.type) {
    case 'pushIn': {
      const t = p(action.delay ?? 0);
      scale = interpolate(t, [0, 1], [action.from ?? 1, action.to ?? 1.12]);
      break;
    }
    case 'pullOut': {
      const t = p(action.delay ?? 0);
      scale = interpolate(t, [0, 1], [action.from ?? 1.12, action.to ?? 1]);
      break;
    }
    case 'pan': {
      const t = p(0);
      x = interpolate(t, [0, 1], [0, -(action.dx ?? 0)]);
      y = interpolate(t, [0, 1], [0, -(action.dy ?? 0)]);
      break;
    }
    case 'punchIn': {
      // Fast spring scale hit, then settle.
      const s = spring({frame: frame - action.at, fps, config: {damping: 12, stiffness: 220, mass: 0.6}});
      scale = 1 + (action.amount ?? 0.12) * s * (frame >= action.at ? 1 : 0);
      break;
    }
    case 'shake': {
      const since = frame - action.at;
      if (since >= 0) {
        const decay = Math.max(0, 1 - since / (action.decay ?? 12));
        const amp = (action.intensity ?? 10) * decay;
        x = Math.sin(since * 3.1) * amp;
        y = Math.cos(since * 2.7) * amp;
      }
      break;
    }
    case 'focus': {
      const t = p(action.delay ?? 0);
      originX = action.x * 100;
      originY = action.y * 100;
      scale = interpolate(t, [0, 1], [1, action.scale ?? 1.25]);
      break;
    }
    default:
      break;
  }

  void width;
  void height;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        transformOrigin: `${originX}% ${originY}%`,
        willChange: 'transform',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * Parallax layer: shifts proportionally to a global pan progress to create depth.
 * depth 0 = far (moves least), 1 = near (moves most).
 */
export const ParallaxLayer: React.FC<{depth: number; children: React.ReactNode}> = ({depth, children}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], {extrapolateRight: 'clamp'});
  const shift = interpolate(t, [0, 1], [0, 40 * depth]);
  return <AbsoluteFill style={{transform: `translateX(${shift}px)`}}>{children}</AbsoluteFill>;
};
