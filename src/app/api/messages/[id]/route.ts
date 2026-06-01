import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Message from '@/models/Message';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await connectToDatabase();
    const body = await req.json();
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
 *   scope=everyone  (default) — soft-delete for all users; message shows placeholder in UI
 *   scope=me        — hides message only for the requesting user
 *   userEmail=xxx   — required when scope=me
 *   hard=true       — admin-only permanent delete (passes ?hard=true)
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope') ?? 'everyone';
  const userEmail = searchParams.get('userEmail') ?? '';
  const hard = searchParams.get('hard') === 'true';

  try {
    await connectToDatabase();

    if (hard) {
      // Admin permanent delete
      await Message.findByIdAndDelete(id);
      return NextResponse.json({ success: true, deleted: 'permanent' });
    }

    if (scope === 'me' && userEmail) {
      // Hide message only for this user
      await Message.findByIdAndUpdate(id, {
        $addToSet: { deletedForUsers: userEmail },
      });
      return NextResponse.json({ success: true, deleted: 'for-me' });
    }

    // Default: soft-delete for everyone (WhatsApp "Delete for everyone")
    const deletedBy = userEmail || 'unknown';
    await Message.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      deletedForEveryone: true,
      deletedBy,
    });
    return NextResponse.json({ success: true, deleted: 'for-everyone' });
  } catch (err) {
    console.error('DELETE /api/messages/[id] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
