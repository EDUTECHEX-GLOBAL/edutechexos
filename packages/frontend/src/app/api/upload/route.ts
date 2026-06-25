/**
 * POST /api/upload
 *
 * Accepts a multipart/form-data body with a single "file" field and forwards
 * the binary to the backend GridFS endpoint (/api/files).
 * Returns { url: string } on success.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, unauthorized } from '@/lib/apiAuth';

const BACKEND_URL =
  process.env.BACKEND_URL || 'https://edutechexos-ueoq.onrender.com';

export async function POST(req: NextRequest) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  try {
    const incoming = await req.formData();
    const file = incoming.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file field in form data.' }, { status: 400 });
    }

    const res = await fetch(`${BACKEND_URL}/api/files`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Filename': encodeURIComponent(file.name || `upload-${Date.now()}`),
        Authorization: req.headers.get('Authorization') ?? '',
      },
      body: file,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[api/upload] backend error:', text);
      return NextResponse.json({ error: 'Upload failed.' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ url: data.url });
  } catch (err) {
    console.error('[api/upload] Unexpected error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
