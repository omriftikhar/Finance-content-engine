import type {AudioFormat, TTSOptions, TTSProvider, TTSResult} from './types';

/**
 * Soniox TTS v2 adapter (REST).
 *
 * Verified against the official docs (soniox.com/docs/api-reference/tts):
 *   POST https://tts-rt.soniox.com/tts
 *   Authorization: Bearer <SONIOX_API_KEY>
 *   body: { model, language, voice, audio_format, text, sample_rate?, speed? }
 *   response: RAW AUDIO BYTES (content-type per audio_format). No timestamps are
 *   returned by this REST endpoint (word alignment is a Soniox STT feature), so
 *   `timestamps` is left empty here — the field is preserved for when/if the API
 *   provides it or we derive alignment via STT.
 *
 * Model:  tts-rt-v1
 * US English voices (from GET /v1/tts-models): Maya, Daniel, Noah, Nina, Emma,
 *   Jack, Adrian, Claire, Grace, Owen, Mina, Kenji.
 */
export interface SonioxTTSConfig {
  apiKey: string;
  baseUrl: string; // https://tts-rt.soniox.com
  modelsBaseUrl: string; // https://api.soniox.com
  model: string; // tts-rt-v1
  defaultVoice: string; // e.g. Daniel
  language: string; // en
  costPer1kChars: number;
  timeoutMs?: number;
  maxAttempts?: number;
}

export class SonioxTTSError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly status?: number) {
    super(message);
    this.name = 'SonioxTTSError';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Parse duration (ms) from a WAV header; falls back to a word-rate estimate. */
function wavDurationMs(buf: Buffer, fallbackText: string): number {
  try {
    if (buf.length > 44 && buf.toString('ascii', 0, 4) === 'RIFF') {
      const byteRate = buf.readUInt32LE(28); // bytes/sec
      // find 'data' chunk size
      let offset = 12;
      while (offset + 8 <= buf.length) {
        const id = buf.toString('ascii', offset, offset + 4);
        const size = buf.readUInt32LE(offset + 4);
        if (id === 'data') {
          if (byteRate > 0) return Math.round((size / byteRate) * 1000);
          break;
        }
        offset += 8 + size;
      }
    }
  } catch {
    /* fall through */
  }
  return Math.round((fallbackText.split(/\s+/).filter(Boolean).length / 2.6) * 1000);
}

export class SonioxTTSProvider implements TTSProvider {
  readonly name = 'soniox';
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor(private readonly cfg: SonioxTTSConfig) {
    this.timeoutMs = cfg.timeoutMs ?? Number(process.env.TTS_TIMEOUT_MS ?? 90_000);
    this.maxAttempts = cfg.maxAttempts ?? Number(process.env.TTS_MAX_ATTEMPTS ?? 3);
  }

  async synthesize(text: string, opts: TTSOptions = {}): Promise<TTSResult> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const started = Date.now();
      try {
        const r = await this.attempt(text, opts);
        console.log(
          `[tts:soniox] ok attempt=${attempt} ms=${Date.now() - started} voice=${r.voiceId} chars=${text.length} durMs=${r.durationMs} cost$=${r.estimatedCostUsd.toFixed(6)}`,
        );
        return r;
      } catch (err) {
        lastErr = err;
        const retryable = err instanceof SonioxTTSError ? err.retryable : true;
        console.log(
          `[tts:soniox] fail attempt=${attempt}/${this.maxAttempts} ms=${Date.now() - started} retryable=${retryable} err=${(err as Error).message.slice(0, 160)}`,
        );
        if (!retryable || attempt === this.maxAttempts) break;
        await sleep(Math.round(600 * 2 ** (attempt - 1)));
      }
    }
    throw lastErr instanceof Error ? lastErr : new SonioxTTSError('unknown Soniox error', false);
  }

  private async attempt(text: string, opts: TTSOptions): Promise<TTSResult> {
    if (text.length > 5000) {
      throw new SonioxTTSError('text exceeds Soniox 5000-char limit; chunk before calling', false);
    }
    const format: AudioFormat = opts.format ?? 'wav';
    const voice = opts.voice ?? this.cfg.defaultVoice;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/tts`, {
        method: 'POST',
        headers: {'content-type': 'application/json', authorization: `Bearer ${this.cfg.apiKey}`},
        body: JSON.stringify({
          model: this.cfg.model,
          language: opts.language ?? this.cfg.language,
          voice,
          audio_format: format, // 'mp3' | 'wav'
          text,
          ...(opts.rate ? {speed: Math.max(0.7, Math.min(1.3, opts.rate))} : {}),
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new SonioxTTSError(`timed out after ${this.timeoutMs}ms`, true);
      }
      throw new SonioxTTSError(`network error: ${(err as Error).message}`, true);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      const retryable = res.status === 429 || res.status >= 500;
      throw new SonioxTTSError(`http ${res.status}: ${detail.slice(0, 200)}`, retryable, res.status);
    }

    const audio = Buffer.from(await res.arrayBuffer());
    if (audio.length === 0) throw new SonioxTTSError('empty audio response', true);
    const durationMs =
      format === 'wav'
        ? wavDurationMs(audio, text)
        : Math.round((text.split(/\s+/).filter(Boolean).length / 2.6) * 1000);

    return {
      provider: this.name,
      model: this.cfg.model,
      voiceId: voice,
      audio,
      format,
      durationMs,
      timestamps: [], // REST TTS endpoint returns no alignment data
      estimatedCostUsd: (text.length / 1000) * this.cfg.costPer1kChars,
      costUsd: (text.length / 1000) * this.cfg.costPer1kChars,
    };
  }

  /** Lists available TTS models/voices (GET https://api.soniox.com/v1/tts-models). */
  async listModels(): Promise<unknown> {
    const res = await fetch(`${this.cfg.modelsBaseUrl.replace(/\/$/, '')}/v1/tts-models`, {
      headers: {authorization: `Bearer ${this.cfg.apiKey}`},
    });
    if (!res.ok) throw new SonioxTTSError(`list models http ${res.status}`, false, res.status);
    return res.json();
  }
}

/** US-English built-in voices confirmed from Soniox docs (for the Voice Test UI). */
export const SONIOX_US_VOICES = [
  'Maya',
  'Daniel',
  'Noah',
  'Nina',
  'Emma',
  'Jack',
  'Adrian',
  'Claire',
  'Grace',
  'Owen',
  'Mina',
  'Kenji',
] as const;
