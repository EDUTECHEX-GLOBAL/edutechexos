// scripts/test-email.js
// Run with: node scripts/test-email.js <flow>
// Available flows: meeting, access, mention, broadcast

// Enable ts-node to import TypeScript modules
require('ts-node').register({ transpileOnly: true });

const {
  sendAccessVerificationCode,
  sendMeetingEmailInvitation,
  sendMentionEmailNotification,
  sendBroadcastEmail,
} = require('../src/app/actions/dbActions');

async function main() {
  const args = process.argv.slice(2);
  const flow = args[0];
  switch (flow) {
    case 'meeting':
      await sendMeetingEmailInvitation(
        'Demo Meeting',
        '2026-07-01 10:00 UTC',
        ['test@example.com'],
        'https://example.com/meeting'
      );
      console.log('Meeting invitation sent');
      break;
    case 'access':
      await sendAccessVerificationCode('Test User', 'test@example.com', '123456');
      console.log('Access verification email sent');
      break;
    case 'mention':
      await sendMentionEmailNotification(
        'Alice',
        'Bob',
        'bob@example.com',
        'general',
        'You have been mentioned in a message.'
      );
      console.log('Mention notification sent');
      break;
    case 'broadcast':
      await sendBroadcastEmail(
        'Broadcast Test',
        '<p>This is a broadcast email.</p>',
        [{ email: 'test1@example.com' }, { email: 'test2@example.com' }]
      );
      console.log('Broadcast email sent');
      break;
    default:
      console.log('Usage: node scripts/test-email.js <meeting|access|mention|broadcast>');
  }
}

main().catch((err) => console.error('Test script error:', err));
