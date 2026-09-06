/**
 * Audio mixing engine (FFmpeg).
 *
 * Combines three stems into one broadcast-ready track:
 *   - narration (priority)
 *   - music bed (kept low so narration always dominates)
 *   - SFX events (placed at exact times with adelay)
 *
 * Final EBU R128 loudness normalization (loudnorm) targeting ~-14 LUFS (typical
 * for online video), which also limits true peak to avoid clipping.
 *
 * NOTE: the FFmpeg bundled with @remotion/compositor is a MINIMAL build without
 * `sidechaincompress`/`asplit`/`afade`, so we do not do dynamic sidechain ducking
 * here — instead the music bed is mixed at a low static level (narration-safe)
 * and the synth bed is deliberately quiet. To enable dynamic ducking, install a
 * full FFmpeg and set FFMPEG_BIN; the graph can then use sidechaincompress.
 */
import {ffmpeg} from '../ffmpeg';

export interface SfxEvent {
  file: string;
  atMs: number;
  gainDb?: number;
}

export interface MixOptions {
  narrationFile: string;
  musicFile?: string;
  sfx?: SfxEvent[];
  out: string;
  narrationGainDb?: number;
  musicGainDb?: number;
  targetLufs?: number;
}

function dbToLin(db: number): number {
  return Math.pow(10, db / 20);
}

export async function mixAudio(opts: MixOptions): Promise<string> {
  const {
    narrationFile,
    musicFile,
    sfx = [],
    out,
    narrationGainDb = 0,
    musicGainDb = -20,
    targetLufs = -14,
  } = opts;

  const inputs: string[] = ['-i', narrationFile];
  if (musicFile) inputs.push('-i', musicFile);
  for (const s of sfx) inputs.push('-i', s.file);

  const musicIdx = musicFile ? 1 : -1;
  const sfxBase = musicFile ? 2 : 1;

  const filters: string[] = [];
  const mixLabels: string[] = [];

  // Narration (priority stem).
  filters.push(`[0:a]volume=${dbToLin(narrationGainDb).toFixed(4)}[narr]`);
  mixLabels.push('[narr]');

  // Music: quiet static bed (narration-safe), looped/trimmed by amix duration.
  if (musicFile) {
    filters.push(`[${musicIdx}:a]volume=${dbToLin(musicGainDb).toFixed(4)}[music]`);
    mixLabels.push('[music]');
  }

  // SFX: place each at its time.
  sfx.forEach((s, i) => {
    const idx = sfxBase + i;
    filters.push(`[${idx}:a]adelay=${s.atMs}|${s.atMs},volume=${dbToLin(s.gainDb ?? -6).toFixed(4)}[sfx${i}]`);
    mixLabels.push(`[sfx${i}]`);
  });

  // Mix (narration is first/longest -> drives duration). normalize=0 keeps our gains.
  filters.push(
    `${mixLabels.join('')}amix=inputs=${mixLabels.length}:normalize=0:dropout_transition=0:duration=first[mixed]`,
  );
  filters.push(`[mixed]loudnorm=I=${targetLufs}:TP=-1.5:LRA=11[outa]`);

  // This minimal ffmpeg won't infer the muxer from a .m4a extension; force mp4.
  const forceFmt = /\.(m4a|aac)$/i.test(out) ? ['-f', 'mp4'] : [];
  await ffmpeg([
    '-y',
    ...inputs,
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[outa]',
    '-ar',
    '48000',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    ...forceFmt,
    out,
  ]);
  return out;
}

/** Concatenate per-scene narration MP3s into one continuous WAV track. */
export async function concatNarration(files: string[], out: string): Promise<string> {
  const inputs: string[] = [];
  files.forEach((f) => inputs.push('-i', f));
  const n = files.length;
  const concatInputs = files.map((_, i) => `[${i}:a]`).join('');
  const filter = `${concatInputs}amix=inputs=${n}:normalize=0[dummy]`;
  // amix would overlap; use the concat via -filter_complex concat instead.
  void filter;
  const cat = `${concatInputs}concat=n=${n}:v=0:a=1[outa]`;
  await ffmpeg(['-y', ...inputs, '-filter_complex', cat, '-map', '[outa]', '-ar', '48000', '-c:a', 'pcm_s16le', out]);
  return out;
}
