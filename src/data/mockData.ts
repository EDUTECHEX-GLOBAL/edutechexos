export const CHANNELS = [
  {
    id: 'general',
    name: 'general',
    description: 'Team-wide announcements and updates',
    memberCount: 11,
    unread: 0,
  },
  {
    id: 'skillnaav',
    name: 'skillnaav',
    description: 'Career navigation & skill gap analysis product',
    memberCount: 6,
    unread: 3,
  },
  {
    id: 'edutechexassessa',
    name: 'edutechexassessa',
    description: 'Assessment platform & adaptive question engine',
    memberCount: 5,
    unread: 7,
  },
  {
    id: 'edutechex',
    name: 'edutechex',
    description: 'Core platform — Cambridge, IB, teacher training',
    memberCount: 9,
    unread: 2,
  },
  { id: 'member-ac', name: 'Aditya Cherikuri', description: 'Direct Message', memberCount: 2, unread: 0 },
  { id: 'member-rk', name: 'Ram K Aluru', description: 'Direct Message', memberCount: 2, unread: 0 },
  { id: 'member-sa', name: 'Sneha Agarwal', description: 'Direct Message', memberCount: 2, unread: 0 },
  { id: 'member-tm', name: 'Tarun Mehta', description: 'Direct Message', memberCount: 2, unread: 0 },
  { id: 'member-mk', name: 'Mohan K.', description: 'Direct Message', memberCount: 2, unread: 0 },
  { id: 'member-mr', name: 'Mohan R.', description: 'Direct Message', memberCount: 2, unread: 0 },
  { id: 'member-ms', name: 'Mohan S.', description: 'Direct Message', memberCount: 2, unread: 0 },
];

type Message = {
  id: string;
  sender: string;
  initials: string;
  color: string;
  timestamp: string;
  text: string;
  audioUrl?: string;
  videoUrl?: string;
  files?: { name: string; url: string; type: string }[];
};

const d = (offsetHours: number, offsetMins = 0) => {
  const base = new Date('2026-05-06T09:00:00');
  base.setHours(base.getHours() + offsetHours, base.getMinutes() + offsetMins);
  return base.toISOString();
};

