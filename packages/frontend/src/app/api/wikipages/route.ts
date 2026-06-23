import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import connectToDatabase from '@/lib/mongoose';
import WikiPage from '@/models/WikiPage';
import { getApiUser, unauthorized, forbidden } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  try {
    await connectToDatabase();
    const email = user.email;
    const pages = await WikiPage.find({
      $or: [{ createdBy: email }, { isPrivate: false }, { isPrivate: { $exists: false } }],
    }).sort({ createdAt: -1 }).lean();
    const formatted = pages.map(({ _id, __v, ...rest }: any) => ({ ...rest, id: _id.toString() }));
    return NextResponse.json({ success: true, pages: formatted });
  } catch (err) {
    console.error('GET /api/wikipages error:', err);
    return NextResponse.json({ success: false, pages: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  try {
    await connectToDatabase();
    const body = await req.json();

    if (!body.createdBy) body.createdBy = user.email;

    if (body.id) {
      // Update existing page (upsert)
      const existing = await WikiPage.findById(body.id).lean() as any;
      if (existing?.createdBy &&
          existing.createdBy.toLowerCase() !== user.email.toLowerCase() &&
          user.role !== 'Admin') {
        return forbidden();
      }
      const { id, ...updateData } = body;
      const page = await WikiPage.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, upsert: true }
      ).lean() as any;
      const { _id, __v, ...rest } = page;
      return NextResponse.json({ success: true, page: { ...rest, id: _id.toString() } });
    }

    const page = await WikiPage.create({ ...body, _id: body._id ?? randomUUID() });
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
