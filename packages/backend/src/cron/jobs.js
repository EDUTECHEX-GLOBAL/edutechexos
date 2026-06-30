const cron = require('node-cron');
const { sendDigestEmails } = require('../services/digestService');
const { sendBrevoEmail } = require('../services/emailService');
const { decryptField } = require('../services/encryptionService');
const { Message, AccessRequest, ActivitySession, Notification } = require('../models');
const MeetingAccess = require('../models/MeetingAccess');
const { VALID_ACCOUNTS } = require('../utils/helpers');

function startCronJobs(io) {
  // ── Daily Email Digest — 03:30 UTC (09:00 IST) ─────────────────────────
  cron.schedule('30 3 * * *', async () => {
    console.log('[digest-cron] Firing daily digest at 03:30 UTC (09:00 IST)');
    try {
      const result = await sendDigestEmails();
      console.log(`[digest-cron] Digest sent → ${result.recipients}`);
      if (result.testUrl) console.log(`[digest-cron] Preview: ${result.testUrl}`);
    } catch (err) {
      console.error('[digest-cron] Failed:', err);
    }
  }, {
    timezone: 'UTC',
  });

  console.log('[digest-cron] Scheduled daily digest at 03:30 UTC (09:00 IST) via node-cron');

  // ── Burnout / Overwork Alert — every hour at minute 0 ─────────────────
  cron.schedule('0 * * * *', async () => {
    console.log('[overwork-cron] Checking for overwork alerts…');
    try {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const overworked = await ActivitySession.find({
        dateStr: todayStr,
        totalMinutes: { $gte: 480 },
      }).lean();

      if (!overworked.length) {
        console.log('[overwork-cron] No users over 8 h today.');
        return;
      }

      for (const session of overworked) {
        const hours = (session.totalMinutes / 60).toFixed(1);
        const account = VALID_ACCOUNTS.find(a => a.email === session.email);
        const name = account ? account.name : 'User';

        await Notification.create({
          type: 'alert',
          actor: 'System',
          actorInitials: 'S',
          actorColor: '#ef4444',
          message: `You've been active for ${hours}+ hours — consider taking a break.`,
          channel: 'overwork-alert',
          timestamp: new Date(),
          recipientEmails: [session.email],
          joinLink: '',
        });

        const html = `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:24px 28px;border-radius:14px 14px 0 0;">
              <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0;">EduTechExOS</h1>
              <p style="color:rgba(255,255,255,.8);font-size:13px;margin:4px 0 0;">Overwork Alert</p>
            </div>
            <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;">Hi ${name},</p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                You've been active for <strong>${hours} hours</strong> today — that's over 8 hours of screen time.
                Prolonged work without breaks can lead to burnout and reduced productivity.
              </p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
                Please take a moment to step away, stretch, hydrate, and rest your eyes.
                Your well-being matters.
              </p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:20px;">
                <p style="margin:0;color:#991b1b;font-size:13px;font-weight:600;">💡 Tips for a healthy work session:</p>
                <ul style="margin:8px 0 0;padding-left:18px;color:#991b1b;font-size:13px;">
                  <li>Follow the 20-20-20 rule (look 20 ft away for 20 s every 20 min)</li>
                  <li>Take a 5–10 min break every hour</li>
                  <li>Stay hydrated and maintain good posture</li>
                </ul>
              </div>
              <p style="margin:0;color:#6b7280;font-size:12px;">This is an automated alert from EduTechExOS.</p>
            </div>
          </div>`;

        await sendBrevoEmail({
          to: [{ email: session.email, name }],
          subject: 'EduTechExOS: Overwork Alert',
          html,
        });
      }

      console.log(`[overwork-cron] Alerted ${overworked.length} user(s)`);
    } catch (err) {
      console.error('[overwork-cron] Failed:', err);
    }
  }, {
    timezone: 'UTC',
  });

  console.log('[overwork-cron] Scheduled overwork alert every hour via node-cron');

  // ── Auto-start scheduled meetings — every minute ──────────────────────────
  // When a scheduled meeting's startAt arrives, broadcast a "meeting started"
  // prompt to everyone (the frontend shows a Join toast/card) and post a
  // persistent notification with the join link. Fires once per meeting.
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Don't replay meetings that became due more than 10 min ago (e.g. while
      // the server was asleep) — only fire ones whose time just arrived.
      const windowStart = new Date(now.getTime() - 10 * 60 * 1000);
      const due = await MeetingAccess.find({
        started: { $ne: true },
        startAt: { $ne: null, $lte: now, $gte: windowStart },
      }).lean();

      for (const m of due) {
        const link = m.meetLink || '';
        const channelName = m.channelName || m.channelId || 'general';
        if (io) {
          io.emit('meeting_started', {
            link,
            channelName,
            starter: 'Scheduled meeting',   // neutral so everyone (incl. host) sees it
            starterInitials: 'SM',
            starterColor: '#6366f1',
          });
        }
        await Notification.create({
          type: 'meeting',
          actor: 'EduTechExOS',
          actorInitials: 'OS',
          actorColor: '#6366f1',
          message: `📹 Meeting "${m.title || 'Team meeting'}" is starting now — click to join.`,
          channel: channelName,
          timestamp: new Date(),
          recipientEmails: Array.isArray(m.allowedEmails) ? m.allowedEmails : [],
          joinLink: link,
        }).catch((e) => console.error('[meeting-cron] notification failed:', e));
        await MeetingAccess.updateOne({ _id: m._id }, { $set: { started: true } });
      }

      if (due.length) console.log(`[meeting-cron] Auto-started ${due.length} meeting(s)`);
    } catch (err) {
      console.error('[meeting-cron] Failed:', err);
    }
  }, { timezone: 'UTC' });

  console.log('[meeting-cron] Scheduled meeting auto-start every minute via node-cron');
}

