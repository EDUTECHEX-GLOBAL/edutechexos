import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 client — S3-compatible, zero egress fees.
 *
 * Required env vars (add to .env.local and Vercel dashboard):
 *   R2_ACCOUNT_ID        — Cloudflare account ID  (from R2 overview page)
 *   R2_ACCESS_KEY_ID     — R2 API token access key
 *   R2_SECRET_ACCESS_KEY — R2 API token secret key
 *   R2_BUCKET_NAME       — bucket name  e.g. edutechexos-media
 *   R2_PUBLIC_URL        — public bucket URL  e.g. https://pub-xxx.r2.dev
 */
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? 'edutechexos-media';

/** Base public URL for the bucket — no trailing slash */
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');

/** True only when all four R2 env vars are present */
export const r2Configured =
  Boolean(process.env.R2_ACCOUNT_ID) &&
  Boolean(process.env.R2_ACCESS_KEY_ID) &&
  Boolean(process.env.R2_SECRET_ACCESS_KEY) &&
  Boolean(process.env.R2_PUBLIC_URL);
