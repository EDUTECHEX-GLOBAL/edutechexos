import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import WikiPage from '@/models/WikiPage';
import { getApiUser, unauthorized, forbidden } from '@/lib/apiAuth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    await connectToDatabase();
    const body = await req.json();
    const existing = await WikiPage.findById(id).lean() as any;
    if (existing?.createdBy &&
        existing.createdBy.toLowerCase() !== user.email.toLowerCase() &&
        user.role !== 'Admin') {
      return forbidden();
    }
    const page = await WikiPage.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true }
    ).lean() as any;
    if (!page) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    const { _id, __v, ...rest } = page;
    return NextResponse.json({ success: true, page: { ...rest, id: _id.toString() } });
  } catch (err) {
    console.error('PATCH /api/wikipages/[id] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    await connectToDatabase();
    const existing = await WikiPage.findById(id).lean() as any;
    if (existing?.createdBy &&
        existing.createdBy.toLowerCase() !== user.email.toLowerCase() &&
        user.role !== 'Admin') {
      return forbidden();
    }
    const deleted = await WikiPage.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/wikipages/[id] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
