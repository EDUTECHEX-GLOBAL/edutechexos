const fs = require('fs');

// Windows-1252 reverse map
const W1252_SPECIAL = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
};
const REVERSE = {};
for (const [byte, cp] of Object.entries(W1252_SPECIAL)) REVERSE[cp] = parseInt(byte);
for (let b = 0x80; b <= 0xFF; b++) { if (REVERSE[b] === undefined) REVERSE[b] = b; }
for (let b = 0x00; b <= 0x7F; b++) REVERSE[b] = b;

function charToW1252Byte(ch) {
  const cp = ch.codePointAt(0);
  return REVERSE[cp];
}

// Extended fix: handle any sequence of characters that can be reverse-mapped to W1252
// The key improvement: extend the regex to also cover 0x80-0xBF unicode range (U+0080-U+00BF)
function fixMojibake(text) {
  // Match any run of non-ASCII characters that could be multi-byte UTF-8 mojibake
  // Extended range covers U+0080-U+024F and the W1252 special chars
  return text.replace(/[-ɏˆ˜ -⁯‘-„†-•…‰‹›€™ŒœŠšŸŽžƒ]+/g, function(match) {
    try {
      const bytes = [];
      let valid = true;
      for (const ch of match) {
        const cp = ch.codePointAt(0);
        const byte = REVERSE[cp];
        if (byte === undefined) { valid = false; break; }
        bytes.push(byte);
      }
      if (!valid) return match;
      const buf = Buffer.from(bytes);
      const decoded = buf.toString('utf8');
      if (decoded !== match && !decoded.includes('�')) return decoded;
      return match;
    } catch(e) { return match; }
  });
}

const files = [
  'src/app/dashboard/components/AIPanel.tsx',
  'src/app/dashboard/components/AnalyticsPanel.tsx',
  'src/app/dashboard/components/CalendarPanel.tsx',
  'src/app/dashboard/components/ChannelMain.tsx',
  'src/app/dashboard/components/CommandPalette.tsx',
  'src/app/dashboard/components/FigmaPanel.tsx',
  'src/app/dashboard/components/KanbanBoard.tsx',
  'src/app/dashboard/components/NotepadPanel.tsx',
  'src/app/dashboard/components/WikiPanel.tsx',
  // Also check pages
  'src/app/dashboard/page.tsx',
  'src/app/admin/page.tsx',
  'src/app/sign-up-login-screen/page.tsx',
  'src/app/sign-up-login-screen/components/AuthCard.tsx',
  'src/app/sign-up-login-screen/components/LoginForm.tsx',
];

files.forEach(function(f) {
  try {
    const original = fs.readFileSync(f, 'utf8');
    const fixed = fixMojibake(original);
    if (fixed !== original) {
      fs.writeFileSync(f, fixed, 'utf8');
      console.log(f.split('/').pop() + ': FIXED ✓');
    } else {
      console.log(f.split('/').pop() + ': no change needed');
    }
  } catch(e) {
    console.log(f.split('/').pop() + ': ERROR - ' + e.message);
  }
});

// Final verification
console.log('\n=== VERIFICATION ===');
files.forEach(function(f) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    const garbled = content.match(/[ðÃÂ][^\x00-\x7F]{1,3}/g);
    if (garbled) {
      console.log(f.split('/').pop() + ': GARBLED: ' + [...new Set(garbled)].slice(0,5).join(' '));
    } else {
      console.log(f.split('/').pop() + ': CLEAN ✓');
    }
  } catch(e) {}
});
