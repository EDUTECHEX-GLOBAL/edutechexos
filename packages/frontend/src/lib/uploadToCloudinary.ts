/**
 * Cloudinary upload helper — browser-side direct upload via unsigned preset.
 *
 * Required env vars (add to .env.local + Vercel):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    — your Cloudinary cloud name
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET — unsigned upload preset name
 */

export const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
export const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

export const cloudinaryConfigured =
  Boolean(CLOUDINARY_CLOUD_NAME) && Boolean(CLOUDINARY_UPLOAD_PRESET);

function getResourceType(mimeType: string): 'image' | 'video' | 'raw' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
  return 'raw';
}

function xhrUpload(
  url: string,
  formData: FormData,
  onProgress?: (pct: number) => void
): Promise<string | null> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url ?? null);
        } catch {
          resolve(null);
        }
      } else {
        console.warn(`[cloudinary] Upload failed (${xhr.status})`);
        resolve(null);
      }
    };
    xhr.onerror = () => resolve(null);
    xhr.send(formData);
  });
}

/**
 * Uploads a File or Blob to Cloudinary.
 * Tries the correct resource_type first (image/video/raw), then retries
 * with 'auto' in case the preset restricts certain resource types.
 *
 * @returns Permanent public HTTPS URL on success, null on failure.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  options?: {
    folder?: 'audio' | 'video' | 'files';
    onProgress?: (percent: number) => void;
  }
): Promise<string | null> {
  if (!cloudinaryConfigured) {
    console.warn('[cloudinary] Not configured — set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
    return null;
  }

  const folder = options?.folder ?? 'files';
  const resourceType = getResourceType(file.type || 'application/octet-stream');

  const buildForm = () => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    fd.append('folder', `edutechexos/${folder}`);
    return fd;
  };

  try {
    // Try the correct resource type first
    const primaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    const result = await xhrUpload(primaryUrl, buildForm(), options?.onProgress);
    if (result) return result;

    // Retry with 'auto' — works when the preset doesn't have the specific type enabled
    const autoUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
    return await xhrUpload(autoUrl, buildForm(), options?.onProgress);
  } catch (err) {
    console.error('[cloudinary] uploadToCloudinary failed:', err);
    return null;
  }
}
