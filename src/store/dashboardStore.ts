import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MESSAGES_BY_CHANNEL, CHANNELS } from '@/data/mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageAttachment = { name: string; url: string; type: string };

export type Poll = {
  question: string;
  options: { text: string; votes: string[] }[];
};

export type LinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
};

export type Message = {
  id: string;
  sender: string;
  initials: string;
  color: string;
  timestamp: string;
  text: string;
  audioUrl?: string;
  videoUrl?: string;
  files?: MessageAttachment[];
  editedAt?: string;
  parentId?: string;
  reactions?: Record<string, string[]>;
  poll?: Poll;
  linkPreview?: LinkPreview;
};

export type WikiPage = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type KanbanTask = {
  id: string;
  text: string;
  assignee: string;
  assigneeInitials: string;
  sourceChannel: string;
  status: 'todo' | 'inprogress' | 'done';
  createdAt: string;
};

type Notification = {
  id: string;
  type: 'reply' | 'reaction' | 'pin' | 'task' | 'mention';
  actor: string;
  actorInitials: string;
  actorColor: string;
  message: string;
  channel: string;
  timestamp: string;
  read: boolean;
  recipientEmails?: string[];
};

type Member = {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: string;
  status: 'online' | 'away' | 'offline';
  color: string;
};

type Channel = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  unread: number;
  memberIds?: string[];
};

// ─── State ────────────────────────────────────────────────────────────────────

