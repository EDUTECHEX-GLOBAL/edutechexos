export interface ApiUser {
  email: string;
  role: string;
  name?: string;
}

export function getApiUser(request: Request): ApiUser | null {
  const auth = request.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token.startsWith('mock-jwt')) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload?.email) return null;
    return { email: payload.email, role: payload.role ?? 'Member', name: payload.name };
  } catch {
    return null;
  }
}

export function unauthorized() {
  return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
  return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
}
