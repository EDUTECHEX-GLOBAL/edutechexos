'use server';

import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import connectToDatabase from '@/lib/mongoose';
import Message from '@/models/Message';
import Note from '@/models/Note';

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
      const { MESSAGES_BY_CHANNEL } = require('../../data/mockData');
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
      const { MESSAGES_BY_CHANNEL } = require('../../data/mockData');
      return MESSAGES_BY_CHANNEL;
    } catch (e) {
      console.error('Failed to load mock data fallback:', e);
      return {};
    }
  }
  try {
    const messages = await Message.find({}).lean();
    const grouped: Record<string, any[]> = {};
    for (const msg of messages as any[]) {
      const channelId = msg.channelId;
      if (!grouped[channelId]) grouped[channelId] = [];
      const { _id, __v, ...rest } = msg;
      grouped[channelId].push({ ...rest, id: _id.toString() });
    }
    return grouped;
  } catch (err) {
    console.error('Failed to get messages from MongoDB:', err);
    // Fallback to mock data so UI does not crash when DB is unavailable
    try {
      const { MESSAGES_BY_CHANNEL } = require('../../data/mockData');
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
  await ensureDbExists();
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file uploaded' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Create unique safe filename
    const ext = path.extname(file.name) || '.bin';
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${Date.now()}-${baseName}${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    await fs.writeFile(filePath, buffer);
    const urlPath = `/uploads/${fileName}`;

    return {
      success: true,
      url: urlPath,
      name: file.name,
      type: file.type,
    };
  } catch (err) {
    console.error('Failed to upload file locally:', err);
    return { success: false, error: String(err) };
  }
}

export async function deleteLocalMessage(channelId: string, messageId: string) {
  await ensureDbExists();
  try {
    await Message.findByIdAndDelete(messageId);
    return { success: true };
  } catch (err) {
    console.error('Failed to delete message from MongoDB:', err);
    return { success: false, error: String(err) };
  }
}

export async function sendMeetingEmailInvitation(
  meetingTitle: string,
  timeStr: string,
  invitees: string[],
  joinLink: string
) {
  try {
    let host = process.env.SMTP_HOST;
    let port = Number(process.env.SMTP_PORT) || 587;
    let secure = process.env.SMTP_SECURE === 'true';
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;
    let from = process.env.SMTP_FROM || 'notifications@edutech.com';

    let testUrl = '';

    if (!host || !user || !pass) {
      console.log(
        'No SMTP configurations found in .env. Falling back to dynamic Ethereal test account...'
      );
      const testAccount = await nodemailer.createTestAccount();
      host = 'smtp.ethereal.email';
      port = 587;
      secure = false;
      user = testAccount.user;
      pass = testAccount.pass;
      from = `"EduTechExOS Notifications" <${testAccount.user}>`;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.05); border: 1px solid #e2e8f0;">
          <!-- Banner -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 40px; text-align: left;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">EduTechEx<span style="color: #93c5fd;">OS</span></h1>
            <p style="color: #e0e7ff; margin: 4px 0 0 0; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Meeting Invitation</p>
          </div>
          <!-- Body -->
          <div style="padding: 40px;">
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; color: #475569;">Hello,</p>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; color: #475569;">You have been invited to an upcoming collaborative team session on the EduTechExOS workspace.</p>
            
            <!-- Details Card -->
            <div style="background-color: #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
              <h2 style="font-size: 16px; font-weight: 800; margin: 0 0 16px 0; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">Session Details</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 100px;">Topic:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${meetingTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Time:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${timeStr}</td>
                </tr>
              </table>
            </div>
            
            <!-- Button -->
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${joinLink}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 700; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2); transition: all 0.2s;">Join Meeting Now</a>
            </div>
            
            <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; margin: 0; text-align: center;">If the button above does not work, copy and paste this link in your browser:<br/><a href="${joinLink}" style="color: #4f46e5; text-decoration: none;">${joinLink}</a></p>
          </div>
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            &copy; 2026 EduTechExOS Team OS &middot; Secured Collaborative Portal
          </div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from,
      to: invitees.join(', '),
      subject: `📅 EduTechExOS Meeting Invitation: ${meetingTitle}`,
      html: emailHtml,
    });

    if (host === 'smtp.ethereal.email') {
      testUrl = nodemailer.getTestMessageUrl(info) || '';
      console.log(`Email Sent! Ethereal Preview URL: ${testUrl}`);
    }

    return { success: true, previewUrl: testUrl };
  } catch (err) {
    console.error('Failed to send SMTP email:', err);
    return { success: false, error: String(err) };
  }
}

