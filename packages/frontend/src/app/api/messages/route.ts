import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Message from '@/models/Message';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestingUser = searchParams.get('userEmail') ?? '';

  try {
    await connectToDatabase();
    // Fetch last 100 messages per channel (avoid full-table scan as history grows)
    const messages = await Message.find({}).sort({ timestamp: -1 }).limit(1000).lean();
    const grouped: Record<string, any[]> = {};

    for (const msg of messages as any[]) {
      const { _id, __v, ...rest } = msg;
      const channelId = rest.channelId;
      if (!grouped[channelId]) grouped[channelId] = [];

      // If hidden for this specific user, skip entirely
      if (requestingUser && (rest.deletedForUsers ?? []).includes(requestingUser)) continue;

      // Soft-deleted for everyone → keep in list but scrub content (WhatsApp style)
      if (rest.deletedForEveryone) {
        grouped[channelId].push({
          id: _id.toString(),
          channelId,
          sender: rest.sender,
          initials: rest.initials,
          color: rest.color,
          timestamp: rest.timestamp,
          parentId: rest.parentId,
          isDeleted: true,
          text: '',
        });
        continue;
      }

      grouped[channelId].push({ ...rest, id: _id.toString() });
    }

    return NextResponse.json({ success: true, messages: grouped });
  } catch (err) {
    console.error('GET /api/messages error:', err);
    return NextResponse.json({ success: false, messages: {} });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, ...rest } = body;
    const msg = await Message.create({ ...rest, clientId: id });
    const { _id, __v, ...saved } = msg.toObject();
    return NextResponse.json({ success: true, ...saved, id: _id.toString() }, { status: 201 });
  } catch (err) {
    console.error('POST /api/messages error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
