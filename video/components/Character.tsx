import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {THEME} from '../theme';
import type {CharacterEmotion} from '@/lib/schemas';

/**
 * Original recurring protagonist — placeholder identity.
 *
 * A deliberately simple, original geometric figure (NOT a copy of any existing
 * or copyrighted character). Emotion changes expression only, so the identity
 * stays consistent between scenes. Real illustrated assets can replace this by
 * swapping the render while keeping the same props contract.
 */
export interface CharacterProps {
  emotion?: CharacterEmotion;
  size?: number;
}

const SKIN = '#e8b48c';
const SHIRT = '#3a6ea5';

function mouthFor(emotion: CharacterEmotion): React.ReactNode {
  switch (emotion) {
    case 'happy':
    case 'celebrating':
      return <path d="M 42 78 Q 60 96 78 78" stroke="#3a2a20" strokeWidth={4} fill="none" />;
    case 'shocked':
      return <ellipse cx={60} cy={82} rx={9} ry={12} fill="#3a2a20" />;
    case 'stressed':
    case 'checkingBills':
      return <path d="M 42 86 Q 60 74 78 86" stroke="#3a2a20" strokeWidth={4} fill="none" />;
    case 'confused':
      return <path d="M 44 84 Q 56 80 68 86 Q 74 88 76 84" stroke="#3a2a20" strokeWidth={4} fill="none" />;
    case 'thinking':
      return <path d="M 46 84 L 72 84" stroke="#3a2a20" strokeWidth={4} fill="none" />;
    default:
      return <path d="M 46 82 Q 60 88 74 82" stroke="#3a2a20" strokeWidth={4} fill="none" />;
  }
}

function browsFor(emotion: CharacterEmotion): React.ReactNode {
  const stressed = emotion === 'stressed' || emotion === 'shocked' || emotion === 'confused';
  return (
    <>
      <path
        d={stressed ? 'M 34 46 L 52 52' : 'M 34 50 L 52 50'}
        stroke="#3a2a20"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path
        d={stressed ? 'M 68 52 L 86 46' : 'M 68 50 L 86 50'}
        stroke="#3a2a20"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </>
  );
}

export const Character: React.FC<CharacterProps> = ({emotion = 'neutral', size = 420}) => {
  const frame = useCurrentFrame();
  // Subtle idle bob so the figure feels alive without distracting motion.
  const bob = interpolate(frame % 90, [0, 45, 90], [0, -6, 0]);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 150"
      style={{transform: `translateY(${bob}px)`, filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))'}}
    >
      {/* body */}
      <path d="M 20 150 Q 20 108 60 108 Q 100 108 100 150 Z" fill={SHIRT} />
      {/* neck */}
      <rect x={52} y={96} width={16} height={18} fill={SKIN} />
      {/* head */}
      <ellipse cx={60} cy={64} rx={34} ry={38} fill={SKIN} />
      {/* hair */}
      <path d="M 26 54 Q 30 24 60 24 Q 90 24 94 54 Q 78 40 60 40 Q 42 40 26 54 Z" fill="#3a2a20" />
      {/* eyes */}
      <circle cx={46} cy={62} r={5} fill="#2a1d14" />
      <circle cx={74} cy={62} r={5} fill="#2a1d14" />
      {browsFor(emotion)}
      {mouthFor(emotion)}
      {emotion === 'stressed' && (
        <text x={92} y={40} fontSize={16} fill={THEME.warn}>
          💢
        </text>
      )}
    </svg>
  );
};
