import { NextRequest, NextResponse } from "next/server";

declare global { var _messages: any[] }
let messages = global._messages ?? (global._messages = []);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const idx = messages.findIndex(m => m.id === params.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  messages[idx] = { ...messages[idx], ...body, updatedAt: new Date().toISOString() };
  return NextResponse.json(messages[idx]);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  messages = messages.filter(m => m.id !== params.id);
  return NextResponse.json({ success: true });
}
