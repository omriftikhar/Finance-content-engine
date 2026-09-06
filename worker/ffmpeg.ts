/**
 * Runs FFmpeg using the binary bundled with @remotion/renderer, so no system
 * FFmpeg install is required. Used to concatenate rendered chunks.
 */
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';

/** Locate the ffmpeg binary bundled with @remotion/compositor for this platform. */
function findFfmpeg(): string {
  const platformPkgs = [
    'compositor-darwin-arm64',
    'compositor-darwin-x64',
    'compositor-linux-x64-gnu',
    'compositor-linux-arm64-gnu',
    'compositor-win32-x64-msvc',
  ];
  for (const pkg of platformPkgs) {
    const bin = path.join(process.cwd(), 'node_modules', '@remotion', pkg, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    if (existsSync(bin)) return bin;
  }
  return 'ffmpeg'; // fall back to PATH
}

export async function ffmpeg(args: string[]): Promise<void> {
  const bin = findFfmpeg();
  const libDir = path.dirname(bin); // sibling .dylib/.so files live here
  const env = {
    ...process.env,
    DYLD_LIBRARY_PATH: `${libDir}:${process.env.DYLD_LIBRARY_PATH ?? ''}`,
    LD_LIBRARY_PATH: `${libDir}:${process.env.LD_LIBRARY_PATH ?? ''}`,
  };
  await new Promise<void>((resolve, reject) => {
    const p = spawn(bin, args, {stdio: ['ignore', 'ignore', 'inherit'], env});
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
}
