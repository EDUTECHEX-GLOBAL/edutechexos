import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, firebaseConfigured } from '@/lib/firebase';
import { uploadToR2, blobToDataUrl } from '@/lib/uploadToR2';
import { uploadToB2 } from '@/lib/uploadToB2';
import { uploadToCloudinary } from '@/lib/uploadToCloudinary';

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
    const name = file instanceof File ? file.name : `blob-${Date.now()}`;
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const path = `${folder}/${Date.now()}-${safeName}`;

    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });

    return await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (options?.onProgress) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
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

/** Returns true for file types Cloudinary cannot handle with an unsigned preset */
function isRawFile(file: File | Blob): boolean {
  const mime = file.type || '';
  return !mime.startsWith('image/') && !mime.startsWith('video/') && !mime.startsWith('audio/');
}

/**
 * Smart upload — picks the right storage path per file type:
 *
 * Images / Video / Audio  → Cloudinary (free 25 GB, unsigned preset works)
 * Raw files (PDF/DOC/ZIP) → Base64 stored directly in MongoDB (no external service needed)
 *
 * If B2 or R2 are configured they are tried first for all types.
 */
export async function smartUpload(
  file: File | Blob,
  options?: {
    folder?: 'audio' | 'video' | 'files';
    onProgress?: (percent: number) => void;
  }
): Promise<string> {
  // 1. Try Backblaze B2 — all file types (if configured)
  const b2Url = await uploadToB2(file, options);
  if (b2Url) return b2Url;

  // 2. Try Cloudflare R2 — all file types (if configured)
  const r2Url = await uploadToR2(file, options);
  if (r2Url) return r2Url;

  // 3. For raw files (PDF, DOC, ZIP, etc.) skip Cloudinary — it blocks unsigned raw uploads.
  //    Store directly as base64 in MongoDB instead.
  if (isRawFile(file)) {
    return blobToDataUrl(file);
  }

  // 4. Images / video / audio → Cloudinary works fine with unsigned preset
  const cloudUrl = await uploadToCloudinary(file, options);
  if (cloudUrl) return cloudUrl;

  // 5. Try Firebase (if configured)
  const firebaseUrl = await uploadToFirebase(file, options);
  if (firebaseUrl) return firebaseUrl;

  // 6. Final fallback: base64 in MongoDB
  return blobToDataUrl(file);
}
