import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import NotificationModel from '@/models/Notification';
import { getApiUser, unauthorized } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  try {
    await connectToDatabase();
    const email = user.email;
    const query = { $or: [{ recipientEmails: { $size: 0 } }, { recipientEmails: email }] };
    const docs = await NotificationModel.find(query).sort({ createdAt: -1 }).limit(100).lean();
    const notifications = docs.map(({ _id, __v, ...rest }: any) => ({
      ...rest,
      id: _id.toString(),
      timestamp: rest.createdAt,
    }));
    return NextResponse.json({ success: true, notifications });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json({ success: false, notifications: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  try {
    await connectToDatabase();
    const body = await req.json();
    const doc = await NotificationModel.create(body);
    const { _id, __v, createdAt, ...rest } = doc.toObject();
    return NextResponse.json(
      { success: true, notification: { ...rest, id: _id.toString(), timestamp: createdAt } },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/notifications error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
