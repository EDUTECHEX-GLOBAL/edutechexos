import { NextResponse } from 'next/server';
import { sendBrevoEmail } from '@/app/actions/dbActions';

export async function POST(request: Request) {
  try {
    const { to, subject, htmlContent } = await request.json();
    if (!to || !subject || !htmlContent) {
      return NextResponse.json({ success: false, error: 'Missing required fields: to, subject, htmlContent' }, { status: 400 });
    }
    const result = await sendBrevoEmail({
      to,
      subject,
      htmlContent,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[email route] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
