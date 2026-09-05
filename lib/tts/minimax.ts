import type {TTSOptions, TTSProvider, TTSResult} from './types';

/**
 * MiniMax T2A v2 (text-to-audio) adapter.
 *
 * Produces natural American-English narration. Requires MINIMAX_API_KEY and
 * MINIMAX_GROUP_ID. Response returns hex-encoded audio + extra_info.audio_length
 * (ms). Hardened with timeout, bounded retries on transient errors, and MiniMax's
 * base_resp status-code check (MiniMax returns HTTP 200 even on logical errors).
 *
 * The TTSProvider abstraction is preserved so ElevenLabs can be added later.
 */
export interface MiniMaxTTSConfig {
  apiKey: string;
  groupId: string;
  baseUrl: string;
  model: string;
  defaultVoice: string;
  costPer1kChars: number;
  timeoutMs?: number;
  maxAttempts?: number;
}

interface MiniMaxT2AResponse {
  data?: {audio?: string; status?: number};
  extra_info?: {audio_length?: number; audio_size?: number; word_count?: number};
  base_resp?: {status_code?: number; status_msg?: string};
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class MiniMaxTTSError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = 'MiniMaxTTSError';
  }
}

export class MiniMaxTTSProvider implements TTSProvider {
  readonly name = 'minimax';
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor(private readonly cfg: MiniMaxTTSConfig) {
    this.timeoutMs = cfg.timeoutMs ?? Number(process.env.TTS_TIMEOUT_MS ?? 90_000);
    this.maxAttempts = cfg.maxAttempts ?? Number(process.env.TTS_MAX_ATTEMPTS ?? 3);
  }

  async synthesize(text: string, opts: TTSOptions = {}): Promise<TTSResult> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const started = Date.now();
      try {
        const result = await this.attempt(text, opts);
        console.log(
          `[tts:minimax] ok attempt=${attempt} ms=${Date.now() - started} chars=${text.length} durMs=${result.durationMs} cost$=${result.costUsd.toFixed(6)}`,
        );
        return result;
      } catch (err) {
        lastErr = err;
        const retryable = err instanceof MiniMaxTTSError ? err.retryable : true;
        console.log(
          `[tts:minimax] fail attempt=${attempt}/${this.maxAttempts} ms=${Date.now() - started} retryable=${retryable} err=${(err as Error).message.slice(0, 140)}`,
        );
        if (!retryable || attempt === this.maxAttempts) break;
        await sleep(Math.round(600 * 2 ** (attempt - 1)));
      }
    }
    throw lastErr instanceof Error ? lastErr : new MiniMaxTTSError('unknown TTS error', false);
  }

  private async attempt(text: string, opts: TTSOptions): Promise<TTSResult> {
    const url = `${this.cfg.baseUrl.replace(/\/$/, '')}/t2a_v2?GroupId=${encodeURIComponent(this.cfg.groupId)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {'content-type': 'application/json', authorization: `Bearer ${this.cfg.apiKey}`},
        body: JSON.stringify({
          model: this.cfg.model,
          text,
          stream: false,
          voice_setting: {voice_id: opts.voice ?? this.cfg.defaultVoice, speed: opts.rate ?? 1},
          audio_setting: {format: opts.format ?? 'mp3', sample_rate: 32000, bitrate: 128000},
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new MiniMaxTTSError(`timed out after ${this.timeoutMs}ms`, true);
      }
      throw new MiniMaxTTSError(`network error: ${(err as Error).message}`, true);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      const retryable = res.status === 429 || res.status >= 500;
      throw new MiniMaxTTSError(`http ${res.status}: ${detail.slice(0, 200)}`, retryable);
    }

    const data = (await res.json()) as MiniMaxT2AResponse;
    // MiniMax returns HTTP 200 with a base_resp.status_code for logical errors.
    const code = data.base_resp?.status_code ?? 0;
    if (code !== 0) {
      // 1002 rate limit / 1039 busy are retryable; auth/param errors are not.
      const retryable = code === 1002 || code === 1039 || code === 1000;
      throw new MiniMaxTTSError(`base_resp ${code}: ${data.base_resp?.status_msg ?? 'error'}`, retryable);
    }

    const hex = data.data?.audio ?? '';
    if (!hex) throw new MiniMaxTTSError('empty audio in response', true);
    const audio = Buffer.from(hex, 'hex');
    const durationMs = data.extra_info?.audio_length ?? Math.round((text.split(/\s+/).length / 2.6) * 1000);
    const cost = (text.length / 1000) * this.cfg.costPer1kChars;

    return {
      provider: this.name,
      model: this.cfg.model,
      voiceId: opts.voice ?? this.cfg.defaultVoice,
      audio,
      format: opts.format ?? 'mp3',
      durationMs,
      timestamps: [], // MiniMax T2A v2 REST does not return word alignment here
      estimatedCostUsd: cost,
      costUsd: cost,
    };
  }
}
