import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Message from '@/models/Message';

export async function GET() {
  try {
    await connectToDatabase();
    const messages = await Message.find({}).sort({ timestamp: 1 }).lean();
    const grouped: Record<string, any[]> = {};
    for (const msg of messages as any[]) {
      const { _id, __v, ...rest } = msg;
      const channelId = rest.channelId;
      if (!grouped[channelId]) grouped[channelId] = [];
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
