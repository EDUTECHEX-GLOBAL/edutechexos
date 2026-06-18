'use server';

import fs from 'fs/promises';
import path from 'path';
import connectToDatabase from '../../lib/mongoose';
import Message from '../models/Message';
import Note from '../models/Note';
import nodemailer from 'nodemailer';
import User from '../models/User';
import { generateTempPassword, hashPassword } from '../lib/auth';

// ── Email helper — Brevo SMTP relay (no IP allowlist; works from Vercel, Render, local) ──
// Brevo's HTTP API (api.brevo.com) enforces IP allowlists. SMTP relay does not.
export async function sendBrevoEmail(opts: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  bcc?: { email: string; name?: string }[];
}): Promise<{ success: boolean; error?: string }> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) {
    return { success: false, error: 'SMTP_USER and SMTP_PASS must be set (Brevo SMTP credentials)' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp-relay.brevo.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: smtpUser, pass: smtpPass },
  });

  const formatAddr = (r: { email: string; name?: string }) =>
    r.name ? `"${r.name}" <${r.email}>` : r.email;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'EduTechExOS <noreply@edutechex.in>',
      to: opts.to.map(formatAddr).join(', '),
      bcc: opts.bcc?.length ? opts.bcc.map(formatAddr).join(', ') : undefined,
      subject: opts.subject,
      html: opts.htmlContent,
    });
    console.log(`[Mail] SMTP OK — "${opts.subject}" to ${opts.to.length} recipient(s)`);
    return { success: true };
  } catch (e) {
    console.error('[Mail] SMTP send error:', e);
    return { success: false, error: String(e) };
  }
}

const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');

// Global flag indicating if DB connection succeeded
let dbConnected = false;

// Ensure database and uploads directory exist
async function ensureDbExists() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error('Error ensuring uploads dir:', err);
  }

  try {
    await connectToDatabase();
    dbConnected = true;
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    dbConnected = false;
    // Do not rethrow – downstream callers will handle the lack of a DB connection
    return false;
  }
  try {
    const count = await Message.countDocuments();
    if (count === 0) {
      console.log('Seeding initial mock data into MongoDB...');
      const { MESSAGES_BY_CHANNEL } = await import('../../data/mockData');
      const msgsToInsert = [];

      for (const [channelId, messages] of Object.entries(MESSAGES_BY_CHANNEL)) {
        for (const msg of messages as any[]) {
          const { id, ...rest } = msg;
          msgsToInsert.push({ ...rest, clientId: id, channelId });
        }
      }

      if (msgsToInsert.length > 0) {
        await Message.insertMany(msgsToInsert);
        console.log('Successfully seeded MongoDB with mock data');
      }
    }
  } catch (err) {
    console.error('Error seeding MongoDB:', err);
  }
  return true;
}

