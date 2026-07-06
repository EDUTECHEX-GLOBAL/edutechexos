const cron = require('node-cron');
const { sendDigestEmails, sendWeeklyAdminDigest } = require('../services/digestService');
const { sendBrevoEmail } = require('../services/emailService');
const { decryptField, encryptField } = require('../services/encryptionService');
const { Message, AccessRequest, ActivitySession, Notification } = require('../models');
const MeetingAccess = require('../models/MeetingAccess');
const Deadline = require('../models/Deadline');
const { wantsEmail } = require('../services/notificationPrefsService');
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

  // ── Weekly Admin Activity Digest — Monday 03:45 UTC (09:15 IST) ────────
  cron.schedule('45 3 * * 1', async () => {
    console.log('[weekly-digest-cron] Firing weekly admin digest');
    try {
      const result = await sendWeeklyAdminDigest();
      console.log(`[weekly-digest-cron] Sent → ${result.recipients} admin(s)`);
    } catch (err) {
      console.error('[weekly-digest-cron] Failed:', err);
    }
  }, {
    timezone: 'UTC',
  });

  console.log('[weekly-digest-cron] Scheduled weekly admin digest for Mondays 03:45 UTC (09:15 IST) via node-cron');

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
        cancelled: { $ne: true },
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

        // Recurring: spawn next week's occurrence now so there's always one
        // upcoming instance in the pipeline, using the same room/link.
        if (m.recurring && !m.cancelled) {
          try {
            const nextStart = new Date(new Date(m.startAt).getTime() + 7 * 24 * 60 * 60 * 1000);
            const nextMsgId = `meeting-${Date.now()}-r`;
            const timeLabel = nextStart.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
            const text = [
              `Meeting Scheduled: ${m.title || 'Team meeting'}`,
              `Time: ${timeLabel}`,
              `Join Link: ${link}`,
            ].join('\n');
            await new Message({
              clientId: nextMsgId,
              channelId: m.channelId,
              sender: 'EduTechExOS',
              senderEmail: m.hostEmail,
              initials: 'OS',
              color: '#6366f1',
              text: encryptField(text),
              timestamp: new Date(),
            }).save();
            await new MeetingAccess({
              messageId: nextMsgId,
              channelId: m.channelId,
              hostEmail: m.hostEmail,
              allowedEmails: m.allowedEmails || [],
              grantedEmails: [],
              meetingCode: `${m.meetingCode || nextMsgId}-r${nextStart.getTime()}`,
              meetLink: link,
              startAt: nextStart,
              started: false,
              title: m.title || '',
              channelName,
              description: m.description || '',
              recurring: true,
              cancelled: false,
            }).save();
            console.log(`[meeting-cron] Spawned next recurring occurrence for "${m.title}" at ${nextStart.toISOString()}`);
          } catch (e) {
            console.error('[meeting-cron] Failed to spawn recurring occurrence:', e);
          }
        }
      }

      if (due.length) console.log(`[meeting-cron] Auto-started ${due.length} meeting(s)`);

      // ── Pre-meeting reminder — fires once, ~10 min before start ─────────
      const reminderWindowStart = new Date(now.getTime() + 9 * 60 * 1000);
      const reminderWindowEnd   = new Date(now.getTime() + 11 * 60 * 1000);
      const upcoming = await MeetingAccess.find({
        started: { $ne: true },
        cancelled: { $ne: true },
        reminded: { $ne: true },
        startAt: { $ne: null, $gte: reminderWindowStart, $lte: reminderWindowEnd },
      }).lean();

      for (const m of upcoming) {
        const channelName = m.channelName || m.channelId || 'general';
        const recipientEmails = Array.from(new Set([m.hostEmail, ...(m.allowedEmails || [])]));
        await Notification.create({
          type: 'meeting',
          actor: 'EduTechExOS',
          actorInitials: 'OS',
          actorColor: '#F59E0B',
          message: `⏰ Meeting "${m.title || 'Team meeting'}" starts in 10 minutes.`,
          channel: channelName,
          timestamp: new Date(),
          recipientEmails,
          joinLink: m.meetLink || '',
        }).catch((e) => console.error('[meeting-cron] reminder notification failed:', e));
        if (io) io.emit('meeting_reminder', { messageId: m.messageId, title: m.title, recipientEmails });

        // Also email each participant (respecting their meeting-email preference).
        try {
          const flags = await Promise.all(recipientEmails.map((e) => wantsEmail(e, 'meetings')));
          const to = recipientEmails.filter((_, i) => flags[i]).map((email) => ({ email }));
          if (to.length) {
            const startLabel = new Date(m.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
            await sendBrevoEmail({
              to,
              subject: `⏰ Meeting "${m.title || 'Team meeting'}" starts in 10 minutes`,
              html: `<div style="font-family:Arial,sans-serif;max-width:520px;padding:24px;background:#FAF8F5;border-radius:10px;">
                <h2 style="color:#1E2636;margin:0 0 12px;font-size:17px;">Your meeting starts soon</h2>
                <p style="color:#4A5578;font-size:14px;margin:0 0 8px;"><strong>${m.title || 'Team meeting'}</strong> in <strong>#${channelName}</strong> starts at <strong>${startLabel}</strong> (in ~10 minutes).</p>
                ${m.meetLink ? `<a href="${m.meetLink}" style="display:inline-block;margin-top:8px;background:#3E4A89;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;">Join meeting &#x2192;</a>` : ''}
              </div>`,
            });
          }
        } catch (e) { console.error('[meeting-cron] reminder email failed:', e); }

        await MeetingAccess.updateOne({ _id: m._id }, { $set: { reminded: true } });
      }
      if (upcoming.length) console.log(`[meeting-cron] Sent ${upcoming.length} pre-meeting reminder(s)`);
    } catch (err) {
      console.error('[meeting-cron] Failed:', err);
    }
  }, { timezone: 'UTC' });

  console.log('[meeting-cron] Scheduled meeting auto-start every minute via node-cron');

  // ── Deadline reminders — daily 03:15 UTC (08:45 IST) ──────────────────────
  // Emails each user the deadlines (detected from chat, synced by the frontend)
  // that fall today or tomorrow. Fires once per deadline per day.
  cron.schedule('15 3 * * *', async () => {
    console.log('[deadline-cron] Firing daily deadline reminders');
    try {
      const result = await runDeadlineReminders();
      console.log(`[deadline-cron] Emailed ${result.emailed} user(s)`);
    } catch (err) {
      console.error('[deadline-cron] Failed:', err);
    }
  }, { timezone: 'UTC' });

  console.log('[deadline-cron] Scheduled daily deadline reminders at 03:15 UTC (08:45 IST) via node-cron');
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Email every user their deadlines due today or tomorrow (IST). Exported so it
// can be force-triggered in tests. Returns { emailed }.
async function runDeadlineReminders() {
  const now = Date.now();
  const todayStr    = new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
  const tomorrowStr = new Date(now + IST_OFFSET_MS + 86400000).toISOString().slice(0, 10);

  const due = await Deadline.find({
    dueDateStr:   { $in: [todayStr, tomorrowStr] },
    lastNotified: { $ne: todayStr },
  }).lean();
  if (!due.length) return { emailed: 0 };

  const byEmail = new Map();
  for (const d of due) {
    if (!byEmail.has(d.email)) byEmail.set(d.email, []);
    byEmail.get(d.email).push(d);
  }

  const timeLabel = (ms) => {
    const hhmm = new Date(ms + IST_OFFSET_MS).toISOString().slice(11, 16);
    return hhmm === '00:00' ? '' : ` at ${hhmm}`;
  };
  const rowsHtml = (items) => items
    .sort((a, b) => a.dateMs - b.dateMs)
    .map((i) => `<li style="margin:6px 0;color:#4A5578;font-size:13px;"><strong>${escHtml(i.task) || '(untitled)'}</strong>${i.channel ? ` · #${escHtml(i.channel)}` : ''}${timeLabel(i.dateMs)}</li>`)
    .join('');

  let emailed = 0;
  const notifiedIds = [];
  for (const [email, items] of byEmail) {
    if (!(await wantsEmail(email, 'deadline'))) continue; // opted out — re-checked tomorrow
    const today = items.filter((i) => i.dueDateStr === todayStr);
    const tomor = items.filter((i) => i.dueDateStr === tomorrowStr);

    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;padding:24px;background:#FAF8F5;border-radius:10px;">
      <h2 style="color:#1E2636;margin:0 0 12px;font-size:17px;">Your upcoming deadlines</h2>
      ${today.length ? `<p style="margin:12px 0 4px;font-weight:700;color:#B91C1C;font-size:13px;">Due today</p><ul style="margin:0;padding-left:18px;">${rowsHtml(today)}</ul>` : ''}
      ${tomor.length ? `<p style="margin:12px 0 4px;font-weight:700;color:#B45309;font-size:13px;">Due tomorrow</p><ul style="margin:0;padding-left:18px;">${rowsHtml(tomor)}</ul>` : ''}
      <a href="${process.env.APP_URL || 'https://edutechexos.vercel.app'}/dashboard" style="display:inline-block;margin-top:16px;background:#3E4A89;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;">Open dashboard &#x2192;</a>
    </div>`;

    const { ok } = await sendBrevoEmail({
      to: [{ email }],
      subject: `EduTechExOS — Deadlines: ${today.length} today, ${tomor.length} tomorrow`,
      html,
    });
    if (ok) { emailed += 1; notifiedIds.push(...items.map((i) => i._id)); }
  }

  if (notifiedIds.length) {
    await Deadline.updateMany({ _id: { $in: notifiedIds } }, { $set: { lastNotified: todayStr } });
  }
  return { emailed };
}

module.exports = { startCronJobs, runDeadlineReminders };

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
