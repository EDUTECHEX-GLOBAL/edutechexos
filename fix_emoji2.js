const fs = require('fs');

// Windows-1252 byte 0x80-0x9F maps to these Unicode code points
const W1252_SPECIAL = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
};

// Reverse map: Unicode codepoint → W1252 byte
const REVERSE = {};
for (const [byte, cp] of Object.entries(W1252_SPECIAL)) {
  REVERSE[cp] = parseInt(byte);
}
// 0xA0-0xFF: same as Unicode
for (let b = 0xA0; b <= 0xFF; b++) REVERSE[b] = b;
// 0x00-0x7F: same as Unicode (ASCII)
for (let b = 0x00; b <= 0x7F; b++) REVERSE[b] = b;

function fixMojibake(text) {
  // Match runs of non-ASCII that look like mojibake
  // These are sequences where chars came from Windows-1252 misread of UTF-8 bytes
  return text.replace(/[À-ÿ-ˆ˜ŒœŠšŽžŸƒ–—‘’‚“”„†‡•…‰‹›€™]+/g, (match) => {
    try {
      // Convert each char back to its W1252 byte
      const bytes = [];
      for (const ch of match) {
        const cp = ch.codePointAt(0);
        const byte = REVERSE[cp];
        if (byte === undefined) return match; // not a W1252 char, skip
        bytes.push(byte);
      }
      const buf = Buffer.from(bytes);
      // Try to decode as UTF-8 — if it works and has no W1252 chars, it's fixed
      const decoded = buf.toString('utf8');
      // Verify: decoded should not contain the mojibake pattern characters
      if (!/[ÃÂð]/.test(decoded) && decoded !== match) {
        return decoded;
      }
      return match;
    } catch {
      return match;
    }
  });
}

const FILES = [
  'src/app/dashboard/components/EduTechExOSDashboard.tsx',
  'src/app/dashboard/components/DashboardSidebar.tsx',
];

FILES.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const fixed = fixMojibake(content);
  fs.writeFileSync(file, fixed, 'utf8');

  // Verify
  const check = fs.readFileSync(file, 'utf8');
  const remaining = check.match(/[ðÃÂ][^\x00-\x7F]{1,4}/g);
  console.log(
    file.split('/').pop() + ':',
    remaining ? 'STILL GARBLED: ' + [...new Set(remaining)].slice(0, 5).join(' ') : 'ALL CLEAN ✓'
  );
});
