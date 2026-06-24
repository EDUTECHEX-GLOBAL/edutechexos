import { S3Client } from '@aws-sdk/client-s3';

/**
 * Backblaze B2 client — S3-compatible, 10 GB free, no credit card required.
 *
 * Required env vars (add to .env.local and Vercel dashboard):
 *   B2_ENDPOINT          — e.g. s3.us-west-004.backblazeb2.com
 *   B2_ACCESS_KEY_ID     — B2 Application Key ID
 *   B2_SECRET_ACCESS_KEY — B2 Application Key
 *   B2_BUCKET_NAME       — bucket name  e.g. edutechexos-media
 *   B2_PUBLIC_URL        — public download base URL (no trailing slash)
 *                          e.g. https://f004.backblazeb2.com/file/edutechexos-media
 */
export const b2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.B2_ENDPOINT ?? ''}`,
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY ?? '',
  },
});

export const B2_BUCKET = process.env.B2_BUCKET_NAME ?? 'edutechexos-media';

export const B2_PUBLIC_URL = (process.env.B2_PUBLIC_URL ?? '').replace(/\/$/, '');

export const b2Configured =
  Boolean(process.env.B2_ENDPOINT) &&
  Boolean(process.env.B2_ACCESS_KEY_ID) &&
  Boolean(process.env.B2_SECRET_ACCESS_KEY) &&
  Boolean(process.env.B2_PUBLIC_URL);
