/**
 * POST /api/upload
 *
 * Accepts a multipart/form-data body with a single "file" field.
 * Forwards it to Cloudinary using the unsigned upload preset.
 * Returns { url: string } on success.
 *
 * Used by VoiceRecorder.tsx for voice-note uploads.
 * All other uploads go directly browser → Cloudinary (no server hop).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, unauthorized } from '@/lib/apiAuth';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

// Cloudinary uses "video" resource type for both video and audio files
function resourceType(mimeType: string): 'image' | 'video' | 'raw' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
  return 'raw';
}

export async function POST(req: NextRequest) {
  const user = getApiUser(req);
  if (!user) return unauthorized();
  // If Cloudinary is not configured, return 503 so VoiceRecorder falls back
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return NextResponse.json(
      { error: 'Cloudinary not configured — set NEXT_PUBLIC_CLOUDINARY_* env vars.' },
      { status: 503 }
    );
  }

  try {
    const incoming = await req.formData();
    const file = incoming.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file field in form data.' }, { status: 400 });
    }

    // Build form data to forward to Cloudinary
    const cloudForm = new FormData();
    cloudForm.append('file', file);
    cloudForm.append('upload_preset', UPLOAD_PRESET);
    cloudForm.append('folder', 'edutechexos/audio');

    const type = resourceType(file.type || 'audio/webm');
    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/upload`, {
      method: 'POST',
      body: cloudForm,
    });

    if (!cloudRes.ok) {
      const errText = await cloudRes.text();
      console.error('[api/upload] Cloudinary error:', errText);
      return NextResponse.json({ error: 'Cloudinary upload failed.' }, { status: 502 });
    }

    const data = await cloudRes.json();
    return NextResponse.json({ url: data.secure_url });
  } catch (err) {
    console.error('[api/upload] Unexpected error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
