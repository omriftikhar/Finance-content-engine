/**
 * Provider-agnostic image generation abstraction.
 *
 * The app depends only on ImageProvider + ImageGenResult — never on any single
 * vendor's response shape. Active provider is chosen by IMAGE_PROVIDER
 * (mock | openai | replicate). Providers that support reference images / seeds
 * expose character-consistency so "Jack" stays the same person across scenes.
 */
export interface ImageGenRequest {
  prompt: string;
  negativePrompt?: string;
  /** 16:9, 1:1, 9:16 ... provider maps to nearest supported size. */
  aspect?: string;
  /** Reference image (path or url) for character/style consistency. */
  referenceImage?: string;
  /** Deterministic seed where supported (consistency + reproducibility). */
  seed?: number;
}

export interface ImageGenResult {
  provider: string;
  model: string;
  /** Raw image bytes (PNG/JPEG). Empty in mock mode. */
  bytes: Buffer;
  format: 'png' | 'jpg';
  width: number;
  height: number;
  seed?: number;
  costUsd: number;
}

export interface ImageProvider {
  readonly name: string;
  readonly model: string;
  /** Whether this provider can use a reference image for character consistency. */
  readonly supportsReference: boolean;
  generate(req: ImageGenRequest): Promise<ImageGenResult>;
}
