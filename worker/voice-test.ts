/**
 * Voice Test runner.
 *
 * Generates the same sample paragraph via Soniox + MiniMax and saves separate
 * audio files for blind comparison. Does NOT pick a winner.
 *
 *   npx tsx --tsconfig tsconfig.worker.json --env-file=.env.local worker/voice-test.ts
 *   npx tsx ... worker/voice-test.ts soniox                 # single provider
 *   npx tsx ... worker/voice-test.ts soniox,minimax "text"  # custom text
 */
import {runVoiceTest, DEFAULT_VOICE_TEST_PARAGRAPH} from '../lib/tts/voiceTest';

async function main() {
  const providers = (process.argv[2] ?? 'soniox,minimax').split(',').map((s) => s.trim());
  const paragraph = process.argv[3] ?? DEFAULT_VOICE_TEST_PARAGRAPH;
  console.log(`[voice-test] providers=${providers.join(', ')} chars=${paragraph.length}`);
  const report = await runVoiceTest(providers, paragraph);
  console.log(`[voice-test] output dir: ${report.dir}`);
  for (const e of report.entries) {
    if (e.ok) {
      console.log(
        `  ✓ ${e.provider}: ${e.audioPath}  voice=${e.voiceId} model=${e.model} durMs=${e.durationMs} bytes=${e.bytes} cost$=${e.estimatedCostUsd?.toFixed(6)}`,
      );
    } else {
      console.log(`  ✗ ${e.provider}: ${e.error}`);
    }
  }
}

main().catch((err) => {
  console.error('[voice-test] FATAL', err);
  process.exit(1);
});
