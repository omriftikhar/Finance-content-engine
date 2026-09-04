/**
 * Cloudflare R2 storage client (S3-compatible).
 *
 * Optional: R2 is only used by the render worker for uploading finished media.
 * The @aws-sdk/client-s3 dependency is lazy-imported so local dev and the Next
 * build never require it. Configure via env:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
 */
import {promises as fs} from 'node:fs';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
}

export function getR2Config(): R2Config | null {
  const {R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET} = process.env;
  // Accept either R2_PUBLIC_BASE_URL (spec) or R2_PUBLIC_URL (legacy).
  const publicUrl = process.env.R2_PUBLIC_BASE_URL ?? process.env.R2_PUBLIC_URL;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    publicUrl,
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

/** Deterministic object key: episodes/{episodeId}/{...path}. */
export function episodeKey(episodeId: string, ...parts: string[]): string {
  return ['episodes', episodeId, ...parts].join('/');
}

/** Uploads a local file to R2 and returns its public (or key) URL. */
export async function uploadFile(key: string, localPath: string, contentType: string): Promise<string> {
  const cfg = getR2Config();
  if (!cfg) throw new Error('R2 is not configured (missing R2_* env vars).');

  // Lazy import so the SDK is only required when R2 is actually used.
  let S3: typeof import('@aws-sdk/client-s3');
  try {
    S3 = await import('@aws-sdk/client-s3');
  } catch {
    throw new Error('Install @aws-sdk/client-s3 to enable R2 uploads: npm i @aws-sdk/client-s3');
  }

  const client = new S3.S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey},
  });

  const body = await fs.readFile(localPath);
  await client.send(new S3.PutObjectCommand({Bucket: cfg.bucket, Key: key, Body: body, ContentType: contentType}));

  return cfg.publicUrl ? `${cfg.publicUrl.replace(/\/$/, '')}/${key}` : `r2://${cfg.bucket}/${key}`;
}