export async function getLocalMessages() {
  // Attempt DB connection; if it fails we fall back to mock data
  const dbOk = await ensureDbExists();
  if (!dbOk) {
    try {
      const { MESSAGES_BY_CHANNEL } = await import('../../data/mockData');
      return MESSAGES_BY_CHANNEL;
    } catch (e) {
      console.error('Failed to load mock data fallback:', e);
      return {};
    }
  }
  try {
    const messages = await Message.find({}).sort({ timestamp: 1 }).lean();
    const grouped: Record<string, any[]> = {};
    for (const msg of messages as any[]) {
      const channelId = msg.channelId;
      if (!grouped[channelId]) grouped[channelId] = [];
      const { _id, __v, ...rest } = msg;

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
    return grouped;
  } catch (err) {
    console.error('Failed to get messages from MongoDB:', err);
    // Fallback to mock data so UI does not crash when DB is unavailable
    try {
      const { MESSAGES_BY_CHANNEL } = await import('../../data/mockData');
      return MESSAGES_BY_CHANNEL;
    } catch (e) {
      console.error('Failed to load mock data fallback:', e);
      return {};
    }
  }
}

export async function saveLocalMessage(channelId: string, message: any) {
  try {
    await ensureDbExists();
    const { id, ...messageData } = message;
    const newMessage = new Message({
      ...messageData,
      clientId: id,
      channelId,
    });
    const savedMsg = await newMessage.save();
    const { _id, __v, ...rest } = savedMsg.toObject();
    return { success: true, message: { ...rest, id: _id.toString() } };
  } catch (err) {
    console.error('Failed to save message to MongoDB:', err);
    return { success: false, error: String(err) };
  }
}

export async function uploadLocalFile(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'No file uploaded' };

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Fallback: local filesystem (dev only — ephemeral on Vercel) ───────────
    // NOTE: Firebase Storage uploads happen client-side in the browser.
    // This server-side path is only used as a last resort in dev.
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const ext = path.extname(file.name) || '.bin';
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${Date.now()}-${baseName}${ext}`;
    await fs.writeFile(path.join(UPLOADS_DIR, fileName), buffer);
    return { success: true, url: `/uploads/${fileName}`, name: file.name, type: file.type };
  } catch (err) {
    console.error('Failed to upload file:', err);
    return { success: false, error: String(err) };
  }
}

export async function deleteLocalMessage(
  channelId: string,
  messageId: string,
  options: { hard?: boolean; scope?: 'everyone' | 'me'; userEmail?: string } = {}
) {
  await ensureDbExists();
  try {
    if (options.hard) {
      await Message.findByIdAndDelete(messageId);
      return { success: true, deleted: 'permanent' };
    }
    if (options.scope === 'me' && options.userEmail) {
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { deletedForUsers: options.userEmail },
      });
      return { success: true, deleted: 'for-me' };
    }
    // Default: soft-delete for everyone
    await Message.findByIdAndUpdate(messageId, {
      deletedAt: new Date(),
      deletedForEveryone: true,
      deletedBy: options.userEmail ?? 'unknown',
    });
    return { success: true, deleted: 'for-everyone' };
  } catch (err) {
    console.error('Failed to soft-delete message from MongoDB:', err);
    return { success: false, error: String(err) };
  }
}

export async function sendMeetingEmailInvitation(
  meetingTitle: string,
  timeStr: string,
  invitees: string[],
  joinLink: string
) {
  const htmlContent = `
    <div style="font-family:'Segoe UI',sans-serif;background:#f8fafc;padding:40px 20px;color:#1e293b;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#4f46e5,#3b82f6);padding:32px 40px;">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;text-transform:uppercase;">EduTechEx<span style="color:#93c5fd;">OS</span></h1>
          <p style="color:#e0e7ff;margin:4px 0 0;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Meeting Invitation</p>
        </div>
        <div style="padding:40px;">
          <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#475569;">Hello,</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#475569;">You have been invited to an upcoming collaborative team session on EduTechExOS.</p>
          <div style="background:#f1f5f9;border-radius:16px;padding:24px;margin-bottom:32px;border:1px solid #e2e8f0;">
            <h2 style="font-size:16px;font-weight:800;margin:0 0 16px;color:#1e293b;text-transform:uppercase;letter-spacing:.5px;">Session Details</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:6px 0;color:#64748b;font-weight:600;width:100px;">Topic:</td><td style="padding:6px 0;color:#0f172a;font-weight:700;">${meetingTitle}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-weight:600;">Time:</td><td style="padding:6px 0;color:#0f172a;font-weight:700;">${timeStr}</td></tr>
            </table>
          </div>
          <div style="text-align:center;margin-bottom:32px;">
            <a href="${joinLink}" target="_blank" style="background:#4f46e5;color:#fff;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;display:inline-block;">Join Meeting Now</a>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin:0;text-align:center;">Or copy: <a href="${joinLink}" style="color:#4f46e5;">${joinLink}</a></p>
        </div>
        <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">&copy; 2026 EduTechExOS</div>
      </div>
    </div>`;

  const result = await sendBrevoEmail({
    to: invitees.map((email) => ({ email })),
    subject: `📅 EduTechExOS Meeting Invitation: ${meetingTitle}`,
    htmlContent,
  });
  return result;
}

export async function sendAccessVerificationCode(
  name: string,
  recipientEmail: string,
  code: string,
  tempPassword: string
) {
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="background:#0f172a;color:#fff;padding:24px 28px;">
          <h1 style="margin:0;font-size:22px;">EduTechExOS</h1>
          <p style="margin:6px 0 0;color:#cbd5e1;font-size:13px;">Access verification</p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 16px;color:#334155;font-size:15px;">Hello ${name},</p>
          <p style="margin:0 0 12px;color:#334155;font-size:15px;">Your temporary password is:</p>
          <div style="letter-spacing:4px;font-size:24px;font-weight:700;color:#4f46e5;background:#eef2ff;border-radius:8px;padding:12px;text-align:center;margin-bottom:12px;">${tempPassword}</div>
          <p style="margin:0 0 20px;color:#334155;font-size:15px;">Use this code (${code}) to verify your email address.
          </p>
          <p style="margin:20px 0 0;color:#64748b;font-size:13px;">If you did not request access, you can ignore this email.</p>
        </div>
      </div>
    </div>`;

  return sendBrevoEmail({
    to: [{ email: recipientEmail, name }],
    subject: `EduTechExOS verification code: ${code}`,
    htmlContent,
  });
}

