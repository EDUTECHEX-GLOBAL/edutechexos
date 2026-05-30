import { NextRequest, NextResponse } from "next/server";

let pages: any[] = [];

export async function GET() {
  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const page = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  pages.push(page);
  return NextResponse.json(page, { status: 201 });
}
