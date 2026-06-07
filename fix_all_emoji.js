const fs = require('fs');

// Windows-1252 special chars map (bytes 0x80-0x9F)
const W1252_SPECIAL = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
};

// Build reverse map: unicode codepoint -> W1252 byte
const REVERSE = {};
for (const [byte, cp] of Object.entries(W1252_SPECIAL)) {
  REVERSE[cp] = parseInt(byte);
}
for (let b = 0xA0; b <= 0xFF; b++) REVERSE[b] = b;
for (let b = 0x00; b <= 0x7F; b++) REVERSE[b] = b;

function fixMojibake(text) {
  // Match runs of non-ASCII characters that could be mojibake
  return text.replace(/[À-ÿĀ-ſ -⁯ŒœŠšŸŽžƒˆ˜™‹›€]+/g, function(match) {
    try {
      const bytes = [];
      let valid = true;
      for (const ch of match) {
        const cp = ch.codePointAt(0);
        const byte = REVERSE[cp];
        if (byte === undefined) {
          valid = false;
          break;
        }
        bytes.push(byte);
      }
      if (!valid) return match;
      const buf = Buffer.from(bytes);
      const decoded = buf.toString('utf8');
      // Only accept if decode produces something different and valid (no replacement chars)
      if (decoded !== match && !decoded.includes('�')) {
        return decoded;
      }
      return match;
    } catch(e) {
      return match;
    }
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
  'src/app/dashboard/components/LoginTrackerCalendar.tsx',
  'src/app/dashboard/components/NotepadPanel.tsx',
  'src/app/dashboard/components/WikiPanel.tsx',
  // Check landing page components too
  'src/app/components/FloatingOrbs.tsx',
  'src/app/components/LandingCTA.tsx',
  'src/app/components/LandingFeatures.tsx',
  'src/app/components/LandingFooter.tsx',
  'src/app/components/LandingHero.tsx',
  'src/app/components/LandingHowItWorks.tsx',
  'src/app/components/LandingMarquee.tsx',
  'src/app/components/LandingNav.tsx',
  'src/app/components/LandingStats.tsx',
  'src/app/components/LandingTestimonials.tsx',
  'src/app/components/LandingTrustedBy.tsx',
  'src/app/components/ScrollColorText.tsx',
  'src/app/components/ScrollProgressBar.tsx',
  'src/app/components/SplashScreen.tsx',
];

files.forEach(function(f) {
  try {
    const original = fs.readFileSync(f, 'utf8');
    const fixed = fixMojibake(original);
    if (fixed !== original) {
      fs.writeFileSync(f, fixed, 'utf8');
      const remaining = fixed.match(/[\xF0\xC3\xC2][\x80-\xFF]{1,3}/g);
      console.log(f.split('/').pop() + ': FIXED (changed) ' + (remaining ? 'STILL HAS SOME GARBLED: ' + remaining.slice(0,3) : '✓'));
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
