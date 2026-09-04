import {NextResponse} from 'next/server';
import {isMockText} from '@/lib/ai/router';
import {isMockTTS} from '@/lib/tts/router';

/** Lightweight health/status probe for uptime checks and deploy verification. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    mockText: isMockText(),
    mockTTS: isMockTTS(),
    storeDriver: (process.env.STORE_DRIVER ?? 'file').toLowerCase(),
  });
}
