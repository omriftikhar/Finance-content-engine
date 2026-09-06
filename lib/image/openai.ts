import {promises as fs} from 'node:fs';
import type {ImageGenRequest, ImageGenResult, ImageProvider} from './types';

/**
 * OpenAI image provider (gpt-image-1).
 *
 * Supports reference images via the /images/edits endpoint (character
 * consistency — pass Jack's reference). Text-to-image via /images/generations.
 * Returns b64 PNG. Cost is a configurable per-image estimate (OPENAI_IMAGE_COST).
 */
export interface OpenAIImageConfig {
  apiKey: string;
  baseUrl: string; // https://api.openai.com/v1
  model: string; // gpt-image-1
  costPerImage: number;
  timeoutMs?: number;
}

function sizeFor(aspect: string): string {
  // gpt-image-1 supports 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait)
  if (aspect === '9:16') return '1024x1536';
  if (aspect === '1:1') return '1024x1024';
  return '1536x1024';
}

export class OpenAIImageProvider implements ImageProvider {
  readonly name = 'openai';
  readonly model: string;
  readonly supportsReference = true;
  private readonly timeoutMs: number;

  constructor(private readonly cfg: OpenAIImageConfig) {
    this.model = cfg.model;
    this.timeoutMs = cfg.timeoutMs ?? Number(process.env.IMAGE_TIMEOUT_MS ?? 120_000);
  }

  async generate(req: ImageGenRequest): Promise<ImageGenResult> {
    const size = sizeFor(req.aspect ?? '16:9');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      let res: Response;
      const prompt = req.negativePrompt
        ? `${req.prompt}\n\nAvoid: ${req.negativePrompt}`
        : req.prompt;

      if (req.referenceImage) {
        // Character-consistent edit: send the reference as the base image.
        const refBytes = await fs.readFile(req.referenceImage);
        const form = new FormData();
        form.append('model', this.model);
        form.append('prompt', prompt);
        form.append('size', size);
        form.append('image', new Blob([new Uint8Array(refBytes)], {type: 'image/png'}), 'reference.png');
        res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/images/edits`, {
          method: 'POST',
          headers: {authorization: `Bearer ${this.cfg.apiKey}`},
          body: form,
          signal: controller.signal,
        });
      } else {
        res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/images/generations`, {
          method: 'POST',
          headers: {'content-type': 'application/json', authorization: `Bearer ${this.cfg.apiKey}`},
          body: JSON.stringify({model: this.model, prompt, size, n: 1}),
          signal: controller.signal,
        });
      }

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`openai image failed (${res.status}): ${detail.slice(0, 300)}`);
      }
      const data = (await res.json()) as {data?: Array<{b64_json?: string; url?: string}>};
      const b64 = data.data?.[0]?.b64_json;
      const url = data.data?.[0]?.url;
      let bytes: Buffer;
      if (b64) bytes = Buffer.from(b64, 'base64');
      else if (url) bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
      else throw new Error('openai image: no image in response');

      const [w, h] = size.split('x').map(Number);
      return {
        provider: this.name,
        model: this.model,
        bytes,
        format: 'png',
        width: w,
        height: h,
        seed: req.seed,
        costUsd: this.cfg.costPerImage,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
