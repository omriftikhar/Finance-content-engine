import type {TTSOptions, TTSProvider, TTSResult} from './types';

/**
 * Mock TTS.
 *
 * Produces no audio bytes but estimates a realistic narration duration (~2.6
 * words/sec) so downstream audio-aware scene timing can be exercised locally.
 */
export class MockTTSProvider implements TTSProvider {
  readonly name = 'mock';
  async synthesize(text: string, opts: TTSOptions = {}): Promise<TTSResult> {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const rate = opts.rate && opts.rate > 0 ? opts.rate : 1;
    const durationMs = Math.round((words / 2.6 / rate) * 1000);
    return {
      provider: this.name,
      audio: Buffer.alloc(0),
      format: opts.format ?? 'mp3',
      durationMs,
      costUsd: 0,
    };
  }
}
