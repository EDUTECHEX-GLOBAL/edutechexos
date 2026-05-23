import { NextRequest, NextResponse } from 'next/server';

/**
 * IP Allowlist for the /admin route.
 * Reads from ADMIN_ALLOWED_IPS env var (comma-separated), falling back to a
 * hardcoded list. In development (localhost / 127.0.0.1 / ::1) access is
 * always permitted so local `npm run dev` keeps working.
 *
 * To add more IPs, update ADMIN_ALLOWED_IPS in .env:
 *   ADMIN_ALLOWED_IPS=49.205.100.5,203.0.113.42
 */
function getAllowedIPs(): string[] {
  const fromEnv = process.env.ADMIN_ALLOWED_IPS;
  if (fromEnv) {
    return fromEnv.split(',').map((ip) => normalizeIP(ip)).filter(Boolean);
  }
  // Fallback hardcoded list – update this if you don't use the env var
  return ['49.205.100.5'];
}

function isAdminGuardDisabled(): boolean {
  return process.env.ADMIN_IP_RESTRICTION_ENABLED === 'false' || process.env.NODE_ENV === 'development';
}

function normalizeIP(ip: string): string {
  const trimmed = ip.trim();

  if (trimmed.startsWith('[')) {
    const bracketEnd = trimmed.indexOf(']');
    return bracketEnd === -1 ? trimmed : trimmed.slice(1, bracketEnd);
  }

  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice('::ffff:'.length);
  }

  const ipv4WithPort = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) {
    return ipv4WithPort[1];
  }

  return trimmed;
}

/** Extract the real client IP from the request, honoring common proxy headers. */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; first entry is the client
    return normalizeIP(forwarded.split(',')[0]);
  }
  return normalizeIP(req.headers.get('x-real-ip') ?? '127.0.0.1');
}

/** IPs that are always allowed (local development). */
const LOCALHOST_IPS = new Set(['127.0.0.1', '::1', '0:0:0:0:0:0:0:1', 'localhost']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only enforce IP restriction on /admin and its sub-routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (isAdminGuardDisabled()) {
    return NextResponse.next();
  }

  const clientIP = getClientIP(req);

  // Always allow localhost (so local dev server works)
  if (LOCALHOST_IPS.has(clientIP)) {
    return NextResponse.next();
  }

  const allowedIPs = getAllowedIPs();

  if (allowedIPs.includes(clientIP)) {
    return NextResponse.next();
  }

  // Block the request — return a clean 403 page
  console.warn(`[AdminGuard] Blocked request to ${pathname} from IP: ${clientIP}`);

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>403 – Access Restricted | EduTechExOS</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
      color: #0f172a;
    }
    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 2rem;
      padding: 3rem 2.5rem;
      max-width: 440px;
      width: 90%;
      text-align: center;
      box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
    }
    .icon {
      width: 64px; height: 64px;
      background: #fef2f2;
      border-radius: 1.25rem;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.5rem;
      font-size: 2rem;
    }
    h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; }
    p  { font-size: 0.9rem; color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; }
    .badge {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 0.4rem 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #475569;
      letter-spacing: 0.05em;
      margin-bottom: 2rem;
    }
    a {
      display: inline-block;
      background: #1e293b;
      color: #fff;
      padding: 0.75rem 2rem;
      border-radius: 0.75rem;
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.2s;
    }
    a:hover { background: #0f172a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🛡️</div>
    <h1>Access Restricted</h1>
    <p>The Admin Dashboard is only accessible from authorised network locations.</p>
    <div class="badge">ERROR 403 · FORBIDDEN</div><br/>
    <a href="/">← Return to Home</a>
  </div>
</body>
</html>`,
    {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

export const config = {
  // Run this middleware only for /admin paths (not _next, api, static files, etc.)
  matcher: ['/admin', '/admin/:path*'],
};