export const MESSAGES_BY_CHANNEL: Record<string, Message[]> = {
  general: [
    {
      id: 'gen-001',
      sender: 'Aditya Cherikuri',
      initials: 'AC',
      color: '#2563eb',
      timestamp: d(0),
      text: 'Good morning team 👋 Sprint 12 kicks off today. Make sure your tasks are updated in the AI panel before standup.',
    },
    {
      id: 'gen-002',
      sender: 'Ram K Aluru',
      initials: 'RK',
      color: '#7c3aed',
      timestamp: d(0, 8),
      text: 'Morning! FastAPI backend for the AI agent is deployed to staging. Claude 3.5 integration is live — test it in the #skillnaav channel.',
    },
    {
      id: 'gen-003',
      sender: 'Ram K Aluru',
      initials: 'RK',
      color: '#7c3aed',
      timestamp: d(0, 9),
      text: 'Socket.io is also connected — new messages should now appear without refresh. Let me know if anyone hits reconnection issues.',
    },
    {
      id: 'gen-004',
      sender: 'Sneha Agarwal',
      initials: 'SA',
      color: '#0891b2',
      timestamp: d(0, 22),
      text: 'The new UI mockups for the SkillNaav onboarding flow are in Figma. Tagged everyone for review — please leave comments by EOD.',
    },
    {
      id: 'gen-005',
      sender: 'Tarun Mehta',
      initials: 'TM',
      color: '#059669',
      timestamp: d(1, 5),
      text: 'MongoDB indexes for the message history collection are optimized. Query times dropped from ~340ms to ~28ms on the channel feed endpoint.',
    },
    {
      id: 'gen-006',
      sender: 'Aditya Cherikuri',
      initials: 'AC',
      color: '#2563eb',
      timestamp: d(1, 15),
      text: 'Excellent work Tarun. Can you add that to the performance log doc in the knowledge base?',
    },
    {
      id: 'gen-007',
      sender: 'Priya Nair',
      initials: 'PN',
      color: '#dc2626',
      timestamp: d(2, 0),
      text: 'Reminder: School partnership call with DPS Hyderabad is at 3 PM today. Aditya, are you joining?',
    },
    {
      id: 'gen-008',
      sender: 'Aditya Cherikuri',
      initials: 'AC',
      color: '#2563eb',
      timestamp: d(2, 3),
      text: 'Yes, confirmed. Ram — can you prep a 5-minute product demo of EduTechExAssessa for the call?',
    },
    {
      id: 'gen-009',
      sender: 'Ram K Aluru',
      initials: 'RK',
      color: '#7c3aed',
      timestamp: d(2, 6),
      text: 'On it. Will use the staging environment — the adaptive scoring demo should be impressive.',
    },
  ],

  skillnaav: [
    {
      id: 'sk-001',
      sender: 'Sneha Agarwal',
      initials: 'SA',
      color: '#0891b2',
      timestamp: d(-8),
      text: 'The skill gap analysis UI is ready for review. Main screen shows radar chart of current vs target skills, with a recommended learning path below.',
    },
    {
      id: 'sk-002',
      sender: 'Tarun Mehta',
      initials: 'TM',
      color: '#059669',
      timestamp: d(-7, 45),
      text: 'I\'ve connected the recommendation engine API to the frontend. It\'s pulling from the MongoDB skills taxonomy collection.',
    },
    {
      id: 'sk-003',
      sender: 'Tarun Mehta',
      initials: 'TM',
      color: '#059669',
      timestamp: d(-7, 46),
      text: 'One issue: the latency on the first recommendation fetch is ~800ms because we\'re not caching the taxonomy. Should we add Redis here?',
    },
    {
      id: 'sk-004',
      sender: 'Ram K Aluru',
      initials: 'RK',
      color: '#7c3aed',
      timestamp: d(-7, 52),
      text: 'Yes — add a 1-hour TTL cache on the taxonomy endpoint. The data doesn\'t change often. I\'ll review the PR.',
    },
    {
      id: 'sk-005',
      sender: 'Aditya Cherikuri',
      initials: 'AC',
      color: '#2563eb',
      timestamp: d(-6),
      text: 'SkillNaav v0.3 milestone: recommendation engine connected, skill radar chart in UI, student profile creation working. We\'re on track for the May 15 beta.',
    },
    {
      id: 'sk-006',
      sender: 'Sneha Agarwal',
      initials: 'SA',
      color: '#0891b2',
      timestamp: d(-5, 30),
      text: 'Updated the Figma with the career path visualization. Added branching paths for STEM vs humanities tracks. Let me know what you think.',
    },
    {
      id: 'sk-007',
      sender: 'Priya Nair',
      initials: 'PN',
      color: '#dc2626',
      timestamp: d(-4),
      text: 'Content team has uploaded 340 skill definitions to the knowledge base. The AI agent should now be able to explain each skill with context.',
    },
    {
      id: 'sk-008',
      sender: 'Tarun Mehta',
      initials: 'TM',
      color: '#059669',
      timestamp: d(-3),
      text: 'Redis cache is deployed. First-fetch latency is now ~95ms. Subsequent fetches from cache are ~8ms.',
    },
    {
      id: 'sk-009',
      sender: 'Ram K Aluru',
      initials: 'RK',
      color: '#7c3aed',
      timestamp: d(-2, 30),
      text: 'Claude 3.5 is now reading from #skillnaav context when answering student queries about career paths. Test it in the AI Agent panel.',
    },
    {
      id: 'sk-010',
      sender: 'Aditya Cherikuri',
      initials: 'AC',
      color: '#2563eb',
      timestamp: d(-1),
      text: 'Team — please review the SkillNaav onboarding flow Sneha posted. We need sign-off before the DPS Hyderabad demo next week.',
    },
  ],

  edutechexassessa: [
    {
      id: 'ea-001',
      sender: 'Ram K Aluru',
      initials: 'RK',
      color: '#7c3aed',
      timestamp: d(-12),
      text: 'Adaptive question bank is live in staging. 2,400 questions across SAT, ACT, AP, and IIT-JEE Foundation. Difficulty adjusts based on last 5 responses.',
    },
    {
      id: 'ea-002',
      sender: 'Tarun Mehta',
      initials: 'TM',
      color: '#059669',
      timestamp: d(-11, 30),
      text: 'The automated scoring pipeline is working for MCQ and short answer. Essay scoring is still manual — Claude 3.5 rubric scoring is on the backlog.',
    },
    {
      id: 'ea-003',
      sender: 'Priya Nair',
      initials: 'PN',
      color: '#dc2626',
      timestamp: d(-10),
      text: 'Psychometric test module: MBTI and Holland Code assessments are content-complete. Need frontend integration for the results visualization.',
    },
    {
      id: 'ea-004',
      sender: 'Sneha Agarwal',
      initials: 'SA',
      color: '#0891b2',
      timestamp: d(-9),
      text: 'Working on the results dashboard now. Plan: score summary card at top, subject breakdown bar chart, percentile rank, and recommended next steps from AI.',
    },
    {
      id: 'ea-005',
      sender: 'Aditya Cherikuri',
      initials: 'AC',
      color: '#2563eb',
      timestamp: d(-8),
      text: 'This is shaping up really well. Can we add a "share results with parent" feature? Schools have been asking for parent-facing reports.',
    },
    {
      id: 'ea-006',
      sender: 'Ram K Aluru',
      initials: 'RK',
      color: '#7c3aed',
      timestamp: d(-7),
      text: 'Parent reports are feasible — PDF export via a FastAPI background task. I\'ll add it to the Sprint 13 backlog.',
    },
    {
      id: 'ea-007',
      sender: 'Tarun Mehta',
      initials: 'TM',
      color: '#059669',
      timestamp: d(-5),
      text: 'CLAT module is 60% complete. The legal reasoning question bank needs 200 more questions. Priya, can the content team prioritize that?',
    },
    {
      id: 'ea-008',
      sender: 'Priya Nair',
      initials: 'PN',
      color: '#dc2626',
      timestamp: d(-4, 30),
      text: 'On it — I\'ll assign Kavitha to CLAT legal reasoning questions this week. Should be done by Thursday.',
    },
    {
      id: 'ea-009',
      sender: 'Aditya Cherikuri',
      initials: 'AC',
      color: '#2563eb',
      timestamp: d(-2),
      text: 'EduTechExAssessa is the centerpiece of the DPS demo on Friday. Make sure the adaptive scoring and the results dashboard are polished.',
    },
  ],

  edutechex: [
    {
      id: 'etx-001',
      sender: 'Aditya Cherikuri',
      initials: 'AC',
      color: '#2563eb',
      timestamp: d(-16),
      text: 'Cambridge IGCSE Foundation Course update: all 8 subject modules are content-complete. Teacher Training module for Cambridge methodology is in review.',
    },
    {
      id: 'etx-002',
      sender: 'Priya Nair',
      initials: 'PN',
      color: '#dc2626',
      timestamp: d(-15),
      text: 'IB curriculum alignment is done for Math AA and Math AI. Physics and Chemistry are 80% complete — targeting end of this week.',
    },
    {
      id: 'etx-003',
      sender: 'Sneha Agarwal',
      initials: 'SA',
      color: '#0891b2',
      timestamp: d(-14),
      text: 'The live online class interface redesign is in Figma. Key changes: larger video grid, inline whiteboard, and a student question queue visible to the teacher.',
    },
    {
      id: 'etx-004',
      sender: 'Ram K Aluru',
      initials: 'RK',
      color: '#7c3aed',
      timestamp: d(-13),
      text: 'WebRTC integration for live classes is stable on Chrome and Safari. Firefox has an audio latency issue — investigating.',
    },
    {
      id: 'etx-005',
      sender: 'Tarun Mehta',
      initials: 'TM',
      color: '#059669',
      timestamp: d(-10),
      text: 'Teacher Training Program LMS: 12 modules uploaded, quiz engine connected, certificate generation on completion is working.',
    },
    {
      id: 'etx-006',
      sender: 'Aditya Cherikuri',
      initials: 'AC',
      color: '#2563eb',
      timestamp: d(-8),
      text: 'School collaboration portal: DPS Hyderabad, Oakridge International, and Chirec Public School are in the pilot cohort. Onboarding scheduled for May 12.',
    },
    {
      id: 'etx-007',
      sender: 'Priya Nair',
      initials: 'PN',
      color: '#dc2626',
      timestamp: d(-6),
      text: 'Foundation Course for Cambridge — parent orientation deck is ready. Covers: curriculum overview, teacher credentials, assessment schedule, and fee structure.',
    },
    {
      id: 'etx-008',
      sender: 'Ram K Aluru',
      initials: 'RK',
      color: '#7c3aed',
      timestamp: d(-4),
      text: 'Firefox audio latency fixed — was a codec negotiation issue in the SDP offer. All major browsers are now stable.',
    },
  ],
  'member-ac': [
    {
      id: 'dm-ac-001',
      sender: 'Aditya Cherikuri',
      initials: 'AC',
      color: '#2563eb',
      timestamp: d(-2),
      text: 'Hi there! Just following up on the latest sprint tasks. Let me know if you need any assistance on the Admin Guard or IP restrictions.',
    },
    {
      id: 'dm-ac-002',
      sender: 'Aditya Cherikuri',
      initials: 'AC',
      color: '#2563eb',
      timestamp: d(-1),
      text: 'Also, remember to use our 2.5-flash model in your copilot queries! Let me know if it responds properly.',
    }
  ],
  'member-rk': [
    {
      id: 'dm-rk-001',
      sender: 'Ram K Aluru',
      initials: 'RK',
      color: '#7c3aed',
      timestamp: d(-3),
      text: 'Hey! The FastAPI socket connections are fully optimized. We are good to run our local environment tests whenever you are ready.',
    }
  ],
  'member-sa': [
    {
      id: 'dm-sa-001',
      sender: 'Sneha Agarwal',
      initials: 'SA',
      color: '#0891b2',
      timestamp: d(-4),
      text: 'Good morning! The new Figma design mockups for EduTechEx have been finalized. I split the layout elements as requested.',
    }
  ],
  'member-tm': [
    {
      id: 'dm-tm-001',
      sender: 'Tarun Mehta',
      initials: 'TM',
      color: '#059669',
      timestamp: d(-5),
      text: 'Hey, I checked the MongoDB indexing for direct messaging history and it is extremely fast now. Ready to push to production.',
    }
  ],
  'member-mk': [
    { id: 'dm-mk-001', sender: 'Mohan K.', initials: 'MK', color: '#8b5cf6', timestamp: d(-1), text: 'Hello team, Mohan here. Ready for the sprint.' },
  ],
  'member-mr': [
    { id: 'dm-mr-001', sender: 'Mohan R.', initials: 'MR', color: '#ef4444', timestamp: d(-1), text: 'Checking in on the project status.' },
  ],
  'member-ms': [
    { id: 'dm-ms-001', sender: 'Mohan S.', initials: 'MS', color: '#10b981', timestamp: d(-1), text: 'Looking forward to the demo.' },
  ],
};

