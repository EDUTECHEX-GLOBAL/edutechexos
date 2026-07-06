import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/admin'];
const LOGIN_URL = '/sign-up-login-screen';

function isJwtShaped(value: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 3 || !parts.every((p) => p.length > 0)) return false;
  // Best-effort payload sanity check. The Edge middleware can't verify the
  // signature (the signing secret is backend-only), so this stays a soft gate —
  // the API still fully validates every token — but rejecting a payload that's
  // unparseable or already expired closes the easy cases early.
  try {
    const json = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(json));
    if (payload.exp && Date.now() >= payload.exp * 1000) return false;
  } catch {
    return false;
  }
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('auth_session')?.value ?? '';
  if (isJwtShaped(token)) return NextResponse.next();

  const loginUrl = new URL(LOGIN_URL, request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard(.*)', '/admin(.*)'],
};
