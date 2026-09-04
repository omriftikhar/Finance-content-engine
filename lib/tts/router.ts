import 'server-only';
import type {TTSProvider} from './types';
import {MockTTSProvider} from './mock';
import {MiniMaxTTSProvider} from './minimax';

/**
 * Selects a TTS provider from env. Order: explicit TTS_PROVIDER, then MiniMax if
 * credentialed, else mock. ElevenLabs can be added here later behind the same
 * interface.
 */
export function getTTSProvider(): TTSProvider {
  const provider = (process.env.TTS_PROVIDER ?? 'mock').toLowerCase();
  if (provider === 'mock') return new MockTTSProvider();

  if (provider === 'minimax' && process.env.MINIMAX_API_KEY && process.env.MINIMAX_GROUP_ID) {
    return new MiniMaxTTSProvider({
      apiKey: process.env.MINIMAX_API_KEY,
      groupId: process.env.MINIMAX_GROUP_ID,
      baseUrl: process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.io/v1',
      model: process.env.MINIMAX_TTS_MODEL ?? 'speech-2.5-hd-preview',
      defaultVoice: process.env.MINIMAX_TTS_VOICE ?? 'English_expressive_narrator',
      costPer1kChars: Number(process.env.MINIMAX_TTS_COST_PER_1K ?? 0.1),
    });
  }

  return new MockTTSProvider();
}

export function isMockTTS(): boolean {
  const provider = (process.env.TTS_PROVIDER ?? 'mock').toLowerCase();
  if (provider === 'mock') return true;
  if (provider === 'minimax') return !(process.env.MINIMAX_API_KEY && process.env.MINIMAX_GROUP_ID);
  return true;
}
