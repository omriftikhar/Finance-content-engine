/**
 * TTS provider abstraction (provider-agnostic).
 *
 * Voice target: natural American English, documentary/storytelling tone, not
 * robotic, not promotional. Providers implement TTSProvider; the rest of the app
 * depends only on the normalized TTSResult below — never on any provider's raw
 * response shape. A mock/local fallback always exists so the pipeline runs
 * without keys. Active provider is chosen by TTS_PROVIDER (soniox|minimax|mock).
 */
export type AudioFormat = 'mp3' | 'wav';

export interface TTSOptions {
  /** Provider voice id/name (e.g. Soniox "Daniel", MiniMax voice_id). */
  voice?: string;
  /** speaking rate multiplier, 1 = normal. */
  rate?: number;
  format?: AudioFormat;
  /** BCP-47-ish language code where the provider needs it (Soniox: "en"). */
  language?: string;
}

/** Provider-agnostic word/phrase timing (ms from audio start). */
export interface WordTiming {
  text: string;
  startMs: number;
  endMs: number;
}

/**
 * Normalized TTS result. `audioPath` is filled by the voice engine after it
 * persists `audio` to disk/storage; providers return `audio` bytes + metadata.
 * `timestamps` is populated only when the provider returns alignment data.
 */
export interface TTSResult {
  provider: string;
  model: string;
  voiceId: string;
  /** Raw audio bytes (empty in mock mode). */
  audio: Buffer;
  format: AudioFormat;
  /** Set by the voice engine once the audio is written. */
  audioPath?: string;
  durationMs: number;
  timestamps: WordTiming[];
  estimatedCostUsd: number;
  /** @deprecated use estimatedCostUsd — kept for existing callers. */
  costUsd: number;
}

export interface TTSProvider {
  readonly name: string;
  synthesize(text: string, opts?: TTSOptions): Promise<TTSResult>;
}
