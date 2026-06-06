import { getR2PresignedUploadUrl } from '@/app/actions/uploadActions';

/**
 * Uploads a File/Blob directly to Cloudflare R2 from the browser.
 *
 * Flow:
 *   1. Ask the Next.js server for a presigned PUT URL (server action)
 *   2. PUT the file directly to R2 — never passes through Vercel
 *   3. Return the permanent public URL
 *
 * Falls back to null so callers can degrade to base64 data URLs.
 */
export async function uploadToR2(
  file: File | Blob,
  options?: {
    folder?: 'audio' | 'video' | 'files';
    onProgress?: (percent: number) => void;
  }
): Promise<string | null> {
  try {
    const name =
      file instanceof File ? file.name : `blob-${Date.now()}.${file.type.split('/')[1] ?? 'bin'}`;
    const folder = options?.folder ?? 'files';

    // Get presigned URL from server
    const result = await getR2PresignedUploadUrl(name, file.type, folder);
    if (!result.success) {
      console.warn('[r2] presigned URL failed:', result.error);
      return null;
    }

    const { signedUrl, publicUrl } = result;

    // Upload directly to R2 using XHR so we can track progress
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type);

      if (options?.onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            options.onProgress!(Math.round((e.loaded / e.total) * 100));
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`R2 PUT failed: ${xhr.status} ${xhr.statusText}`));
      };
      xhr.onerror = () => reject(new Error('R2 upload network error'));
      xhr.send(file);
    });

    return publicUrl;
  } catch (err) {
    console.error('[r2] uploadToR2 failed:', err);
    return null;
  }
}

/** Converts a Blob to a base64 data URL — used as last-resort fallback */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
