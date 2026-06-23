import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SEVEN_DAYS = 60 * 60 * 24 * 7;

function isJwtShaped(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

export async function POST(request: NextRequest) {
  let token: string;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!token || typeof token !== 'string' || !isJwtShaped(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SEVEN_DAYS,
    path: '/',
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
