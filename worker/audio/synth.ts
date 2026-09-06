/**
 * Procedural audio synthesizer (license-clean).
 *
 * Generates original SFX + a simple music bed as WAV files using pure math
 * (sine/triangle/noise + envelopes). Because these are generated from first
 * principles here, they carry NO third-party copyright — the asset license is
 * "original-generated / CC0-equivalent". They are intentionally simple PLACEHOLDER
 * cues so the quality proof has real, hearable sound design; swap in licensed
 * pro SFX/music later via the same asset slots.
 */
import {promises as fs} from 'node:fs';

const SR = 48000;

function toWav(samples: Float32Array, sampleRate = SR): Buffer {
  const numFrames = samples.length;
  const buf = Buffer.alloc(44 + numFrames * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + numFrames * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(numFrames * 2, 40);
  for (let i = 0; i < numFrames; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

type Osc = 'sine' | 'triangle' | 'square' | 'noise';
function osc(type: Osc, phase: number): number {
  switch (type) {
    case 'sine':
      return Math.sin(phase);
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case 'square':
      return Math.sign(Math.sin(phase));
    case 'noise':
      return Math.random() * 2 - 1;
  }
}

interface Tone {
  freqStart: number;
  freqEnd?: number;
  durMs: number;
  type?: Osc;
  attackMs?: number;
  releaseMs?: number;
  gain?: number;
}

function render(tones: Tone[]): Float32Array {
  const totalMs = Math.max(...tones.map((t) => t.durMs));
  const n = Math.ceil((totalMs / 1000) * SR);
  const out = new Float32Array(n);
  for (const t of tones) {
    const len = Math.ceil((t.durMs / 1000) * SR);
    const atk = ((t.attackMs ?? 4) / 1000) * SR;
    const rel = ((t.releaseMs ?? t.durMs * 0.6) / 1000) * SR;
    let phase = 0;
    for (let i = 0; i < len && i < n; i++) {
      const prog = i / len;
      const freq = t.freqEnd ? t.freqStart + (t.freqEnd - t.freqStart) * prog : t.freqStart;
      phase += (2 * Math.PI * freq) / SR;
      const env =
        Math.min(1, i / Math.max(1, atk)) * Math.min(1, (len - i) / Math.max(1, rel));
      out[i] += osc(t.type ?? 'sine', phase) * env * (t.gain ?? 0.5);
    }
  }
  // soft clip
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 1.1);
  return out;
}

/** Semantic SFX definitions. */
const SFX: Record<string, () => Float32Array> = {
  money_in: () => render([{freqStart: 660, freqEnd: 990, durMs: 160, type: 'sine', gain: 0.4}, {freqStart: 1320, durMs: 90, type: 'sine', gain: 0.2}]),
  money_out: () => render([{freqStart: 500, freqEnd: 180, durMs: 240, type: 'sine', gain: 0.4}]),
  coin: () => render([{freqStart: 1200, durMs: 60, type: 'triangle', gain: 0.35}, {freqStart: 1800, durMs: 120, type: 'sine', gain: 0.25}]),
  counter: () => render([{freqStart: 900, durMs: 40, type: 'square', gain: 0.15}]),
  tick: () => render([{freqStart: 2000, durMs: 20, type: 'square', gain: 0.2}]),
  impact_soft: () => render([{freqStart: 160, freqEnd: 90, durMs: 220, type: 'sine', gain: 0.6}, {freqStart: 200, durMs: 60, type: 'noise', gain: 0.15}]),
  impact_heavy: () => render([{freqStart: 120, freqEnd: 55, durMs: 340, type: 'sine', gain: 0.85, releaseMs: 260}, {freqStart: 90, durMs: 120, type: 'noise', gain: 0.25}]),
  whoosh: () => render([{freqStart: 300, freqEnd: 1600, durMs: 260, type: 'noise', gain: 0.3, attackMs: 120, releaseMs: 140}]),
  swipe: () => render([{freqStart: 1400, freqEnd: 400, durMs: 180, type: 'noise', gain: 0.25}]),
  card_swipe: () => render([{freqStart: 800, freqEnd: 300, durMs: 200, type: 'noise', gain: 0.28}, {freqStart: 1200, durMs: 40, type: 'sine', gain: 0.2}]),
  pop: () => render([{freqStart: 400, freqEnd: 900, durMs: 90, type: 'sine', gain: 0.4}]),
  paper: () => render([{freqStart: 2000, durMs: 180, type: 'noise', gain: 0.18, attackMs: 6, releaseMs: 160}]),
  receipt: () => render([{freqStart: 1500, durMs: 260, type: 'noise', gain: 0.2, attackMs: 6, releaseMs: 220}]),
  notification: () => render([{freqStart: 880, durMs: 100, type: 'sine', gain: 0.35}, {freqStart: 1320, durMs: 160, type: 'sine', gain: 0.3}]),
  chart_reveal: () => render([{freqStart: 440, freqEnd: 880, durMs: 300, type: 'triangle', gain: 0.3}]),
  success: () => render([{freqStart: 660, durMs: 120, type: 'sine', gain: 0.35}, {freqStart: 990, durMs: 200, type: 'sine', gain: 0.3}]),
  failure: () => render([{freqStart: 400, freqEnd: 200, durMs: 360, type: 'triangle', gain: 0.4}]),
  riser: () => render([{freqStart: 200, freqEnd: 1200, durMs: 900, type: 'triangle', gain: 0.28, attackMs: 400, releaseMs: 120}, {freqStart: 100, freqEnd: 400, durMs: 900, type: 'noise', gain: 0.12}]),
  transition: () => render([{freqStart: 800, freqEnd: 200, durMs: 280, type: 'noise', gain: 0.25}]),
};

export const SFX_NAMES = Object.keys(SFX);

export async function writeSfx(dir: string): Promise<Record<string, string>> {
  await fs.mkdir(dir, {recursive: true});
  const map: Record<string, string> = {};
  for (const [name, gen] of Object.entries(SFX)) {
    const file = `${dir}/${name}.wav`;
    await fs.writeFile(file, toWav(gen()));
    map[name] = file;
  }
  return map;
}

/**
 * Simple original documentary-style music bed: a slow evolving pad built from
 * stacked sine partials + gentle LFO. Mood tints the root frequency/interval.
 * Loopable, low-key, designed to sit UNDER narration. Original/CC0-equivalent.
 */
export function musicBed(mood: 'documentary' | 'tension' | 'optimism' | 'curiosity', durMs = 60000): Float32Array {
  const n = Math.ceil((durMs / 1000) * SR);
  const out = new Float32Array(n);
  const roots: Record<string, number> = {documentary: 110, tension: 98, optimism: 130.8, curiosity: 123.5};
  const root = roots[mood];
  // chord intervals (just-ish): root, fifth, octave, + color tone
  const partials = mood === 'tension' ? [1, 1.5, 2, 2.4] : [1, 1.5, 2, 3];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.06 * t); // slow swell
    let s = 0;
    for (let p = 0; p < partials.length; p++) {
      const f = root * partials[p];
      s += Math.sin(2 * Math.PI * f * t) * (0.16 / (p + 1));
    }
    // gentle high shimmer
    s += Math.sin(2 * Math.PI * root * 4 * t) * 0.02 * lfo;
    out[i] = Math.tanh(s * (0.6 + 0.4 * lfo)) * 0.5;
  }
  // global fade in/out
  const fade = Math.ceil(1.5 * SR);
  for (let i = 0; i < fade; i++) {
    out[i] *= i / fade;
    out[n - 1 - i] *= i / fade;
  }
  return out;
}

export async function writeMusic(dir: string, mood: Parameters<typeof musicBed>[0], durMs: number): Promise<string> {
  await fs.mkdir(dir, {recursive: true});
  const file = `${dir}/music-${mood}.wav`;
  await fs.writeFile(file, toWav(musicBed(mood, durMs)));
  return file;
}
