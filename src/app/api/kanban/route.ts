import { NextRequest, NextResponse } from "next/server";

let boards: any[] = [];

export async function GET() {
  return NextResponse.json({ boards });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const board = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  boards.push(board);
  return NextResponse.json(board, { status: 201 });
}
