import type {Episode} from '@/lib/schemas';
import {pilotSources, pilotClaims} from './pilotResearch';
import {pilotScript} from './pilotScript';
import {pilotScenes} from './pilotStoryboard';
import {pilotPackaging} from './pilotPackaging';

/**
 * Gold-standard pilot fixture: "Why Americans Making $100,000 Still Feel Broke".
 *
 * A full ~8.6-minute episode: verified research (data/pilotResearch.ts), a
 * 1,338-word script (data/pilotScript.ts), and a 46-scene storyboard
 * (data/pilotStoryboard.ts). Critical numeric claims are VERIFIED statutory tax
 * mechanics; representative-household expenses are clearly-labeled assumptions.
 * No fabricated current statistics.
 */
export const pilotEpisode: Episode = {
  id: 'pilot-100k-broke',
  topic: 'Why Americans Making $100,000 Still Feel Broke',
  title: 'Why Americans Making $100,000 Still Feel Broke',
  hook: 'A six-figure salary sounds rich—until taxes, housing, cars, insurance and everyday life start taking their cut.',
  targetMinutes: 9,
  createdAt: '2026-09-04T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
  stage: 'READY_TO_RENDER',
  stages: {
    RESEARCHING: {stage: 'RESEARCHING', status: 'complete', costUsd: 0, attempts: 1},
    RESEARCH_REVIEW: {stage: 'RESEARCH_REVIEW', status: 'complete', costUsd: 0, attempts: 0},
    SCRIPTING: {stage: 'SCRIPTING', status: 'complete', costUsd: 0, attempts: 1},
    SCRIPT_REVIEW: {stage: 'SCRIPT_REVIEW', status: 'complete', costUsd: 0, attempts: 0},
    STORYBOARDING: {stage: 'STORYBOARDING', status: 'complete', costUsd: 0, attempts: 1},
    VOICE_GENERATION: {stage: 'VOICE_GENERATION', status: 'pending', costUsd: 0, attempts: 0},
    PACKAGING: {stage: 'PACKAGING', status: 'complete', costUsd: 0, attempts: 1},
  },
  sources: pilotSources,
  claims: pilotClaims,
  script: pilotScript,
  scenes: pilotScenes,
  packaging: pilotPackaging,
  assets: [],
  costs: [],
  estimatedCostUsd: 0,
  approved: false,
};
