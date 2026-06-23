import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/admin'];
const LOGIN_URL = '/sign-up-login-screen';

function isJwtShaped(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
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
