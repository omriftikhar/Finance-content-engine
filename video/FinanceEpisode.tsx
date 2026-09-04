import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {Episode, Scene} from '@/lib/schemas';
import {VIDEO} from './theme';
import {Stage, Caption} from './components/primitives';
import {SceneRenderer} from './components/scenes';

/**
 * Main episode composition.
 *
 * Renders each storyboard scene as a timed Sequence with a fade transition, a
 * caption track, and (when available) narration audio. Scene durations follow
 * scene.durationSec, which the voice stage makes audio-aware.
 */

const SceneBlock: React.FC<{scene: Scene; showCaptions: boolean}> = ({scene, showCaptions}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  const tone = scene.musicMood === 'tension' ? 'warm' : 'cool';
  return (
    <AbsoluteFill style={{opacity: fadeIn}}>
      <Stage tone={tone}>
        <SceneRenderer scene={scene} />
        {showCaptions && <Caption text={scene.narration} />}
      </Stage>
    </AbsoluteFill>
  );
};

export interface FinanceEpisodeProps {
  episode: Episode;
  showCaptions?: boolean;
  /** Map of sceneId -> public audio path (staticFile) for narration playback. */
  audioBySceneId?: Record<number, string>;
}

export const FinanceEpisode: React.FC<FinanceEpisodeProps> = ({
  episode,
  showCaptions = true,
  audioBySceneId = {},
}) => {
  const fps = VIDEO.fps;
  let from = 0;

  return (
    <AbsoluteFill style={{backgroundColor: '#0e1116'}}>
      {episode.scenes.map((scene) => {
        const duration = Math.max(1, Math.round(scene.durationSec * fps));
        const audioPath = audioBySceneId[scene.id];
        const node = (
          <Sequence key={scene.id} from={from} durationInFrames={duration}>
            <SceneBlock scene={scene} showCaptions={showCaptions} />
            {audioPath ? <Audio src={staticFile(audioPath)} /> : null}
          </Sequence>
        );
        from += duration;
        return node;
      })}
    </AbsoluteFill>
  );
};

export function totalDurationInFrames(episode: Episode, fps = VIDEO.fps): number {
  return episode.scenes.reduce((sum, s) => sum + Math.max(1, Math.round(s.durationSec * fps)), 0);
}
