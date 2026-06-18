import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import WikiPage from '@/models/WikiPage';

export async function GET() {
  try {
    await connectToDatabase();
    const pages = await WikiPage.find({}).sort({ createdAt: -1 }).lean();
    const formatted = pages.map(({ _id, __v, ...rest }: any) => ({ ...rest, id: _id.toString() }));
    return NextResponse.json({ success: true, pages: formatted });
  } catch (err) {
    console.error('GET /api/wikipages error:', err);
    return NextResponse.json({ success: false, pages: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const page = await WikiPage.create(body);
    const { _id, __v, ...rest } = page.toObject();
    return NextResponse.json(
      { success: true, page: { ...rest, id: _id.toString() } },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/wikipages error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
