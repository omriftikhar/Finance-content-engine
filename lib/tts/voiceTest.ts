import 'server-only';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {getTTSProviderByName} from './router';
import type {AudioFormat} from './types';

/**
 * Voice Test mode.
 *
 * Generates the SAME sample paragraph through multiple providers and saves each
 * output as a separate file so they can be blind-tested by ear. Deliberately
 * does NOT pick a winner — the human decides on accent, naturalness, tone,
 * emphasis, number pronunciation, fatigue, alignment, and cost.
 */
export const DEFAULT_VOICE_TEST_PARAGRAPH =
  `Jack makes a hundred thousand dollars a year. Ten years ago, that number sounded ` +
  `like the finish line. But after taxes, his real take-home is closer to six thousand ` +
  `one hundred dollars a month — and once housing takes two thousand three hundred, ` +
  `there is far less left than the headline suggests.`;

export interface VoiceTestEntry {
  provider: string;
  ok: boolean;
  voiceId?: string;
  model?: string;
  durationMs?: number;
  estimatedCostUsd?: number;
  audioPath?: string;
  bytes?: number;
  error?: string;
}

export interface VoiceTestReport {
  paragraph: string;
  dir: string;
  entries: VoiceTestEntry[];
}

export async function runVoiceTest(
  providers: string[] = ['soniox', 'minimax'],
  paragraph: string = DEFAULT_VOICE_TEST_PARAGRAPH,
  opts: {voice?: string; format?: AudioFormat} = {},
): Promise<VoiceTestReport> {
  const dir = path.join(process.cwd(), 'data', 'voice-tests', new Date().toISOString().replace(/[:.]/g, '-'));
  await fs.mkdir(dir, {recursive: true});
  await fs.writeFile(path.join(dir, 'paragraph.txt'), paragraph, 'utf8');

  const entries: VoiceTestEntry[] = [];
  for (const name of providers) {
    const provider = getTTSProviderByName(name);
    if (!provider) {
      entries.push({provider: name, ok: false, error: 'not configured (missing credentials)'});
      continue;
    }
    try {
      const r = await provider.synthesize(paragraph, {voice: opts.voice, format: opts.format ?? 'mp3'});
      const ext = r.format;
      const audioPath = path.join(dir, `${name}.${ext}`);
      if (r.audio.length > 0) await fs.writeFile(audioPath, r.audio);
      entries.push({
        provider: name,
        ok: r.audio.length > 0,
        voiceId: r.voiceId,
        model: r.model,
        durationMs: r.durationMs,
        estimatedCostUsd: r.estimatedCostUsd,
        audioPath: r.audio.length > 0 ? audioPath : undefined,
        bytes: r.audio.length,
        error: r.audio.length === 0 ? 'no audio bytes returned (mock or empty)' : undefined,
      });
    } catch (err) {
      entries.push({provider: name, ok: false, error: (err as Error).message.slice(0, 240)});
    }
  }

  await fs.writeFile(path.join(dir, 'report.json'), JSON.stringify({paragraph, entries}, null, 2), 'utf8');
  return {paragraph, dir, entries};
}
