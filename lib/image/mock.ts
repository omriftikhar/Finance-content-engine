import type {ImageGenRequest, ImageGenResult, ImageProvider} from './types';

/**
 * Mock image provider.
 *
 * Generates a deterministic placeholder PNG (a simple cinematic-toned gradient)
 * with zero cost so the asset pipeline, planner and caching run with no API key.
 * The placeholder is clearly not a real environment — it exists to prove the
 * plumbing and let layered scenes composite before real assets exist.
 */
export class MockImageProvider implements ImageProvider {
  readonly name = 'mock';
  readonly model = 'mock';
  readonly supportsReference = true;

  async generate(req: ImageGenRequest): Promise<ImageGenResult> {
    const {width, height} = aspectToSize(req.aspect ?? '16:9');
    const seed = req.seed ?? hashSeed(req.prompt);
    const png = solidGradientPng(width, height, seed);
    return {
      provider: this.name,
      model: this.model,
      bytes: png,
      format: 'png',
      width,
      height,
      seed,
      costUsd: 0,
    };
  }
}

function aspectToSize(aspect: string): {width: number; height: number} {
  switch (aspect) {
    case '9:16':
      return {width: 1080, height: 1920};
    case '1:1':
      return {width: 1024, height: 1024};
    default:
      return {width: 1920, height: 1080};
  }
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Minimal PNG encoder for a vertical two-tone gradient (no deps). Produces a
 * valid, small PNG. Colors derive from the seed so different prompts differ.
 */
function solidGradientPng(w: number, h: number, seed: number): Buffer {
  const zlib = require('node:zlib') as typeof import('node:zlib');
  const top = [(seed % 40) + 10, ((seed >> 3) % 40) + 14, ((seed >> 6) % 50) + 20];
  const bot = [8, 10, 13];
  // raw image: each row prefixed with filter byte 0
  const raw = Buffer.alloc((w * 3 + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) {
    raw[o++] = 0;
    const t = y / h;
    const r = Math.round(top[0] + (bot[0] - top[0]) * t);
    const g = Math.round(top[1] + (bot[1] - top[1]) * t);
    const b = Math.round(top[2] + (bot[2] - top[2]) * t);
    for (let x = 0; x < w; x++) {
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const idat = zlib.deflateSync(raw);
  const chunks: Buffer[] = [];
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  chunks.push(pngChunk('IHDR', ihdr));
  chunks.push(pngChunk('IDAT', idat));
  chunks.push(pngChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat([sig, ...chunks]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}
