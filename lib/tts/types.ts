/**
 * TTS provider abstraction.
 *
 * Voice target: natural American English, documentary/storytelling tone, not
 * robotic, not promotional. A mock/local fallback always exists so the pipeline
 * runs without keys. Generated audio is stored as episode assets and its
 * duration eventually drives scene timing.
 */
export interface TTSOptions {
  voice?: string;
  /** speaking rate multiplier, 1 = normal */
  rate?: number;
  format?: 'mp3' | 'wav';
}

export interface TTSResult {
  provider: string;
  /** Raw audio bytes (empty in mock mode). */
  audio: Buffer;
  format: 'mp3' | 'wav';
  durationMs: number;
  costUsd: number;
}

export interface TTSProvider {
  readonly name: string;
  synthesize(text: string, opts?: TTSOptions): Promise<TTSResult>;
}
