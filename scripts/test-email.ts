// scripts/test-email.ts
// Simple script to trigger email flows for testing purposes.
// Usage: npx ts-node scripts/test-email.ts --flow=<flow> [options]
// Available flows: createAccount, scheduleMeeting, leaveRequest, leaveApproval, broadcast

import { sendMeetingEmailInvitation, sendAccessVerificationCode, sendMentionEmailNotification, sendBroadcastEmail } from '../packages/frontend/src/app/actions/dbActions';

async function main() {
  const args = new Map<string, string>();
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.replace(/^--?/, '').split('=');
    args.set(key, value ?? 'true');
  });

  const flow = args.get('flow');
  if (!flow) {
    console.error('Please specify --flow=<flow>');
    process.exit(1);
  }

  try {
    switch (flow) {
      case 'createAccount': {
        const name = args.get('name') || 'Test User';
        const email = args.get('email') || 'test@example.com';
        const code = args.get('code') || Math.floor(100000 + Math.random() * 900000).toString();
        const tempPassword = args.get('password') || 'temp-password-123';
        const result = await sendAccessVerificationCode(name, email, code, tempPassword);
        console.log('Account verification email result:', result);
        break;
      }
      case 'scheduleMeeting': {
        const title = args.get('title') || 'Team Sync';
        const time = args.get('time') || new Date().toLocaleString();
        const joinLink = args.get('link') || 'https://example.com/meeting';
        const invitees = (args.get('invitees') || 'user1@example.com,user2@example.com').split(',');
        const result = await sendMeetingEmailInvitation(title, time, invitees, joinLink);
        console.log('Meeting invitation email result:', result);
        break;
      }
      case 'leaveRequest': {
        // For demonstration, reuse mention notification as a placeholder for leave request
        const sender = args.get('sender') || 'Employee';
        const recipient = args.get('recipient') || 'admin@example.com';
        const channel = args.get('channel') || 'Leave Requests';
        const message = args.get('message') || 'Requesting leave for 2 days.';
        const result = await sendMentionEmailNotification(sender, recipient, recipient, channel, message);
        console.log('Leave request (mention) email result:', result);
        break;
      }
      case 'leaveApproval': {
        const name = args.get('name') || 'Employee';
        const email = args.get('email') || 'employee@example.com';
        const code = 'APPROVED'; // Simple approval code
        const tempPassword = 'approved-temp-password';
        const result = await sendAccessVerificationCode(name, email, code, tempPassword);
        console.log('Leave approval email result:', result);
        break;
      }
      case 'broadcast': {
        const subject = args.get('subject') || 'Broadcast Message';
        const html = args.get('html') || '<p>This is a broadcast email to all users.</p>';
        const recipientsRaw = args.get('recipients') || 'user1@example.com,user2@example.com';
        const recipients = recipientsRaw.split(',').map(email => ({ email }));
        const result = await sendBroadcastEmail(subject, html, recipients);
        console.log('Broadcast email result:', result);
        break;
      }
      default:
        console.error('Unknown flow:', flow);
        process.exit(1);
    }
  } catch (err) {
    console.error('Error executing email flow:', err);
    process.exit(1);
  }
}

main();
