import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { getApiUser, unauthorized } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  const user = getApiUser(req);
  if (!user) return unauthorized();

  const { roomName, participantName } = await req.json();

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          'LiveKit API credentials not configured. Add LIVEKIT_API_KEY and LIVEKIT_API_SECRET to your .env.',
      },
      { status: 503 }
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: '4h',
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token });
}