type DashboardState = {
  activeChannel: string;
  setActiveChannel: (id: string) => void;

  messages: Record<string, Message[]>;
  addMessage: (channelId: string, message: Message) => void;
  deleteMessage: (channelId: string, messageId: string) => void;
  editMessage: (channelId: string, messageId: string, newText: string) => void;
  loadLocalMessages: () => Promise<void>;

  toggleReaction: (channelId: string, messageId: string, emoji: string, userEmail: string) => void;
  votePoll: (channelId: string, messageId: string, optionIdx: number, userEmail: string) => void;

  pinnedMessageIds: Record<string, string[]>;
  pinMessage: (channelId: string, messageId: string) => void;
  unpinMessage: (channelId: string, messageId: string) => void;

  bookmarkedMessageIds: string[];
  toggleBookmark: (messageId: string) => void;

  activeThreadId: string | null;
  setActiveThread: (id: string | null) => void;

  typingUsers: Record<string, string[]>;
  setTyping: (channelId: string, userName: string, isTyping: boolean) => void;

  darkMode: boolean;
  toggleDarkMode: () => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  kanbanTasks: KanbanTask[];
  addKanbanTask: (task: Omit<KanbanTask, 'id' | 'createdAt'>) => void;
  updateKanbanTaskStatus: (taskId: string, status: KanbanTask['status']) => void;
  deleteKanbanTask: (taskId: string) => void;

  wikiPages: Record<string, WikiPage[]>;
  addWikiPage: (channelId: string, data: { title: string; content: string }) => void;
  updateWikiPage: (channelId: string, pageId: string, data: Partial<Pick<WikiPage, 'title' | 'content'>>) => void;
  deleteWikiPage: (channelId: string, pageId: string) => void;
  loadLocalWikiPages: () => Promise<void>;

  notifications: Notification[];
  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  dismissNotification: (id: string) => void;

  aiSummary: Record<string, string>;
  setAiSummary: (channelId: string, summary: string) => void;

  channels: Channel[];
  addChannel: (channel: Channel) => void;

  members: Member[];
  addMember: (member: Member) => void;
  removeMember: (memberId: string) => void;
  addMemberToChannel: (channelId: string, memberId: string) => void;
  removeMemberFromChannel: (channelId: string, memberId: string) => void;
  setMemberWorkspaceChannel: (memberId: string, channelId: string | null) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isDM = (id: string) => id.startsWith('member-');
const isWS = (id: string) => !isDM(id);
const isExtraWS = (id: string) => isWS(id) && id !== 'general';
const withM = (ids: string[] = [], id: string) => (ids.includes(id) ? ids : [...ids, id]);
const withoutM = (ids: string[] = [], id: string) => ids.filter((x) => x !== id);
const syncCount = (ch: Channel): Channel => ({ ...ch, memberCount: ch.memberIds?.length ?? ch.memberCount });

const INITIAL_MEMBERS: Member[] = [
  { id: 'member-ac', initials: 'AC', name: 'Aditya Cherikuri', email: 'aditya@edutechex.in', role: 'Manager', status: 'online', color: '#2563eb' },
  { id: 'member-rk', initials: 'RK', name: 'Ram K Aluru', email: 'dev.rk@edutechex.in', role: 'Developer', status: 'online', color: '#7c3aed' },
  { id: 'member-sa', initials: 'SA', name: 'Sneha Agarwal', email: 'design.sa@edutechex.in', role: 'Designer', status: 'away', color: '#0891b2' },
  { id: 'member-tm', initials: 'TM', name: 'Tarun Mehta', email: 'tarun@edutechex.in', role: 'Lead', status: 'offline', color: '#059669' },
  { id: 'member-mohan1', initials: 'MK', name: 'Mohan Kumar', email: 'mohan.kumar@edutechex.in', role: 'Developer', status: 'online', color: '#dc2626' },
  { id: 'member-mohan2', initials: 'MR', name: 'Mohan Reddy', email: 'mohan.reddy@edutechex.in', role: 'Developer', status: 'online', color: '#eab308' },
  { id: 'member-mohan3', initials: 'MS', name: 'Mohan Sen', email: 'mohan.sen@edutechex.in', role: 'Developer', status: 'online', color: '#0891b2' },
];

const EXTRA_CH: Record<string, string> = {
  'member-ac': 'edutechex', 'member-rk': 'skillnaav', 'member-sa': 'skillnaav',
  'member-tm': 'edutechexassessa', 'member-mohan1': 'skillnaav',
  'member-mohan2': 'edutechexassessa', 'member-mohan3': 'edutechex',
};

const INITIAL_CHANNELS: Channel[] = CHANNELS.map((ch) => {
  if (isDM(ch.id)) return syncCount({ ...ch, memberIds: [ch.id] });
  if (ch.id === 'general') return syncCount({ ...ch, memberIds: INITIAL_MEMBERS.map((m) => m.id) });
  const memberIds = INITIAL_MEMBERS.filter((m) => EXTRA_CH[m.id] === ch.id).map((m) => m.id);
  return syncCount({ ...ch, memberIds });
});

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      activeChannel: 'general',
      setActiveChannel: (id) => set({ activeChannel: id }),

      messages: MESSAGES_BY_CHANNEL,

      addMessage: (channelId, message) => {
        fetch(`${API_BASE}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...message, channelId }),
        }).catch((err) => console.error('addMessage API error:', err));

        set((s) => ({
          messages: { ...s.messages, [channelId]: [...(s.messages[channelId] ?? []), message] },
        }));
      },

      deleteMessage: (channelId, messageId) => {
        fetch(`${API_BASE}/api/messages/${messageId}`, {
          method: 'DELETE',
        }).catch((err) => console.error('deleteMessage API error:', err));

        set((s) => ({
          messages: { ...s.messages, [channelId]: (s.messages[channelId] ?? []).filter((m) => m.id !== messageId) },
        }));
      },

      editMessage: (channelId, messageId, newText) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) =>
              m.id === messageId ? { ...m, text: newText, editedAt: new Date().toISOString() } : m
            ),
          },
        })),

      loadLocalMessages: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/messages`);
          const data = await res.json();
          if (!data.success || !data.messages) return;

          const dbMsgs = data.messages;
          const current = get().messages;
          const merged: Record<string, Message[]> = {};
          const allChs = new Set([...Object.keys(current), ...Object.keys(dbMsgs)]);
          allChs.forEach((chId) => {
            const local = new Map<string, Message>((current[chId] ?? []).map((m) => [m.id, m] as [string, Message]));
            const remote = new Map<string, Message>((dbMsgs[chId] ?? []).map((m: Message) => [m.id, m] as [string, Message]));
            const allIds = new Set<string>([...local.keys(), ...remote.keys()]);
            merged[chId] = Array.from(allIds)
              .map((id): Message | undefined => local.get(id) ?? remote.get(id))
              .filter((m): m is Message => m != null)
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          });
          set({ messages: merged });
        } catch (e) { console.error('load messages error', e); }
      },

      toggleReaction: (channelId, messageId, emoji, userEmail) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) => {
              if (m.id !== messageId) return m;
              const reactions = { ...(m.reactions ?? {}) };
              const users = reactions[emoji] ?? [];
              reactions[emoji] = users.includes(userEmail) ? users.filter((u) => u !== userEmail) : [...users, userEmail];
              if (!reactions[emoji].length) delete reactions[emoji];
              return { ...m, reactions };
            }),
          },
        })),

      votePoll: (channelId, messageId, optionIdx, userEmail) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) => {
              if (m.id !== messageId || !m.poll) return m;
              const options = m.poll.options.map((opt, i) => {
                const hasVote = opt.votes.includes(userEmail);
                if (i === optionIdx) return { ...opt, votes: hasVote ? opt.votes.filter((v) => v !== userEmail) : [...opt.votes, userEmail] };
                return { ...opt, votes: opt.votes.filter((v) => v !== userEmail) };
              });
              return { ...m, poll: { ...m.poll, options } };
            }),
          },
        })),

      pinnedMessageIds: {},
      pinMessage: (channelId, messageId) =>
        set((s) => ({
          pinnedMessageIds: { ...s.pinnedMessageIds, [channelId]: [...new Set([...(s.pinnedMessageIds[channelId] ?? []), messageId])] },
        })),
      unpinMessage: (channelId, messageId) =>
        set((s) => ({
          pinnedMessageIds: { ...s.pinnedMessageIds, [channelId]: (s.pinnedMessageIds[channelId] ?? []).filter((id) => id !== messageId) },
        })),

      bookmarkedMessageIds: [],
      toggleBookmark: (messageId) =>
        set((s) => ({
          bookmarkedMessageIds: s.bookmarkedMessageIds.includes(messageId)
            ? s.bookmarkedMessageIds.filter((id) => id !== messageId)
            : [...s.bookmarkedMessageIds, messageId],
        })),

      activeThreadId: null,
      setActiveThread: (id) => set({ activeThreadId: id }),

      typingUsers: {},
      setTyping: (channelId, userName, isTyping) =>
        set((s) => {
          const cur = s.typingUsers[channelId] ?? [];
          return {
            typingUsers: {
              ...s.typingUsers,
              [channelId]: isTyping ? [...new Set([...cur, userName])] : cur.filter((n) => n !== userName),
            },
          };
        }),

      darkMode: false,
      toggleDarkMode: () =>
        set((s) => {
          const next = !s.darkMode;
          if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', next);
          return { darkMode: next };
        }),

      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),

      kanbanTasks: [],
      addKanbanTask: (task) =>
        set((s) => ({ kanbanTasks: [...s.kanbanTasks, { ...task, id: `ktask-${Date.now()}`, createdAt: new Date().toISOString() }] })),
      updateKanbanTaskStatus: (taskId, status) =>
        set((s) => ({ kanbanTasks: s.kanbanTasks.map((t) => (t.id === taskId ? { ...t, status } : t)) })),
      deleteKanbanTask: (taskId) =>
        set((s) => ({ kanbanTasks: s.kanbanTasks.filter((t) => t.id !== taskId) })),

      wikiPages: {},
      addWikiPage: (channelId, data) => {
        const tempId = `wiki-${Date.now()}`;
        const page: WikiPage = { id: tempId, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set((s) => ({ wikiPages: { ...s.wikiPages, [channelId]: [...(s.wikiPages[channelId] ?? []), page] } }));

        fetch(`${API_BASE}/api/wikipages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tempId, channelId, title: data.title, content: data.content }),
        })
          .then((res) => res.json())
          .then((res) => {
            if (res.success && res.page) {
              set((s) => ({
                wikiPages: {
                  ...s.wikiPages,
                  [channelId]: (s.wikiPages[channelId] ?? []).map((p) => p.id === tempId ? res.page : p) as WikiPage[],
                }
              }));
            }
          })
          .catch((err) => console.error('addWikiPage API error:', err));
      },
      updateWikiPage: (channelId, pageId, data) => {
        set((s) => ({
          wikiPages: {
            ...s.wikiPages,
            [channelId]: (s.wikiPages[channelId] ?? []).map((p) =>
              p.id === pageId ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
            ),
          },
        }));

        const currentPage = get().wikiPages[channelId]?.find((p) => p.id === pageId);
        if (currentPage) {
          fetch(`${API_BASE}/api/wikipages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: pageId,
              channelId,
              title: currentPage.title,
              content: currentPage.content
            }),
          }).catch((err) => console.error('updateWikiPage API error:', err));
        }
      },
      deleteWikiPage: (channelId, pageId) => {
        fetch(`${API_BASE}/api/wikipages/${pageId}`, {
          method: 'DELETE',
        }).catch((err) => console.error('deleteWikiPage API error:', err));

        set((s) => ({ wikiPages: { ...s.wikiPages, [channelId]: (s.wikiPages[channelId] ?? []).filter((p) => p.id !== pageId) } }));
      },
      loadLocalWikiPages: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/wikipages`);
          const data = await res.json();
          if (!data.success || !data.pages) return;

          const dbPages = data.pages;
          const grouped: Record<string, WikiPage[]> = {};
          dbPages.forEach((p: any) => {
            const chId = p.channelId;
            if (!grouped[chId]) grouped[chId] = [];
            grouped[chId].push(p);
          });
          set({ wikiPages: grouped });
        } catch (e) {
          console.error('load wiki pages error', e);
        }
      },

      notifications: [],
      addNotification: (notif) =>
        set((s) => ({ notifications: [{ ...notif, id: `notif-${Date.now()}`, timestamp: new Date().toISOString(), read: false }, ...s.notifications] })),
      markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      markNotificationRead: (id) =>
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      dismissNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

      aiSummary: {},
      setAiSummary: (channelId, summary) =>
        set((s) => ({ aiSummary: { ...s.aiSummary, [channelId]: summary } })),

      channels: INITIAL_CHANNELS,
      addChannel: (channel) =>
        set((s) => {
          const memberIds = channel.id === 'general' ? s.members.map((m) => m.id)
            : isDM(channel.id) ? (channel.memberIds ?? [channel.id]) : [];
          const next = syncCount({ ...channel, memberIds });
          return { channels: [...s.channels, next], messages: { ...s.messages, [channel.id]: s.messages[channel.id] || [] } };
        }),

      members: INITIAL_MEMBERS,
      addMember: (member) =>
        set((s) => ({
          members: [...s.members, member],
          channels: s.channels.map((ch) => ch.id !== 'general' ? ch : syncCount({ ...ch, memberIds: withM(ch.memberIds, member.id) })),
          messages: { ...s.messages, [member.id]: [] },
        })),
      removeMember: (memberId) =>
        set((s) => ({
          members: s.members.filter((m) => m.id !== memberId),
          channels: s.channels.map((ch) => syncCount({ ...ch, memberIds: withoutM(ch.memberIds, memberId) })),
        })),
      addMemberToChannel: (channelId, memberId) =>
        set((s) => {
          if (channelId === 'general') {
            return { channels: s.channels.map((ch) => ch.id === 'general' ? syncCount({ ...ch, memberIds: withM(ch.memberIds, memberId) }) : ch) };
          }
          if (isExtraWS(channelId)) {
            return {
              channels: s.channels.map((ch) => {
                if (!isWS(ch.id)) return ch;
                if (ch.id === 'general') return syncCount({ ...ch, memberIds: withM(ch.memberIds, memberId) });
                return syncCount({ ...ch, memberIds: ch.id === channelId ? withM(ch.memberIds, memberId) : withoutM(ch.memberIds, memberId) });
              }),
            };
          }
          return { channels: s.channels.map((ch) => ch.id === channelId ? syncCount({ ...ch, memberIds: withM(ch.memberIds, memberId) }) : ch) };
        }),
      removeMemberFromChannel: (channelId, memberId) =>
        set((s) => {
          if (channelId === 'general') return { channels: s.channels };
          return { channels: s.channels.map((ch) => ch.id === channelId ? syncCount({ ...ch, memberIds: withoutM(ch.memberIds, memberId) }) : ch) };
        }),
      setMemberWorkspaceChannel: (memberId, channelId) =>
        set((s) => ({
          channels: s.channels.map((ch) => {
            if (!isWS(ch.id)) return ch;
            if (ch.id === 'general') return syncCount({ ...ch, memberIds: withM(ch.memberIds, memberId) });
            return syncCount({ ...ch, memberIds: ch.id === channelId ? withM(ch.memberIds, memberId) : withoutM(ch.memberIds, memberId) });
          }),
        })),
    }),
    {
      name: 'edutechex-dashboard-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        channels: s.channels,
        members: s.members,
        notifications: s.notifications,
        darkMode: s.darkMode,
        bookmarkedMessageIds: s.bookmarkedMessageIds,
        pinnedMessageIds: s.pinnedMessageIds,
        kanbanTasks: s.kanbanTasks,
        wikiPages: s.wikiPages,
      }),
    }
  )
);
