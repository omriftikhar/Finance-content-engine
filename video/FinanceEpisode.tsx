import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Episode, Scene} from '@/lib/schemas';
import {VIDEO} from './theme';
import {Stage, Caption, WordCaption, type WordTiming} from './components/primitives';
import {SceneRenderer} from './components/scenes';

/**
 * Main episode composition.
 *
 * Each storyboard scene renders as a timed Sequence with: a fade transition, a
 * deliberate camera move (push-in / pull-out / pan), an optional caption, and
 * narration audio. A single background-music bed plays under the whole episode
 * and is DUCKED (lowered) whenever narration is present, so narration always
 * stays clear. No copyrighted audio is bundled — music/SFX are asset slots that
 * resolve to royalty-free files placed in public/ (see audioBySceneId / musicSrc).
 */

/** Camera transform for a scene based on its `camera` field. */
function useCameraTransform(scene: Scene, durationInFrames: number): string {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], {extrapolateRight: 'clamp'});
  switch (scene.camera) {
    case 'slowPushIn':
      return `scale(${1 + t * 0.06})`;
    case 'slowPullOut':
      return `scale(${1.06 - t * 0.06})`;
    case 'pan':
      return `translateX(${interpolate(t, [0, 1], [-24, 24])}px) scale(1.04)`;
    default:
      return 'scale(1)';
  }
}

const SceneBlock: React.FC<{
  scene: Scene;
  showCaptions: boolean;
  durationInFrames: number;
  timings?: WordTiming[];
}> = ({scene, showCaptions, durationInFrames, timings}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0.0], {
    extrapolateLeft: 'clamp',
  });
  const tone = scene.musicMood === 'tension' ? 'warm' : 'cool';
  const transform = useCameraTransform(scene, durationInFrames);
  return (
    <AbsoluteFill style={{opacity: Math.min(fadeIn, fadeOut)}}>
      <AbsoluteFill style={{transform, transformOrigin: 'center center'}}>
        <Stage tone={tone}>
          <SceneRenderer scene={scene} />
        </Stage>
      </AbsoluteFill>
      {showCaptions ? <WordCaption text={scene.narration} timings={timings} /> : null}
    </AbsoluteFill>
  );
};

export interface FinanceEpisodeProps {
  episode: Episode;
  showCaptions?: boolean;
  /** Map of sceneId -> public audio path (staticFile) for narration playback. */
  audioBySceneId?: Record<number, string>;
  /** Optional public path to a royalty-free background music bed. */
  musicSrc?: string;
  /** Optional map of sfx name -> public path. */
  sfxSrc?: Record<string, string>;
  /** Base music volume (0–1) before ducking. */
  musicVolume?: number;
  /** Per-scene narration word timings for karaoke-style captions. */
  timingsBySceneId?: Record<number, WordTiming[]>;
}

/** Music bed ducked under narration: lower volume while any scene has audio. */
const MusicBed: React.FC<{src: string; duckFrames: Array<[number, number]>; baseVolume: number; total: number}> = ({
  src,
  duckFrames,
  baseVolume,
  total,
}) => {
  const volumeAt = (f: number) => {
    const inNarration = duckFrames.some(([a, b]) => f >= a && f < b);
    const intro = interpolate(f, [0, 20], [0, baseVolume], {extrapolateRight: 'clamp'});
    const outro = interpolate(f, [total - 25, total], [baseVolume, 0], {extrapolateLeft: 'clamp'});
    const envelope = Math.min(intro, outro);
    return inNarration ? envelope * 0.28 : envelope; // duck to 28% under narration
  };
  return <Audio src={staticFile(src)} volume={volumeAt} loop />;
};

export const FinanceEpisode: React.FC<FinanceEpisodeProps> = ({
  episode,
  showCaptions = true,
  audioBySceneId = {},
  musicSrc,
  sfxSrc = {},
  musicVolume = 0.5,
  timingsBySceneId = {},
}) => {
  const {fps} = useVideoConfig();
  const total = totalDurationInFrames(episode, fps);

  // Compute the frame ranges where narration audio plays, for music ducking.
  const duckFrames: Array<[number, number]> = [];
  let cursor = 0;
  for (const scene of episode.scenes) {
    const dur = Math.max(1, Math.round(scene.durationSec * fps));
    if (audioBySceneId[scene.id]) duckFrames.push([cursor, cursor + dur]);
    cursor += dur;
  }

  let from = 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#0e1116'}}>
      {musicSrc && <MusicBed src={musicSrc} duckFrames={duckFrames} baseVolume={musicVolume} total={total} />}
      {episode.scenes.map((scene) => {
        const duration = Math.max(1, Math.round(scene.durationSec * fps));
        const audioPath = audioBySceneId[scene.id];
        const firstSfx = scene.sfx[0] ? sfxSrc[scene.sfx[0]] : undefined;
        const node = (
          <Sequence key={scene.id} from={from} durationInFrames={duration}>
            <SceneBlock
              scene={scene}
              showCaptions={showCaptions}
              durationInFrames={duration}
              timings={timingsBySceneId[scene.id]}
            />
            {audioPath ? <Audio src={staticFile(audioPath)} /> : null}
            {firstSfx ? <Audio src={staticFile(firstSfx)} volume={0.6} /> : null}
          </Sequence>
        );
        from += duration;
        return node;
      })}
    </AbsoluteFill>
  );
};

export function totalDurationInFrames(episode: Episode, fps: number = VIDEO.fps): number {
  return episode.scenes.reduce((sum, s) => sum + Math.max(1, Math.round(s.durationSec * fps)), 0);
}
