import type {TTSOptions, TTSProvider, TTSResult, WordTiming} from './types';

/**
 * Mock TTS.
 *
 * Produces no audio bytes but estimates a realistic narration duration (~2.6
 * words/sec) and synthetic per-word timings so downstream narration-driven
 * timing (scene duration, caption/word highlighting) can be exercised with no keys.
 */
export class MockTTSProvider implements TTSProvider {
  readonly name = 'mock';
  async synthesize(text: string, opts: TTSOptions = {}): Promise<TTSResult> {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const rate = opts.rate && opts.rate > 0 ? opts.rate : 1;
    const perWordMs = 1000 / 2.6 / rate;
    const durationMs = Math.round(words.length * perWordMs);

    const timestamps: WordTiming[] = words.map((w, i) => ({
      text: w,
      startMs: Math.round(i * perWordMs),
      endMs: Math.round((i + 1) * perWordMs),
    }));

    return {
      provider: this.name,
      model: 'mock',
      voiceId: opts.voice ?? 'mock',
      audio: Buffer.alloc(0),
      format: opts.format ?? 'mp3',
      durationMs,
      timestamps,
      estimatedCostUsd: 0,
      costUsd: 0,
    };
  }
}
