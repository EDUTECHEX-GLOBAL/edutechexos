import { uploadToMongo } from '@/lib/uploadToMongo';

/**
 * Uploads a file to MongoDB GridFS via the backend.
 * Falls back to a base64 data-URL stored inline in the message document
 * when the backend is unreachable (e.g. Render cold start).
 */
export async function smartUpload(
  file: File | Blob,
  options?: {
    folder?: 'audio' | 'video' | 'files';
    onProgress?: (percent: number) => void;
  }
): Promise<string> {
  const mongoUrl = await uploadToMongo(file);
  if (mongoUrl) return mongoUrl;

  return blobToDataUrl(file);
}

/** Converts a Blob to a base64 data URL — used as last-resort fallback */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
