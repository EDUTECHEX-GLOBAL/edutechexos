// src/app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/app/models/User';
import { generateTempPassword, hashPassword } from '@/app/lib/auth';
import { sendAccessVerificationCode } from '@/app/actions/dbActions';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailClean = email.trim().toLowerCase();

    await connectToDatabase();

    // Find the user
    const user = await User.findOne({ email: emailClean });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found with that email address.' },
        { status: 404 }
      );
    }

    // Generate a new temporary password
    const tempPassword = generateTempPassword();
    const hashed = await hashPassword(tempPassword);

    // Persist the new hashed password
    await User.findByIdAndUpdate(user._id, { hashedPassword: hashed });

    // Send the temporary password to the user via email
    const emailResult = await sendAccessVerificationCode(
      user.name,
      emailClean,
      '------', // placeholder – the email template shows the temp password, not the code
      tempPassword
    );

    if (!emailResult.success) {
      console.error('[reset-password] Email send failed:', emailResult.error);
      return NextResponse.json(
        { success: false, error: 'Account updated but failed to send email. Contact your admin.' },
        { status: 500 }
      );
    }

    console.log(`[reset-password] Temp password sent to ${emailClean}`);
    return NextResponse.json({
      success: true,
      message: 'A temporary password has been sent to your email address.',
    });
  } catch (err) {
    console.error('[reset-password] error:', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
