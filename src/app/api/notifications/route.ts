import { NextRequest, NextResponse } from "next/server";

let notifications: any[] = [];

export async function GET() {
  return NextResponse.json({ notifications });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const n = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  notifications.push(n);
  return NextResponse.json(n, { status: 201 });
}
