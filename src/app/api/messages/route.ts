import { NextRequest, NextResponse } from "next/server";

// In-memory store (replace with DB/KV in production)
let messages: any[] = [];

export async function GET() {
  return NextResponse.json({ success: true, messages });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const msg = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  messages.push(msg);
  return NextResponse.json({ success: true, ...msg }, { status: 201 });
}