export async function sendAccessVerificationCode(
  name: string,
  recipientEmail: string,
  code: string
) {
  try {
    let host = process.env.SMTP_HOST;
    let port = Number(process.env.SMTP_PORT) || 587;
    let secure = process.env.SMTP_SECURE === 'true';
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;
    let from = process.env.SMTP_FROM || 'notifications@edutech.com';

    let testUrl = '';

    if (!host || !user || !pass) {
      console.log(
        'No SMTP config found for access verification. Falling back to dynamic Ethereal test account...'
      );
      const testAccount = await nodemailer.createTestAccount();
      host = 'smtp.ethereal.email';
      port = 587;
      secure = false;
      user = testAccount.user;
      pass = testAccount.pass;
      from = `"EduTechExOS Access" <${testAccount.user}>`;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: `EduTechExOS verification code: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 32px;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
            <div style="background: #0f172a; color: #ffffff; padding: 24px 28px;">
              <h1 style="margin: 0; font-size: 22px;">EduTechExOS</h1>
              <p style="margin: 6px 0 0; color: #cbd5e1; font-size: 13px;">Access verification</p>
            </div>
            <div style="padding: 28px;">
              <p style="margin: 0 0 16px; color: #334155; font-size: 15px;">Hello ${name},</p>
              <p style="margin: 0 0 20px; color: #334155; font-size: 15px;">Use this code for your first EduTechExOS sign in after admin approval.</p>
              <div style="letter-spacing: 8px; font-size: 30px; font-weight: 800; color: #4f46e5; background: #eef2ff; border-radius: 14px; padding: 18px; text-align: center;">${code}</div>
              <p style="margin: 20px 0 0; color: #64748b; font-size: 13px;">If you did not request access, you can ignore this email.</p>
            </div>
          </div>
        </div>
      `,
    });

    if (host === 'smtp.ethereal.email') {
      testUrl = nodemailer.getTestMessageUrl(info) || '';
      console.log(`Access verification email sent. Ethereal Preview URL: ${testUrl}`);
    }

    return { success: true, previewUrl: testUrl };
  } catch (err) {
    console.error('Failed to send access verification email:', err);
    return { success: false, error: String(err) };
  }
}

export async function sendMentionEmailNotification(
  senderName: string,
  recipientName: string,
  recipientEmail: string,
  channelName: string,
  messageText: string
) {
  try 
  {
  
   let host = process.env.SMTP_HOST;
    let port = Number(process.env.SMTP_PORT) || 587;
    let secure = process.env.SMTP_SECURE === 'true';
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;
    let from = process.env.SMTP_FROM || 'notifications@edutech.com';

    let testUrl = '';

    if (!host || !user || !pass) {
      console.log(
        'No SMTP config found for mention notification. Falling back to dynamic Ethereal test account...'
      );
      const testAccount = await nodemailer.createTestAccount();
      host = 'smtp.ethereal.email';
      port = 587;
      secure = false;
      user = testAccount.user;
      pass = testAccount.pass;
      from = `"EduTechExOS Notifications" <${testAccount.user}>`;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.05); border: 1px solid #e2e8f0;">
          <!-- Banner -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 40px; text-align: left;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">EduTechEx<span style="color: #93c5fd;">OS</span></h1>
            <p style="color: #e0e7ff; margin: 4px 0 0 0; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Chat Mention Reminder</p>
          </div>
          <!-- Body -->
          <div style="padding: 40px;">
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; color: #475569; font-weight: 700;">Hello ${recipientName},</p>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; color: #475569;"><span style="color: #4f46e5; font-weight: 700;">${senderName}</span> mentioned you inside the channel <span style="font-weight: 700; color: #0f172a;">#${channelName}</span> on EduTechExOS.</p>
            
            <!-- Message Quote Card -->
            <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 8px; padding: 20px; margin-bottom: 32px; font-style: italic; color: #334155; font-size: 14px; line-height: 1.6; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
              "${messageText}"
            </div>
            
            <!-- Button -->
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://edutechexos.vercel.app'}/dashboard" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 700; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2); transition: all 0.2s;">Open Dashboard & Reply</a>
            </div>
          </div>
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            &copy; 2026 EduTechExOS Team OS &middot; Automated Workspace Dispatch
          </div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: `🔔 New Mention in #${channelName} by ${senderName}`,
      html: emailHtml,
    });

    if (host === 'smtp.ethereal.email') {
      testUrl = nodemailer.getTestMessageUrl(info) || '';
      console.log(`Mention email sent. Ethereal Preview URL: ${testUrl}`);
    }

    return { success: true, previewUrl: testUrl };
  } catch (err) {
    console.error('Failed to send mention email:', err);
    return { success: false, error: String(err) };
  }
}


// Note CRUD functions moved to src/app/actions/noteActions.ts
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

/**
 * Save or update a note for a channel.
 */
export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10002';
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