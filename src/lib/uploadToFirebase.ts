import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, firebaseConfigured } from '@/lib/firebase';
import { blobToDataUrl } from '@/lib/uploadToR2';

/**
 * Uploads a File or Blob directly from the browser to Firebase Storage.
 *
 * Flow:
 *   Browser → Firebase Storage  (direct, no Vercel server in between)
 *
 * @param file       The File or Blob to upload
 * @param folder     Subfolder in the bucket: 'audio' | 'video' | 'files'
 * @param onProgress Optional callback: receives 0–100 percent
 * @returns          Permanent public download URL, or null on failure
 */
export async function uploadToFirebase(
  file: File | Blob,
  options?: {
    folder?: 'audio' | 'video' | 'files';
    onProgress?: (percent: number) => void;
  }
): Promise<string | null> {
  if (!firebaseConfigured) {
    console.warn('[firebase] Not configured — set NEXT_PUBLIC_FIREBASE_* env vars.');
    return null;
  }

  try {
    const folder = options?.folder ?? 'files';
    const name   = file instanceof File ? file.name : `blob-${Date.now()}`;
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const path   = `${folder}/${Date.now()}-${safeName}`;

    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });

    return await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (options?.onProgress) {
            const pct = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            options.onProgress(pct);
          }
        },
        (error) => {
          console.error('[firebase] upload error:', error);
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  } catch (err) {
    console.error('[firebase] uploadToFirebase failed:', err);
    return null;
  }
}

/**
 * Smart upload: tries Firebase first, falls back to base64 data URL.
 * Use this everywhere in the app so nothing ever breaks even if
 * Firebase is not configured yet.
 */
export async function smartUpload(
  file: File | Blob,
  options?: {
    folder?: 'audio' | 'video' | 'files';
    onProgress?: (percent: number) => void;
  }
): Promise<string> {
  const url = await uploadToFirebase(file, options);
  if (url) return url;

  // Fallback: base64 data URL (works offline / before Firebase is set up)
  console.warn('[upload] Firebase not available — using base64 fallback');
  return blobToDataUrl(file);
}
