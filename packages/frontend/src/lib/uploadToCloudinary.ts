/**
 * Cloudinary upload helper — browser-side direct upload via unsigned preset.
 *
 * No npm package needed. Uses XMLHttpRequest so we can track progress.
 *
 * Required env vars (add to .env.local + Vercel):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    — your Cloudinary cloud name
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET — unsigned upload preset name
 *
 * How to create an unsigned preset:
 *   Cloudinary Dashboard → Settings → Upload → Upload presets → Add preset
 *   Set Signing mode = "Unsigned" → Save → copy the preset name
 */

export const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

export const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

/** True only when both required env vars are present */
export const cloudinaryConfigured =
  Boolean(CLOUDINARY_CLOUD_NAME) && Boolean(CLOUDINARY_UPLOAD_PRESET);

/**
 * Maps a MIME type to the Cloudinary resource_type parameter.
 * Cloudinary treats audio as "video" resource type.
 */
function getResourceType(mimeType: string): 'image' | 'video' | 'raw' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
  return 'raw';
}

/**
 * Uploads a File or Blob directly from the browser to Cloudinary.
 *
 * Flow:
 *   Browser → Cloudinary API  (direct, no Vercel server in between)
 *   Uses an unsigned upload preset — API secret is never exposed.
 *
 * @returns  Permanent public HTTPS URL (secure_url) on success, null on failure.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  options?: {
    folder?: 'audio' | 'video' | 'files';
    onProgress?: (percent: number) => void;
  }
): Promise<string | null> {
  if (!cloudinaryConfigured) {
    console.warn(
      '[cloudinary] Not configured — set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ' +
        'and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local'
    );
    return null;
  }

  const folder = options?.folder ?? 'files';
  const resourceType = getResourceType(file.type || 'application/octet-stream');
  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `edutechexos/${folder}`);

  try {
    return await new Promise<string | null>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);

      // Progress reporting
      if (options?.onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            options.onProgress!(Math.round((e.loaded / e.total) * 100));
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.secure_url ?? null);
          } catch {
            reject(new Error('[cloudinary] Invalid JSON response'));
          }
        } else {
          console.error('[cloudinary] Upload failed:', xhr.status, xhr.responseText);
          reject(new Error(`Cloudinary upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('[cloudinary] Network error during upload'));
      xhr.send(formData);
    });
  } catch (err) {
    console.error('[cloudinary] uploadToCloudinary failed:', err);
    return null;
  }
}
