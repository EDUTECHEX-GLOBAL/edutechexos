import { getB2PresignedUploadUrl } from '@/app/actions/uploadActions';

/**
 * Uploads a File/Blob directly to Backblaze B2 from the browser.
 *
 * Flow:
 *   1. Ask the Next.js server for a presigned PUT URL (server action)
 *   2. PUT the file directly to B2 — never passes through Vercel
 *   3. Return the permanent public URL
 */
export async function uploadToB2(
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

    const result = await getB2PresignedUploadUrl(name, file.type, folder);
    if (!result.success) {
      console.warn('[b2] presigned URL failed:', result.error);
      return null;
    }

    const { signedUrl, publicUrl } = result;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      if (options?.onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            options.onProgress!(Math.round((e.loaded / e.total) * 100));
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`B2 PUT failed: ${xhr.status} ${xhr.statusText}`));
      };
      xhr.onerror = () => reject(new Error('B2 upload network error'));
      xhr.send(file);
    });

    return publicUrl;
  } catch (err) {
    console.error('[b2] uploadToB2 failed:', err);
    return null;
  }
}
