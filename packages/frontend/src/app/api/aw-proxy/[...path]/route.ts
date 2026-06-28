import { NextRequest, NextResponse } from 'next/server';

const AW_BASE = 'http://localhost:5600';

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  const path = '/' + (pathSegments ?? []).join('/');
  const search = req.nextUrl.search ?? '';
  const target = `${AW_BASE}${path}${search}`;

  try {
    const res = await fetch(target, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
      redirect: 'follow',
    });

    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'ActivityWatch unreachable' }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
