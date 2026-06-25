function getAuthToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null;
  } catch {
    return null;
  }
}

/**
 * Uploads a file to the backend via MongoDB GridFS.
 * Returns the permanent URL (/api/files/<id>) on success, null on failure.
 */
export async function uploadToMongo(file: File | Blob): Promise<string | null> {
  try {
    const token = getAuthToken();
    if (!token) return null;

    const name = file instanceof File ? file.name : `upload-${Date.now()}`;

    const res = await fetch('/api/files', {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Filename': encodeURIComponent(name),
        Authorization: `Bearer ${token}`,
      },
      body: file,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}
