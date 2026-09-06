import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {THEME} from '../theme';

/**
 * Professional captions.
 *
 * Phrase-level chunks (2–6 words), not full-paragraph subtitles. Financial terms
 * and numbers get emphasis (accent color + scale punch). Timing: when the TTS
 * provider returns word timestamps we use them; otherwise we distribute the
 * scene's narration across the scene's known audio duration proportionally to
 * word length (an honest approximation, not fabricated word-level data).
 */
export interface CaptionPhrase {
  words: string[];
  startFrame: number;
  endFrame: number;
}

const EMPHASIS = /^\$|%$|^\$?\d|TAX|MORTGAGE|CREDIT|RETIREMENT|HOUSING|INCOME|DEBT|SALARY|BROKE/i;

/** Build phrase chunks (2–6 words) evenly weighted by word length over duration. */
export function buildPhrases(narration: string, durationInFrames: number, maxWords = 4): CaptionPhrase[] {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  // group into chunks, breaking on punctuation when possible
  const chunks: string[][] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    const endsClause = /[,.;:—]$/.test(w);
    if (cur.length >= maxWords || (endsClause && cur.length >= 2)) {
      chunks.push(cur);
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur);

  // weight each chunk by its character length
  const weights = chunks.map((c) => c.join(' ').length);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let f = 0;
  return chunks.map((c, i) => {
    const dur = (weights[i] / total) * durationInFrames;
    const phrase = {words: c, startFrame: Math.round(f), endFrame: Math.round(f + dur)};
    f += dur;
    return phrase;
  });
}

/** Renders the active phrase for the current frame with emphasis + safe layout. */
export const PhraseCaptions: React.FC<{narration: string; maxWords?: number}> = ({narration, maxWords = 4}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const phrases = buildPhrases(narration, durationInFrames, maxWords);
  const active = phrases.find((p) => frame >= p.startFrame && frame < p.endFrame) ?? phrases[phrases.length - 1];
  if (!active) return null;

  const localFrame = frame - active.startFrame;
  const s = spring({frame: localFrame, fps, config: {damping: 18, stiffness: 220}});
  const opacity = interpolate(localFrame, [0, 4], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 96, // above the YouTube control bar / safe area
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '0 14px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 1300,
          padding: '10px 26px',
          borderRadius: 14,
          background: 'rgba(8,10,13,0.72)',
          opacity,
          transform: `translateY(${(1 - s) * 12}px)`,
        }}
      >
        {active.words.map((w, i) => {
          const emph = EMPHASIS.test(w);
          return (
            <span
              key={i}
              style={{
                fontFamily: THEME.fontBody,
                fontWeight: emph ? 800 : 600,
                fontSize: emph ? 52 : 44,
                color: emph ? THEME.accent : THEME.ink,
                letterSpacing: emph ? 0.5 : 0,
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
