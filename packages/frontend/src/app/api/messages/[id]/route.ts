import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Message from '@/models/Message';
import { getApiUser, unauthorized, forbidden } from '@/lib/apiAuth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    await connectToDatabase();
    const body = await req.json();
    const existing = await Message.findById(id).lean() as any;
    if (existing?.senderEmail &&
        existing.senderEmail.toLowerCase() !== user.email.toLowerCase() &&
        user.role !== 'Admin') {
      return forbidden();
    }
    const updated = await Message.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { _id, __v, ...rest } = updated as any;
    return NextResponse.json({ success: true, ...rest, id: _id.toString() });
  } catch (err) {
    console.error('PATCH /api/messages/[id] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/messages/:id
 *
 * Query params:
 *   scope=everyone  (default) — soft-delete for all users
 *   scope=me        — hides message only for the requesting user
 *   hard=true       — admin-only permanent delete
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope') ?? 'everyone';
  const hard = searchParams.get('hard') === 'true';
  const userEmail = user.email;

  try {
    await connectToDatabase();

    if (hard) {
      if (user.role !== 'Admin') return forbidden();
      await Message.findByIdAndDelete(id);
      return NextResponse.json({ success: true, deleted: 'permanent' });
    }

    if (scope === 'me') {
      await Message.findByIdAndUpdate(id, { $addToSet: { deletedForUsers: userEmail } });
      return NextResponse.json({ success: true, deleted: 'for-me' });
    }

    await Message.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      deletedForEveryone: true,
      deletedBy: userEmail,
    });
    return NextResponse.json({ success: true, deleted: 'for-everyone' });
  } catch (err) {
    console.error('DELETE /api/messages/[id] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
