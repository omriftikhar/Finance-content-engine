import type {TTSOptions, TTSProvider, TTSResult} from './types';

/**
 * MiniMax T2A (text-to-audio) adapter.
 *
 * Uses MiniMax's HTTP T2A endpoint. Requires MINIMAX_API_KEY and MINIMAX_GROUP_ID.
 * Cost is estimated per character (list pricing varies by model/voice); tune
 * MINIMAX_TTS_COST_PER_1K as needed. Falls back to throwing if credentials are
 * missing so the router can select the mock instead.
 */
export interface MiniMaxTTSConfig {
  apiKey: string;
  groupId: string;
  baseUrl: string;
  model: string;
  defaultVoice: string;
  costPer1kChars: number;
}

interface MiniMaxT2AResponse {
  data?: {audio?: string; audio_length?: number};
  extra_info?: {audio_length?: number};
}

export class MiniMaxTTSProvider implements TTSProvider {
  readonly name = 'minimax';
  constructor(private readonly cfg: MiniMaxTTSConfig) {}

  async synthesize(text: string, opts: TTSOptions = {}): Promise<TTSResult> {
    const url = `${this.cfg.baseUrl.replace(/\/$/, '')}/t2a_v2?GroupId=${encodeURIComponent(this.cfg.groupId)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: this.cfg.model,
        text,
        stream: false,
        voice_setting: {
          voice_id: opts.voice ?? this.cfg.defaultVoice,
          speed: opts.rate ?? 1,
        },
        audio_setting: {format: opts.format ?? 'mp3'},
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`minimax tts failed (${res.status}): ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as MiniMaxT2AResponse;
    const hex = data.data?.audio ?? '';
    const audio = hex ? Buffer.from(hex, 'hex') : Buffer.alloc(0);
    const durationMs =
      data.extra_info?.audio_length ??
      data.data?.audio_length ??
      Math.round((text.split(/\s+/).length / 2.6) * 1000);

    return {
      provider: this.name,
      audio,
      format: opts.format ?? 'mp3',
      durationMs,
      costUsd: (text.length / 1000) * this.cfg.costPer1kChars,
    };
  }
}
