import fs from 'fs';
import path from 'path';

// Manually load .env variables before importing code that relies on process.env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      process.env[key] = value;
    }
  }
}

async function test() {
  console.log('Fetching messages...');
  const { getLocalMessages } = await import('./src/app/actions/dbActions');
  const msgs = await getLocalMessages();
  console.log('Successfully fetched messages!');
  console.log(JSON.stringify(msgs, null, 2));
}

test().catch(console.error);
