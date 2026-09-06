import 'server-only';
import type {TTSProvider} from './types';
import {MockTTSProvider} from './mock';
import {MiniMaxTTSProvider} from './minimax';
import {SonioxTTSProvider} from './soniox';

/**
 * Provider-agnostic TTS selection via TTS_PROVIDER: soniox | minimax | mock.
 * Each provider builder returns null when its credentials are missing, so the
 * router can fall back to mock and the app always runs. ElevenLabs can be added
 * here later behind the same TTSProvider interface.
 */
export function buildSoniox(): TTSProvider | null {
  if (!process.env.SONIOX_API_KEY) return null;
  return new SonioxTTSProvider({
    apiKey: process.env.SONIOX_API_KEY,
    baseUrl: process.env.SONIOX_TTS_BASE_URL ?? 'https://tts-rt.soniox.com',
    modelsBaseUrl: process.env.SONIOX_API_BASE_URL ?? 'https://api.soniox.com',
    model: process.env.SONIOX_TTS_MODEL ?? 'tts-rt-v2',
    defaultVoice: process.env.SONIOX_TTS_VOICE ?? 'Daniel',
    language: process.env.SONIOX_TTS_LANGUAGE ?? 'en',
    costPer1kChars: Number(process.env.SONIOX_TTS_COST_PER_1K ?? 0.03),
  });
}

export function buildMiniMax(): TTSProvider | null {
  if (!(process.env.MINIMAX_API_KEY && process.env.MINIMAX_GROUP_ID)) return null;
  return new MiniMaxTTSProvider({
    apiKey: process.env.MINIMAX_API_KEY,
    groupId: process.env.MINIMAX_GROUP_ID,
    baseUrl: process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.io/v1',
    model: process.env.MINIMAX_TTS_MODEL ?? 'speech-2.5-hd-preview',
    defaultVoice: process.env.MINIMAX_TTS_VOICE ?? 'English_expressive_narrator',
    costPer1kChars: Number(process.env.MINIMAX_TTS_COST_PER_1K ?? 0.1),
  });
}

/** Build a specific provider by name (used by Voice Test mode). */
export function getTTSProviderByName(name: string): TTSProvider | null {
  switch (name.toLowerCase()) {
    case 'soniox':
      return buildSoniox();
    case 'minimax':
      return buildMiniMax();
    case 'mock':
      return new MockTTSProvider();
    default:
      return null;
  }
}

export function getTTSProvider(): TTSProvider {
  const provider = (process.env.TTS_PROVIDER ?? 'mock').toLowerCase();
  if (provider === 'mock') return new MockTTSProvider();
  return getTTSProviderByName(provider) ?? new MockTTSProvider();
}

export function isMockTTS(): boolean {
  const provider = (process.env.TTS_PROVIDER ?? 'mock').toLowerCase();
  if (provider === 'mock') return true;
  return getTTSProviderByName(provider) === null;
}