export async function sendMentionEmailNotification(
  senderName: string,
  recipientName: string,
  recipientEmail: string,
  channelName: string,
  messageText: string
) {
  const htmlContent = `
    <div style="font-family:'Segoe UI',sans-serif;background:#f8fafc;padding:40px 20px;color:#1e293b;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#4f46e5,#3b82f6);padding:32px 40px;">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;text-transform:uppercase;">EduTechEx<span style="color:#93c5fd;">OS</span></h1>
          <p style="color:#e0e7ff;margin:4px 0 0;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Chat Mention</p>
        </div>
        <div style="padding:40px;">
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:#475569;font-weight:700;">Hello ${recipientName},</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#475569;"><span style="color:#4f46e5;font-weight:700;">${senderName}</span> mentioned you in <span style="font-weight:700;color:#0f172a;">#${channelName}</span>.</p>
          <div style="background:#f8fafc;border-left:4px solid #4f46e5;border-radius:8px;padding:20px;margin-bottom:32px;font-style:italic;color:#334155;font-size:14px;line-height:1.6;">"${messageText}"</div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="https://edutechexos.vercel.app/dashboard" target="_blank" style="background:#4f46e5;color:#fff;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;display:inline-block;">Open Dashboard &amp; Reply</a>
          </div>
        </div>
        <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">&copy; 2026 EduTechExOS</div>
      </div>
    </div>`;

  return sendBrevoEmail({
    to: [{ email: recipientEmail, name: recipientName }],
    subject: `🔔 ${senderName} mentioned you in #${channelName}`,
    htmlContent,
  });
}

// ── Broadcast email helper ──
/**
 * Send a single email to multiple recipients (broadcast).
 * This is a thin wrapper around sendBrevoEmail.
 */
export async function sendBroadcastEmail(
  subject: string,
  htmlContent: string,
  recipients: { email: string; name?: string }[]
) {
  return sendBrevoEmail({ to: recipients, subject, htmlContent });
}

/**
 * Fetch a single note for a given channel.
 */
export async function getNoteAction(channelId: string) {
  try {
    await ensureDbExists();
    const note = await Note.findOne({ channelId }).lean();
    if (!note) return null;
    const { _id, __v, ...rest } = note;
    return { ...rest, id: _id.toString() };
  } catch (err) {
    console.error('Failed to get note from MongoDB:', err);
    return null;
  }
}

/**
 * Fetch all notes across channels.
 */
export async function getAllNotesAction() {
  try {
    await ensureDbExists();
    const notes = await Note.find({}).lean();
    return notes.map((n) => {
      const { _id, __v, ...rest } = n;
      return { ...rest, id: _id.toString() };
    });
  } catch (err) {
    console.error('Failed to get all notes from MongoDB:', err);
    return [];
  }
}

export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const API_URL =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://edutechexos-backend.onrender.com';
    const res = await fetch(`${API_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, currentPassword, newPassword }),
      cache: 'no-store',
    });
    return res.json();
  } catch (err) {
    return { success: false, error: 'Could not reach the server. Check your connection.' };
  }
}

export async function saveNoteAction(channelId: string, content: string) {
  try {
    await ensureDbExists();
    const updated = await Note.findOneAndUpdate(
      { channelId },
      { content, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    const { _id, __v, ...rest } = updated;
    return { success: true, note: { ...rest, id: _id.toString() } };
  } catch (err) {
    console.error('Failed to save note to MongoDB:', err);
    return { success: false, error: String(err) };
  }
}
