const fs = require('fs');

// ── Fix EduTechExOSDashboard.tsx ─────────────────────────────────────────────
let d = fs.readFileSync('src/app/dashboard/components/EduTechExOSDashboard.tsx', 'utf8');

const goodEmojiOptions = `const EMOJI_OPTIONS = [
  '😀','😂','😍','🥰','😎','🤔','😭','😡','🤯','😴',
  '👍','👎','👏','🙏','✌️','🤝','👀','💪','🙌','🤞',
  '❤️','💛','💚','💙','💜','🔥','⭐','✨','🎉','🏆',
  '✅','❌','❓','❗','💯','🚀','💡','🎯','📌','🔔',
];`;

d = d.replace(/const EMOJI_OPTIONS = \[[\s\S]*?\];/, goodEmojiOptions);

// Fix garbled middle dot
d = d.replace(/Â·/g, '·');

fs.writeFileSync('src/app/dashboard/components/EduTechExOSDashboard.tsx', d, 'utf8');
console.log('EduTechExOSDashboard.tsx fixed');

// ── Fix DashboardSidebar.tsx ─────────────────────────────────────────────────
let s = fs.readFileSync('src/app/dashboard/components/DashboardSidebar.tsx', 'utf8');

// Replace each garbled sequence with the correct emoji
const sidebarReplacements = [
  ['ðŸ\x92¬', '💬'],
  ['ðŸŽ\x89', '🎉'],
  ['ðŸ\x92¥', '👥'],
  ['Â·', '·'],
];

sidebarReplacements.forEach(([bad, good]) => {
  s = s.split(bad).join(good);
});

fs.writeFileSync('src/app/dashboard/components/DashboardSidebar.tsx', s, 'utf8');
console.log('DashboardSidebar.tsx fixed');

// ── Verify ───────────────────────────────────────────────────────────────────
['src/app/dashboard/components/EduTechExOSDashboard.tsx',
 'src/app/dashboard/components/DashboardSidebar.tsx'].forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const garbled = content.match(/[ðÃÂ][^\x00-\x7F]{1,3}/g);
  console.log(f.split('/').pop() + ':', garbled ? 'STILL GARBLED: ' + garbled.slice(0,5) : 'CLEAN ✓');
});
