// src/app/api/access-requests/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import User from '@/app/models/User';
import { generateTempPassword, hashPassword } from '@/app/lib/auth';
import { sendAccessVerificationCode } from '@/app/actions/dbActions';

export async function POST(request: Request) {
  try {
    const { name, email, role } = await request.json();
    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, email, role' },
        { status: 400 }
      );
    }

    const allowedDomain = process.env.ALLOWED_DOMAIN ?? 'edutechex.in';
    const emailClean = email.trim().toLowerCase();
    if (!emailClean.endsWith(`@${allowedDomain}`)) {
      return NextResponse.json(
        { success: false, error: `Only @${allowedDomain} addresses are allowed` },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await User.findOne({ email: emailClean }).lean();
    if (existing) {
      return NextResponse.json({ success: false, error: 'User already exists' }, { status: 409 });
    }

    // Generate temporary password and verification code
    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Create new user in pending state
    const newUser = new User({
      name,
      email: emailClean,
      hashedPassword,
      role,
      status: 'pending',
    });
    await newUser.save();

    // Notify admin (or designated recipient) with the temp password and code
    await sendAccessVerificationCode(name, emailClean, verificationCode, tempPassword);

    return NextResponse.json({ success: true, message: 'Access request created' });
  } catch (err) {
    console.error('[access-requests] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