export const MOCK_TASKS = [
  {
    id: 'task-001',
    text: 'Add Redis cache with 1-hour TTL to the SkillNaav taxonomy endpoint to reduce first-fetch latency',
    assignee: 'Tarun M.',
    assigneeInitials: 'TM',
    sourceChannel: '#skillnaav · May 5',
    done: true,
  },
  {
    id: 'task-002',
    text: 'Prepare 5-minute EduTechExAssessa product demo for DPS Hyderabad call at 3 PM today',
    assignee: 'Ram K.',
    assigneeInitials: 'RK',
    sourceChannel: '#general · May 6',
    done: false,
  },
  {
    id: 'task-003',
    text: 'Review SkillNaav onboarding flow mockups in Figma and leave comments by EOD',
    assignee: 'Team',
    assigneeInitials: 'T',
    sourceChannel: '#skillnaav · May 6',
    done: false,
  },
  {
    id: 'task-004',
    text: 'Assign Kavitha to CLAT legal reasoning question bank — target 200 questions by Thursday',
    assignee: 'Priya N.',
    assigneeInitials: 'PN',
    sourceChannel: '#edutechexassessa · May 5',
    done: false,
  },
  {
    id: 'task-005',
    text: 'Add parent PDF report export feature to Sprint 13 backlog for EduTechExAssessa',
    assignee: 'Ram K.',
    assigneeInitials: 'RK',
    sourceChannel: '#edutechexassessa · May 5',
    done: false,
  },
  {
    id: 'task-006',
    text: 'Add MongoDB query performance improvement to the knowledge base performance log doc',
    assignee: 'Tarun M.',
    assigneeInitials: 'TM',
    sourceChannel: '#general · May 6',
    done: false,
  },
];

export const MOCK_DIGEST = {
  date: '2026-05-06',
  items: [
    {
      id: 'digest-001',
      text: '#skillnaav: Redis cache deployed — taxonomy endpoint latency down from 800ms to 95ms. SkillNaav v0.3 on track for May 15 beta.',
    },
    {
      id: 'digest-002',
      text: '#edutechexassessa: Adaptive question bank live in staging with 2,400 questions. CLAT module 60% complete. DPS demo prep underway.',
    },
    {
      id: 'digest-003',
      text: '#edutechex: WebRTC Firefox audio latency resolved. IB curriculum alignment 80% complete. School pilot cohort onboarding set for May 12.',
    },
    {
      id: 'digest-004',
      text: '#general: Sprint 12 started. FastAPI + Socket.io backend deployed to staging. 6 tasks auto-extracted across all channels.',
    },
  ],
};

export const MOCK_AI_RESPONSES = [
  {
    id: 'ai-init-001',
    role: 'assistant' as const,
    text: 'Hi! I\'m the EduTechEx Channel Copilot. I answer from the channel you currently have open and respect your assigned channel access.',
    citation: 'EduTechExOS · Org Knowledge Base',
    timestamp: new Date('2026-05-06T08:55:00').toISOString(),
  },
];
