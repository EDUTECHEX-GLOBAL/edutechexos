const { decryptField } = require('./encryptionService');
const { Message, KanbanTask, AccessRequest, ActivitySession } = require('../models');
const { VALID_ACCOUNTS } = require('../utils/helpers');
const { sendBrevoEmail } = require('./emailService');
const { wantsEmail } = require('./notificationPrefsService');

async function buildDigestHtml(since) {
  const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentMsgs = await Message.find({ timestamp: { $gte: sinceDate } }).lean();
  const byChannel = {};
  recentMsgs.forEach((m) => {
    byChannel[m.channelId] = (byChannel[m.channelId] || 0) + 1;
  });
  const channelRows = Object.entries(byChannel)
    .sort(([, a], [, b]) => b - a)
    .map(([ch, cnt]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">#${ch}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#4f46e5;">${cnt}</td></tr>`)
    .join('');

  const openTasks = await KanbanTask.find({ status: { $ne: 'done' } }).lean();
  const taskRows = openTasks.slice(0, 10)
    .map((t) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${t.text.slice(0, 80)}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${t.assignee}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;"><span style="background:${t.status==='inprogress'?'#dbeafe':'#fef9c3'};color:${t.status==='inprogress'?'#1d4ed8':'#854d0e'};padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">${t.status}</span></td></tr>`)
    .join('');

  // Query by meetingMeta field (set when scheduling meetings) — text is encrypted so regex won't match
  const upcomingMeetings = await Message.find({
    $or: [
      { meetingMeta: { $exists: true }, timestamp: { $gte: sinceDate } },
      { messageType: 'meeting', timestamp: { $gte: sinceDate } },
    ]
  }).lean();
  const meetingRows = upcomingMeetings
    .map((m) => {
      const title = (m.text.match(/Meeting Scheduled:\s*(.+)/) || [])[1] || 'Meeting';
      const time  = (m.text.match(/Time:\s*(.+)/)             || [])[1] || '';
      const link  = (m.text.match(/Join Link:\s*(https?:\/\/\S+)/) || [])[1] || '#';
      return `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${title}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${time}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;"><a href="${link}" style="color:#4f46e5;font-weight:700;">Join →</a></td></tr>`;
    })
    .join('');

  const dateLabel = sinceDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a3a2a,#4f46e5);padding:24px 28px;">
        <p style="margin:0;color:#a5f3fc;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">EduTechExOS</p>
        <h1 style="margin:6px 0 0;font-size:22px;color:#fff;">Daily Digest</h1>
        <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">${dateLabel}</p>
      </div>

      <!-- Channel activity -->
      <div style="padding:24px 28px 0;">
        <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;">📣 Channel Activity (last 24 h)</h2>
        ${channelRows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr style="background:#f8fafc;"><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Channel</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Messages</th></tr>${channelRows}</table>` : '<p style="font-size:13px;color:#94a3b8;">No messages in the last 24 hours.</p>'}
      </div>

      <!-- Open tasks -->
      <div style="padding:24px 28px 0;">
        <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;">📋 Open Tasks (${openTasks.length})</h2>
        ${taskRows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr style="background:#f8fafc;"><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Task</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;">Assignee</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;">Status</th></tr>${taskRows}</table>` : '<p style="font-size:13px;color:#94a3b8;">No open tasks right now 🎉</p>'}
      </div>

      <!-- Meetings -->
      <div style="padding:24px 28px;">
        <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;">📅 Meetings Scheduled</h2>
        ${meetingRows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr style="background:#f8fafc;"><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;">Title</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;">Time</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;">Link</th></tr>${meetingRows}</table>` : '<p style="font-size:13px;color:#94a3b8;">No meetings scheduled recently.</p>'}
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">&copy; 2026 EduTechExOS &middot; Internal Team OS</div>
    </div>
  </div>`;
}

async function sendDigestEmails(since) {
  const html = await buildDigestHtml(since);

  const toMap = new Map(VALID_ACCOUNTS.map((a) => [a.email, { email: a.email, name: a.name }]));
  try {
    const dbUsers = await AccessRequest.find({ status: 'approved' }).lean();
    for (const u of dbUsers) {
      if (!toMap.has(u.email)) toMap.set(u.email, { email: u.email, name: u.name });
    }
  } catch (e) {
    console.warn('[digest] Could not fetch DB users for digest:', e.message);
  }
  const candidateRecipients = Array.from(toMap.values());
  const digestFlags = await Promise.all(candidateRecipients.map((r) => wantsEmail(r.email, 'digest')));
  const allRecipients = candidateRecipients.filter((_, i) => digestFlags[i]);
  if (allRecipients.length === 0) {
    console.log('[digest] No recipients opted in for daily digest.');
    return { recipients: '' };
  }
  const [primaryRecipient, ...otherRecipients] = allRecipients;

  const subject = `EduTechExOS: Daily Team Digest — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  const { ok } = await sendBrevoEmail({
    to: [{ email: primaryRecipient.email, name: primaryRecipient.name }],
    bcc: otherRecipients.length > 0 ? otherRecipients.map(r => ({ email: r.email, name: r.name })) : undefined,
    subject,
    html,
  });
  const recipients = allRecipients.map((r) => r.email).join(', ');
  console.log(`[digest] Brevo send ${ok ? 'OK' : 'FAILED'} → ${allRecipients.length} recipients (BCC): ${recipients}`);
  return { recipients };
}

// ── Weekly team-activity digest — admin(s) only ─────────────────────────────
async function sendWeeklyAdminDigest() {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const dateStrs = [];
  for (let i = 0; i < 7; i++) {
    dateStrs.push(new Date(Date.now() - i * 86400000 + istOffset).toISOString().slice(0, 10));
  }

  const sessions = await ActivitySession.find({ dateStr: { $in: dateStrs } }).lean();
  const byUser = {};
  for (const s of sessions) {
    if (!byUser[s.email]) byUser[s.email] = { name: s.name, totalMinutes: 0, messageCount: 0, taskCount: 0, days: 0 };
    byUser[s.email].totalMinutes += s.totalMinutes || 0;
    byUser[s.email].messageCount += s.messageCount || 0;
    byUser[s.email].taskCount += s.taskCount || 0;
    byUser[s.email].days += 1;
  }

  const rows = Object.entries(byUser)
    .sort(([, a], [, b]) => b.totalMinutes - a.totalMinutes)
    .map(([email, u]) => {
      const hrs = (u.totalMinutes / 60).toFixed(1);
      const avgHrs = (u.totalMinutes / 60 / Math.max(1, u.days)).toFixed(1);
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1e293b;">${u.name || email}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${hrs}h</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${avgHrs}h/day</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${u.messageCount}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${u.taskCount}</td>
      </tr>`;
    })
    .join('');

  const totalTeamHours = (Object.values(byUser).reduce((s, u) => s + u.totalMinutes, 0) / 60).toFixed(1);
  const weekLabel = `${dateStrs[6]} to ${dateStrs[0]}`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1a3a2a,#4f46e5);padding:24px 28px;">
        <p style="margin:0;color:#a5f3fc;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">EduTechExOS</p>
        <h1 style="margin:6px 0 0;font-size:22px;color:#fff;">Weekly Team Activity Digest</h1>
        <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">${weekLabel} · ${totalTeamHours}h tracked across the team</p>
      </div>
      <div style="padding:24px 28px;">
        <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;">This Week's Activity</h2>
        ${rows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Member</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Total Time</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Avg/Day</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Msgs</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Tasks</th>
          </tr>${rows}</table>` : '<p style="font-size:13px;color:#94a3b8;">No tracked activity this week.</p>'}
      </div>
      <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">&copy; 2026 EduTechExOS &middot; Internal Team OS</div>
    </div>
  </div>`;

  const admins = VALID_ACCOUNTS.filter((a) => a.role === 'Admin');
  if (!admins.length) {
    console.warn('[weekly-digest] No admin accounts to send to.');
    return { recipients: 0 };
  }
  const [primary, ...rest] = admins;
  const { ok } = await sendBrevoEmail({
    to: [{ email: primary.email, name: primary.name }],
    bcc: rest.length > 0 ? rest.map((a) => ({ email: a.email, name: a.name })) : undefined,
    subject: `EduTechExOS: Weekly Team Activity Digest — ${weekLabel}`,
    html,
  });
  console.log(`[weekly-digest] Brevo send ${ok ? 'OK' : 'FAILED'} → ${admins.length} admin(s)`);
  return { recipients: admins.length };
}

module.exports = { buildDigestHtml, sendDigestEmails, sendWeeklyAdminDigest };
