'use server';

import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2, R2_BUCKET, R2_PUBLIC_URL, r2Configured } from '@/lib/r2';
import { b2, B2_BUCKET, B2_PUBLIC_URL, b2Configured } from '@/lib/b2';

/**
 * Generates a presigned PUT URL so the browser can upload directly to R2.
 * The file never passes through Vercel, bypassing the 4.5 MB body limit.
 *
 * @returns { signedUrl, publicUrl, key } on success
 *          { error } if R2 is not configured or the request fails
 */
export async function getR2PresignedUploadUrl(
  originalName: string,
  mimeType: string,
  folder: 'audio' | 'video' | 'files' = 'files'
): Promise<
  | { success: true; signedUrl: string; publicUrl: string; key: string }
  | { success: false; error: string }
> {
  if (!r2Configured) {
    return { success: false, error: 'R2 not configured — set R2_* env vars.' };
  }

  try {
    // Build a unique, safe key
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const key = `${folder}/${Date.now()}-${safe}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: mimeType,
    });

    // Presigned URL valid for 5 minutes — plenty for any reasonable upload
    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return { success: true, signedUrl, publicUrl, key };
  } catch (err) {
    console.error('[r2] getPresignedUrl failed:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Deletes a file from R2 by its key.
 * Called when a message with an attachment is hard-deleted.
 */
export async function deleteR2File(key: string): Promise<{ success: boolean }> {
  if (!r2Configured || !key) return { success: false };
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return { success: true };
  } catch (err) {
    console.error('[r2] deleteFile failed:', err);
    return { success: false };
  }
}

/**
 * Uploads a file to R2 server-side (used as fallback for small files
 * when a presigned URL is not suitable, e.g. from other server actions).
 * Max safe size ≈ 4 MB due to Vercel body limits.
 */
export async function uploadFileToR2(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: 'audio' | 'video' | 'files' = 'files'
): Promise<{ success: true; url: string; key: string } | { success: false; error: string }> {
  if (!r2Configured) {
    return { success: false, error: 'R2 not configured.' };
  }
  try {
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const key = `${folder}/${Date.now()}-${safe}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    return { success: true, url: `${R2_PUBLIC_URL}/${key}`, key };
  } catch (err) {
    console.error('[r2] uploadFile failed:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Generates a presigned PUT URL for Backblaze B2 (S3-compatible).
 * The browser uploads directly to B2 — never passes through Vercel.
 */
export async function getB2PresignedUploadUrl(
  originalName: string,
  mimeType: string,
  folder: 'audio' | 'video' | 'files' = 'files'
): Promise<
  | { success: true; signedUrl: string; publicUrl: string; key: string }
  | { success: false; error: string }
> {
  if (!b2Configured) {
    return { success: false, error: 'B2 not configured — set B2_* env vars.' };
  }
  try {
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const key = `${folder}/${Date.now()}-${safe}`;

    const command = new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      ContentType: mimeType,
    });

    const signedUrl = await getSignedUrl(b2, command, { expiresIn: 300 });
    const publicUrl = `${B2_PUBLIC_URL}/${key}`;

    return { success: true, signedUrl, publicUrl, key };
  } catch (err) {
    console.error('[b2] getPresignedUrl failed:', err);
    return { success: false, error: String(err) };
  }
}