module.exports = { startCronJobs };

// ── LEGACY ───────────────────────────────────────────────────────────────────
// The following cron was the original daily digest at 02:30 UTC (08:00 AM IST).
// It was replaced by sendDigestEmails (03:30 UTC / 09:00 IST) which includes
// Kanban tasks, meetings, and DB-user support.  Kept here for reference.
//
// cron.schedule('30 2 * * *', async () => {
//   console.log('[digest] Running daily email digest…');
//   try {
//     const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
//     const msgs = (await Message.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 }).lean())
//       .map(m => ({ ...m, text: decryptField(m.text) }));
//     if (!msgs.length) { console.log('[digest] No messages in last 24 h — skipping.'); return; }
//
//     const byChannel = {};
//     msgs.forEach((m) => {
//       if (m.channelId?.startsWith('dm-')) return;
//       if (!byChannel[m.channelId]) byChannel[m.channelId] = [];
//       byChannel[m.channelId].push(m);
//     });
//
//     const dbUsers = await AccessRequest.find({ status: 'approved' }).lean().catch(() => []);
//     const allEmails = [
//       ...VALID_ACCOUNTS.map((a) => a.email),
//       ...dbUsers.map((u) => u.email),
//     ];
//
//     const channelHtml = Object.entries(byChannel).map(([chId, chMsgs]) => {
//       const rows = chMsgs.slice(-6).map((m) => `
//         <tr>
//           <td style="padding:4px 8px;font-size:12px;font-weight:700;color:#3E4A89;white-space:nowrap;">${m.sender}</td>
//           <td style="padding:4px 8px;font-size:13px;color:#1E2636;">${(m.text || '').replace(/<[^>]+>/g, '').slice(0, 150)}</td>
//         </tr>`).join('');
//       return `
//         <div style="margin-bottom:20px;">
//           <p style="margin:0 0 8px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#7C859E;"># ${chId}</p>
//           <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid rgba(62,74,137,0.10);">${rows}</table>
//           <p style="margin:4px 0 0;font-size:11px;color:#9BA6D3;">${chMsgs.length} message${chMsgs.length !== 1 ? 's' : ''}</p>
//         </div>`;
//     }).join('');
//
//     const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
//     const appUrl = process.env.APP_URL || 'https://edutechexos.vercel.app';
//     const html = `
//       <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px 16px;">
//         <div style="background:linear-gradient(135deg,#1E2538,#3E4A89);padding:22px 26px;border-radius:14px 14px 0 0;">
//           <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 4px;">EduTechExOS Daily Digest</h1>
//           <p style="color:rgba(255,255,255,.65);font-size:13px;margin:0;">${dateLabel}</p>
//         </div>
//         <div style="background:#FAF8F5;padding:24px 26px;border-radius:0 0 14px 14px;border:1px solid rgba(62,74,137,.12);border-top:none;">
//           <p style="color:#4A5578;font-size:14px;margin:0 0 20px;">Here's what happened in your workspace in the last 24 hours:</p>
//           ${channelHtml || '<p style="color:#9BA6D3;font-size:13px;">No channel messages today.</p>'}
//           <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(62,74,137,.08);">
//             <a href="${appUrl}" style="display:inline-block;background:#3E4A89;color:#fff;padding:11px 22px;border-radius:9px;font-weight:700;font-size:13px;text-decoration:none;">Open EduTechExOS &#x2192;</a>
//           </div>
//           <p style="margin:16px 0 0;font-size:11px;color:#9BA6D3;">You receive this because you are a member of EduTechExOS. To unsubscribe, ask your admin.</p>
//         </div>
//       </div>`;
//
//     if (allEmails.length === 0) { console.log('[digest] No users to email.'); return; }
//
//     const [primaryEmail, ...restEmails] = allEmails;
//     const bccList = restEmails.map(e => ({ email: e }));
//     const r = await sendBrevoEmail({
//       to: [{ email: primaryEmail }],
//       bcc: bccList.length > 0 ? bccList : undefined,
//       subject: `EduTechExOS Daily Digest — ${dateLabel}`,
//       html,
//     });
//     console.log(`[digest] ${r.ok ? `Sent to all ${allEmails.length} users.` : `FAILED: ${r.brevoError}`}`);
//   } catch (err) {
//     console.error('[digest] Error:', err);
//   }
// }, { timezone: 'UTC' });
