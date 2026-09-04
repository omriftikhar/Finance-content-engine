import React from 'react';
import {Composition} from 'remotion';
import type {Episode} from '@/lib/schemas';
import {FinanceEpisode, totalDurationInFrames, type FinanceEpisodeProps} from './FinanceEpisode';
import {VIDEO} from './theme';
import {pilotEpisode} from '@/data/pilot';

// Remotion constrains props to Record<string, unknown>; a plain typed component
// is compatible at runtime, so we adapt the type at the Composition boundary.
const Comp = FinanceEpisode as unknown as React.FC<Record<string, unknown>>;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="FinanceEpisode"
      component={Comp}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
      durationInFrames={totalDurationInFrames(pilotEpisode)}
      defaultProps={
        {episode: pilotEpisode, showCaptions: true, audioBySceneId: {}} satisfies FinanceEpisodeProps as Record<
          string,
          unknown
        >
      }
      calculateMetadata={({props}) => ({
        durationInFrames: totalDurationInFrames((props as {episode: Episode}).episode),
      })}
    />
  );
};
