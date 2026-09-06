import {promises as fs} from 'node:fs';
import type {ImageGenRequest, ImageGenResult, ImageProvider} from './types';

/**
 * Replicate image provider (default: black-forest-labs/flux-dev or a configured
 * model). Supports seeds for reproducibility and, on img2img/reference-capable
 * models, a reference image for character consistency. Polls the prediction
 * until it completes.
 */
export interface ReplicateImageConfig {
  apiKey: string;
  baseUrl: string; // https://api.replicate.com/v1
  model: string; // e.g. "black-forest-labs/flux-dev"
  costPerImage: number;
  timeoutMs?: number;
}

interface Prediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string[] | string;
  error?: string;
}

const aspectRatio = (a: string) => (a === '9:16' ? '9:16' : a === '1:1' ? '1:1' : '16:9');

export class ReplicateImageProvider implements ImageProvider {
  readonly name = 'replicate';
  readonly model: string;
  readonly supportsReference = true; // depends on model; flux supports image input on some variants
  private readonly timeoutMs: number;

  constructor(private readonly cfg: ReplicateImageConfig) {
    this.model = cfg.model;
    this.timeoutMs = cfg.timeoutMs ?? Number(process.env.IMAGE_TIMEOUT_MS ?? 180_000);
  }

  async generate(req: ImageGenRequest): Promise<ImageGenResult> {
    const input: Record<string, unknown> = {
      prompt: req.prompt,
      aspect_ratio: aspectRatio(req.aspect ?? '16:9'),
      output_format: 'png',
    };
    if (req.seed != null) input.seed = req.seed;
    if (req.referenceImage) {
      const b = await fs.readFile(req.referenceImage);
      input.image = `data:image/png;base64,${b.toString('base64')}`;
    }

    const start = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/models/${this.model}/predictions`, {
      method: 'POST',
      headers: {authorization: `Bearer ${this.cfg.apiKey}`, 'content-type': 'application/json', Prefer: 'wait'},
      body: JSON.stringify({input}),
    });
    if (!start.ok) {
      const detail = await start.text().catch(() => '');
      throw new Error(`replicate start failed (${start.status}): ${detail.slice(0, 300)}`);
    }
    let pred = (await start.json()) as Prediction;

    const deadline = Date.now() + this.timeoutMs;
    while (pred.status !== 'succeeded' && pred.status !== 'failed' && pred.status !== 'canceled') {
      if (Date.now() > deadline) throw new Error('replicate timed out');
      await new Promise((r) => setTimeout(r, 1500));
      const poll = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/predictions/${pred.id}`, {
        headers: {authorization: `Bearer ${this.cfg.apiKey}`},
      });
      pred = (await poll.json()) as Prediction;
    }
    if (pred.status !== 'succeeded') throw new Error(`replicate ${pred.status}: ${pred.error ?? ''}`);

    const outUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (!outUrl) throw new Error('replicate: no output url');
    const bytes = Buffer.from(await (await fetch(outUrl)).arrayBuffer());

    return {
      provider: this.name,
      model: this.model,
      bytes,
      format: 'png',
      width: 1920,
      height: 1080,
      seed: req.seed,
      costUsd: this.cfg.costPerImage,
    };
  }
}
