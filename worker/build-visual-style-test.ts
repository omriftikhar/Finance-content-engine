/** Render and finish the 20-second visual approval gate only. */
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {writeMusic, writeSfx} from './audio/synth';
import {mixAudio} from './audio/mix';
import {ffmpeg} from './ffmpeg';
import {webpackOverride} from '../video/webpack-override';

async function main() {
  console.log('[style-test] bundling');
  const serveUrl = await bundle({entryPoint: path.join(process.cwd(), 'video/index.ts'), webpackOverride});
  console.log('[style-test] selecting composition');
  const composition = await selectComposition({serveUrl, id: 'VisualStyleTest'});
  console.log('[style-test] rendering');
  await renderMedia({composition, serveUrl, codec: 'h264', outputLocation: 'out/visual-style-video.mp4', chromiumOptions: {enableMultiProcessOnLinux: true}});
  const lib = path.join(process.cwd(), 'data/audio-lib');
  const sfx = await writeSfx(path.join(lib, 'sfx'));
  const music = await writeMusic(path.join(lib, 'music'), 'documentary', 20000);
  await ffmpeg(['-y','-i','out/visual-style-video.mp4','-vn','-ar','48000','-ac','1','-c:a','pcm_s16le','out/visual-style-narration.wav']);
  await mixAudio({narrationFile:'out/visual-style-narration.wav', musicFile:music, out:'out/visual-style-mixed.m4a', narrationGainDb:0, musicGainDb:-19, targetLufs:-14, sfx:[{file:sfx.money_in,atMs:1100,gainDb:-12},{file:sfx.counter,atMs:10500,gainDb:-18},{file:sfx.whoosh,atMs:9600,gainDb:-13},{file:sfx.money_in,atMs:14500,gainDb:-13}]});
  await ffmpeg(['-y','-i','out/visual-style-video.mp4','-i','out/visual-style-mixed.m4a','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','out/pilot-001-visual-style-test.mp4']);
  console.log('Created out/pilot-001-visual-style-test.mp4');
}
main().catch((error) => { console.error(error); process.exit(1); });
