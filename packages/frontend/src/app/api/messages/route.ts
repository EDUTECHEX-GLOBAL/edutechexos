import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Message from '@/models/Message';
import { getApiUser, unauthorized } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  const requestingUser = user.email;

  try {
    await connectToDatabase();
    const messages = await Message.find({}).sort({ timestamp: -1 }).limit(1000).lean();
    const grouped: Record<string, any[]> = {};

    for (const msg of messages as any[]) {
      const { _id, __v, ...rest } = msg;
      const channelId = rest.channelId;
      if (!grouped[channelId]) grouped[channelId] = [];

      if (requestingUser && (rest.deletedForUsers ?? []).includes(requestingUser)) continue;

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
    return NextResponse.json({ success: false, messages: {} }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, ...rest } = body;
    if (!rest.senderEmail) rest.senderEmail = user.email;
    const msg = await Message.create({ ...rest, clientId: id });
    const { _id, __v, ...saved } = msg.toObject();
    return NextResponse.json({ success: true, ...saved, id: _id.toString() }, { status: 201 });
  } catch (err) {
    console.error('POST /api/messages error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
