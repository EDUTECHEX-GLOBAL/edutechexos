import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CHANNELS } from '@/data/mockData';

// Route message API calls through the backend so Socket.IO events are emitted.
// Falls back to relative Next.js routes if the env var is not set.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

// ─── Auth helpers ────────────────────────────────────────────────────────────
function getStoredAuth(): { token?: string; user?: { email?: string } } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('edutechex_token');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getToken(): string | undefined {
  return getStoredAuth()?.token;
}

function getCurrentUserEmail(): string | undefined {
  return getStoredAuth()?.user?.email;
}

/** Wraps fetch with Authorization header and userEmail injection. */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const email = getCurrentUserEmail();

  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const method = (options.method || 'GET').toUpperCase();

  // Attach userEmail to query string for GET; merge into body for POST/PATCH/DELETE
  if (email) {
    if (method === 'GET') {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}userEmail=${encodeURIComponent(email)}`;
    } else if (options.body && typeof options.body === 'string') {
      try {
        const parsed = JSON.parse(options.body);
        if (!parsed.userEmail) {
          parsed.userEmail = email;
          options = { ...options, body: JSON.stringify(parsed) };
        }
      } catch { /* not JSON — skip */ }
    }
  }

  return fetch(url, { ...options, headers });
}

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
  // soft-delete — set by server when "Delete for everyone" is triggered
  isDeleted?: boolean;
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
  assigneeEmail?: string;   // used to show the task only to the assigned person
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
  hasMoreMessages: Record<string, boolean>;
  isLoadingMore: Record<string, boolean>;
  addMessage: (channelId: string, message: Message) => void;
  addMessageFromSocket: (channelId: string, message: Message) => void;
  updateMessageFromSocket: (channelId: string, message: Message) => void;
  deleteMessage: (channelId: string, messageId: string) => void;
  deleteMessageFromSocket: (channelId: string, messageId: string) => void;
  editMessage: (channelId: string, messageId: string, newText: string) => void;
  loadLocalMessages: () => Promise<void>;
  loadMoreMessages: (channelId: string) => Promise<void>;

  toggleReaction: (channelId: string, messageId: string, emoji: string, userEmail: string) => void;
  votePoll: (channelId: string, messageId: string, optionIdx: number, userEmail: string) => void;

  pinnedMessageIds: Record<string, string[]>;
  pinMessage: (channelId: string, messageId: string) => void;
  unpinMessage: (channelId: string, messageId: string) => void;
  loadPinnedMessages: () => Promise<void>;

  bookmarkedMessageIds: string[];
  toggleBookmark: (messageId: string, message?: { channelId?: string; text?: string; sender?: string; timestamp?: string }) => void;
  loadLocalBookmarkedIds: () => Promise<void>;

  activeThreadId: string | null;
  setActiveThread: (id: string | null) => void;

  typingUsers: Record<string, string[]>;
  setTyping: (channelId: string, userName: string, isTyping: boolean) => void;

  darkMode: boolean;
  toggleDarkMode: () => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  kanbanTasks: KanbanTask[];
  loadLocalKanbanTasks: () => Promise<void>;
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
  loadLocalNotifications: (email?: string) => Promise<void>;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  dismissNotification: (id: string) => void;

  aiSummary: Record<string, string>;
  setAiSummary: (channelId: string, summary: string) => void;

  channels: Channel[];
  addChannel: (channel: Channel) => void;
  loadWorkspaceChannels: () => Promise<void>;

  members: Member[];
  loadLocalMembers: () => Promise<void>;
  addMember: (member: Member) => void;
  removeMember: (memberId: string) => void;
  addMemberToChannel: (channelId: string, memberId: string) => void;
  removeMemberFromChannel: (channelId: string, memberId: string) => void;
  setMemberWorkspaceChannel: (memberId: string, channelId: string | null) => void;
  setMemberWorkspaceChannels: (memberId: string, channelIds: string[]) => void;
  setMemberRole: (memberId: string, role: string) => void;
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
  { id: 'member-mk', initials: 'MK', name: 'Mohan Kumar', email: 'mohan.kumar@edutechex.in', role: 'Developer', status: 'online', color: '#dc2626' },
  { id: 'member-mr', initials: 'MR', name: 'Mohan Reddy', email: 'mohan.reddy@edutechex.in', role: 'Developer', status: 'online', color: '#eab308' },
  { id: 'member-ms', initials: 'MS', name: 'Mohan Sen', email: 'mohan.sen@edutechex.in', role: 'Developer', status: 'online', color: '#0891b2' },
];

const EXTRA_CH: Record<string, string> = {
  'member-ac': 'edutechex', 'member-rk': 'skillnaav', 'member-sa': 'skillnaav',
  'member-tm': 'edutechexassessa', 'member-mk': 'skillnaav',
  'member-mr': 'edutechexassessa', 'member-ms': 'edutechex',
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

      messages: {} as Record<string, Message[]>,
      hasMoreMessages: {} as Record<string, boolean>,
      isLoadingMore: {} as Record<string, boolean>,

      addMessage: (channelId, message) => {
        apiFetch(`${API_BASE}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...message, channelId }),
        }).catch(() => { /* backend unavailable — message saved locally */ });

        set((s) => ({
          messages: { ...s.messages, [channelId]: [...(s.messages[channelId] ?? []), message] },
        }));
      },

      // Called by the Socket.IO listener — updates state WITHOUT hitting the API.
      // Deduplicates using both `id` and `clientId` to avoid double-rendering
      // the message that the sender already added optimistically.
      addMessageFromSocket: (channelId, message) => {
        set((s) => {
          const existing = s.messages[channelId] ?? [];
          const incomingClientId = (message as Message & { clientId?: string }).clientId;

          const alreadyPresent = existing.some((m) => {
            // Server already gave this exact MongoDB id to us
            if (m.id === message.id) return true;
            // This is the server echo of a message we added optimistically
            // (our local copy has id = clientId, server copy has id = ObjectId)
            if (incomingClientId && m.id === incomingClientId) return true;
            return false;
          });

          if (alreadyPresent) return s;

          return {
            messages: {
              ...s.messages,
              [channelId]: [...existing, message],
            },
          };
        });
      },

      // Called by the Socket.IO `message_updated` listener — replaces the message in-place.
      updateMessageFromSocket: (channelId, message) => {
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) =>
              m.id === message.id ? { ...m, ...message } : m
            ),
          },
        }));
      },

      deleteMessage: (channelId, messageId) => {
        // Soft-delete: message stays in DB, UI shows a placeholder (WhatsApp style)
        apiFetch(`${API_BASE}/api/messages/${messageId}`, {
          method: 'DELETE',
        }).catch(() => { /* backend unavailable — optimistic soft-delete applied */ });

        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) =>
              m.id === messageId
                ? { ...m, isDeleted: true, text: '', audioUrl: undefined, videoUrl: undefined, files: undefined, poll: undefined, reactions: undefined }
                : m
            ),
          },
        }));
      },

      // Called by Socket.IO 'message_deleted' — marks as soft-deleted without re-calling the API
      deleteMessageFromSocket: (channelId, messageId) => {
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) =>
              m.id === messageId
                ? { ...m, isDeleted: true, text: '', audioUrl: undefined, videoUrl: undefined, files: undefined, poll: undefined, reactions: undefined }
                : m
            ),
          },
        }));
      },

      editMessage: (channelId, messageId, newText) => {
        const editedAt = new Date().toISOString();
        // Persist to backend — server will also broadcast `message_updated` via Socket.IO
        apiFetch(`${API_BASE}/api/messages/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newText, editedAt }),
        }).catch(() => { /* backend unavailable */ });

        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) =>
              m.id === messageId ? { ...m, text: newText, editedAt } : m
            ),
          },
        }));
      },

      loadLocalMessages: async () => {
        try {
          const res = await apiFetch(`${API_BASE}/api/messages`);
          if (!res.ok) {
            console.warn('Backend unavailable, using local messages (status', res.status, ')');
            return;
          }
          const data = await res.json();
          if (!data.success || !data.messages) return;

          const dbMsgs: Record<string, Message[]> = data.messages;
          const current = get().messages;
          const merged: Record<string, Message[]> = {};

          // Collect all channel ids from both server and local state
          const allChs = new Set([...Object.keys(current), ...Object.keys(dbMsgs)]);

          allChs.forEach((chId) => {
            const serverMsgs: Message[] = dbMsgs[chId] ?? [];
            const localMsgs: Message[] = current[chId] ?? [];

            // Build a set of all server-side ids (using both _id and clientId)
            const serverIds = new Set<string>();
            const serverClientIds = new Set<string>();
            serverMsgs.forEach((m: Message & { clientId?: string }) => {
              serverIds.add(m.id);
              if (m.clientId) serverClientIds.add(m.clientId);
            });

            // Keep local messages that haven't reached the server yet
            // (optimistic messages sent by THIS client but not yet persisted)
            const pendingLocal = localMsgs.filter(
              (m) => !serverIds.has(m.id) && !serverClientIds.has(m.id)
            );

            // Server is the source of truth; append pending local-only messages
            const combined = [...serverMsgs, ...pendingLocal].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            merged[chId] = combined;
          });

          set({ messages: merged, hasMoreMessages: data.hasMore ?? {} });
        } catch { /* backend unavailable — keep current state */ }
      },

      loadMoreMessages: async (channelId) => {
        const existing = get().messages[channelId] ?? [];
        if (!existing.length) return;
        // Use the oldest loaded message as the "before" cursor
        const oldest = existing[0].timestamp;
        set((s) => ({ isLoadingMore: { ...s.isLoadingMore, [channelId]: true } }));
        try {
          const res = await apiFetch(
            `${API_BASE}/api/messages?channelId=${encodeURIComponent(channelId)}&before=${encodeURIComponent(oldest)}&limit=50`
          );
          if (!res.ok) return;
          const data = await res.json();
          if (!data.success) return;
          const older: Message[] = data.messages ?? [];
          set((s) => ({
            messages: {
              ...s.messages,
              [channelId]: [
                ...older,
                ...(s.messages[channelId] ?? []),
              ],
            },
            hasMoreMessages: { ...s.hasMoreMessages, [channelId]: data.hasMore },
            isLoadingMore:   { ...s.isLoadingMore,   [channelId]: false },
          }));
        } catch {
          set((s) => ({ isLoadingMore: { ...s.isLoadingMore, [channelId]: false } }));
        }
      },

      toggleReaction: (channelId, messageId, emoji, userEmail) => {
        // Compute the new reactions map before calling set() so we can POST it
        const current = get().messages[channelId]?.find((m) => m.id === messageId);
        if (!current) return;

        const reactions = { ...(current.reactions ?? {}) };
        const users = reactions[emoji] ?? [];
        reactions[emoji] = users.includes(userEmail)
          ? users.filter((u) => u !== userEmail)
          : [...users, userEmail];
        if (!reactions[emoji].length) delete reactions[emoji];

        // Persist to backend — also triggers `message_updated` broadcast
        apiFetch(`${API_BASE}/api/messages/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reactions }),
        }).catch(() => { /* backend unavailable */ });

        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) =>
              m.id === messageId ? { ...m, reactions } : m
            ),
          },
        }));
      },

      votePoll: (channelId, messageId, optionIdx, userEmail) => {
        const current = get().messages[channelId]?.find((m) => m.id === messageId);
        if (!current || !current.poll) return;

        const options = current.poll.options.map((opt, i) => {
          const hasVote = opt.votes.includes(userEmail);
          if (i === optionIdx)
            return { ...opt, votes: hasVote ? opt.votes.filter((v) => v !== userEmail) : [...opt.votes, userEmail] };
          return { ...opt, votes: opt.votes.filter((v) => v !== userEmail) };
        });
        const poll = { ...current.poll, options };

        // Persist to backend — also triggers `message_updated` broadcast
        apiFetch(`${API_BASE}/api/messages/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poll }),
        }).catch(() => { /* backend unavailable */ });

        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) =>
              m.id === messageId && m.poll ? { ...m, poll } : m
            ),
          },
        }));
      },

      pinnedMessageIds: {},
      pinMessage: (channelId, messageId) => {
        // Optimistic update
        set((s) => ({
          pinnedMessageIds: {
            ...s.pinnedMessageIds,
            [channelId]: [...new Set([...(s.pinnedMessageIds[channelId] ?? []), messageId])],
          },
        }));
        // Persist to MongoDB
        apiFetch(`${API_BASE}/api/pinned`, {
          method: 'POST',
          body: JSON.stringify({ channelId, messageId }),
        }).catch(() => {});
      },
      unpinMessage: (channelId, messageId) => {
        // Optimistic update
        set((s) => ({
          pinnedMessageIds: {
            ...s.pinnedMessageIds,
            [channelId]: (s.pinnedMessageIds[channelId] ?? []).filter((id) => id !== messageId),
          },
        }));
        // Remove from MongoDB
        apiFetch(
          `${API_BASE}/api/pinned/${encodeURIComponent(channelId)}/${encodeURIComponent(messageId)}`,
          { method: 'DELETE' }
        ).catch(() => {});
      },
      loadPinnedMessages: async () => {
        try {
          const res = await apiFetch(`${API_BASE}/api/pinned`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.success && data.pinnedMessageIds) {
            set({ pinnedMessageIds: data.pinnedMessageIds });
          }
        } catch { /* backend unavailable — keep local state */ }
      },

      bookmarkedMessageIds: [],
      toggleBookmark: (messageId, message?: { channelId?: string; text?: string; sender?: string; timestamp?: string }) => {
        // Local optimistic toggle
        set((s) => ({
          bookmarkedMessageIds: s.bookmarkedMessageIds.includes(messageId)
            ? s.bookmarkedMessageIds.filter((id) => id !== messageId)
            : [...s.bookmarkedMessageIds, messageId],
        }));
        // Persist to backend
        if (message) {
          apiFetch(`${API_BASE}/api/bookmarks/toggle`, {
            method: 'POST',
            body: JSON.stringify({ messageId, ...message }),
          }).catch(() => {});
        }
      },
      loadLocalBookmarkedIds: async () => {
        try {
          const res = await apiFetch(`${API_BASE}/api/bookmarks`);
          const data = await res.json();
          if (data.success && data.bookmarks) {
            set({ bookmarkedMessageIds: data.bookmarks.map((b: any) => b.messageId) });
          }
        } catch { /* backend unavailable — keep local state */ }
      },

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

      loadLocalKanbanTasks: async () => {
        try {
          const res = await apiFetch(`${API_BASE}/api/kanban`);
          if (!res.ok) return;
          const data = await res.json();
          if (!data.success || !data.tasks) return;
          set({ kanbanTasks: data.tasks as KanbanTask[] });
        } catch { /* backend unavailable */ }
      },

      addKanbanTask: (task) => {
        const tempId = `ktask-${Date.now()}`;
        const newTask: KanbanTask = { ...task, id: tempId, createdAt: new Date().toISOString() };
        set((s) => ({ kanbanTasks: [...s.kanbanTasks, newTask] }));
        // Persist to backend; swap temp id with real MongoDB id
        apiFetch(`${API_BASE}/api/kanban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.task?.id) {
              set((s) => ({
                kanbanTasks: s.kanbanTasks.map((t) => (t.id === tempId ? data.task : t)),
              }));
            }
          })
          .catch(() => { /* backend unavailable — task is saved locally */ });
      },

      updateKanbanTaskStatus: (taskId, status) => {
        set((s) => ({ kanbanTasks: s.kanbanTasks.map((t) => (t.id === taskId ? { ...t, status } : t)) }));
        apiFetch(`${API_BASE}/api/kanban/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }).catch(() => { /* backend unavailable */ });
      },

      deleteKanbanTask: (taskId) => {
        set((s) => ({ kanbanTasks: s.kanbanTasks.filter((t) => t.id !== taskId) }));
        apiFetch(`${API_BASE}/api/kanban/${taskId}`, {
          method: 'DELETE',
        }).catch(() => { /* backend unavailable */ });
      },

      wikiPages: {},
      addWikiPage: (channelId, data) => {
        const tempId = `wiki-${Date.now()}`;
        const page: WikiPage = { id: tempId, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set((s) => ({ wikiPages: { ...s.wikiPages, [channelId]: [...(s.wikiPages[channelId] ?? []), page] } }));

        apiFetch(`${API_BASE}/api/wikipages`, {
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
          .catch(() => { /* backend unavailable */ });
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
          apiFetch(`${API_BASE}/api/wikipages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: pageId,
              channelId,
              title: currentPage.title,
              content: currentPage.content
            }),
          }).catch(() => { /* backend unavailable */ });
        }
      },
      deleteWikiPage: (channelId, pageId) => {
        apiFetch(`${API_BASE}/api/wikipages/${pageId}`, {
          method: 'DELETE',
        }).catch(() => { /* backend unavailable */ });

        set((s) => ({ wikiPages: { ...s.wikiPages, [channelId]: (s.wikiPages[channelId] ?? []).filter((p) => p.id !== pageId) } }));
      },
      loadLocalWikiPages: async () => {
        try {
          const res = await apiFetch(`${API_BASE}/api/wikipages`);
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
        } catch { /* backend unavailable — keep current wiki state */ }
      },

      notifications: [],
      addNotification: (notif) => {
        const localId = `notif-${Date.now()}`;
        const newNotif = { ...notif, id: localId, timestamp: new Date().toISOString(), read: false };
        set((s) => ({ notifications: [newNotif, ...s.notifications] }));
        // POST to backend so other users can receive it; swap local temp-id for real MongoDB id
        apiFetch(`${API_BASE}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notif),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.notification?.id) {
              set((s) => ({
                notifications: s.notifications.map((n) =>
                  n.id === localId ? { ...n, id: data.notification.id } : n
                ),
              }));
            }
          })
          .catch(() => {});
      },
      loadLocalNotifications: async (email?: string) => {
        try {
          const url = email
            ? `${API_BASE}/api/notifications?email=${encodeURIComponent(email)}`
            : `${API_BASE}/api/notifications`;
          const res = await apiFetch(url);
          if (!res.ok) return;
          const data = await res.json();
          if (!data.success || !data.notifications) return;
          set((s) => {
            const localIds = new Set(s.notifications.map((n) => n.id));
            const raw: Array<Omit<Notification, 'read'> & { id: string }> = data.notifications;
            const incoming: Notification[] = raw
              .filter((n) => !localIds.has(n.id))
              .map((n) => ({ ...n, read: false } as Notification));
            if (!incoming.length) return s;
            return { notifications: [...incoming, ...s.notifications] };
          });
        } catch { /* backend unavailable */ }
      },
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
      loadWorkspaceChannels: async () => {
        try {
          const res = await apiFetch(`${API_BASE}/api/channels`);
          if (!res.ok) return;
          const data = await res.json();
          if (!data.success || !data.channels) return;

          const dbChannels: Channel[] = data.channels;
          set((s) => {
            // Keep DM channels (member-*) as-is, replace workspace channels with DB version
            const dmChannels = s.channels.filter((ch) => isDM(ch.id));
            const existingMemberIds: Record<string, string[]> = {};
            s.channels.forEach((ch) => {
              if (!isDM(ch.id)) existingMemberIds[ch.id] = ch.memberIds ?? [];
            });

            const updatedWorkspaceChannels = dbChannels.map((ch) =>
              syncCount({ ...ch, memberIds: existingMemberIds[ch.id] ?? (ch.id === 'general' ? s.members.map((m) => m.id) : []) })
            );

            // Ensure messages map has an entry for any new channel
            const newMsgEntries: Record<string, Message[]> = {};
            dbChannels.forEach((ch) => {
              if (!s.messages[ch.id]) newMsgEntries[ch.id] = [];
            });

            return {
              channels: [...updatedWorkspaceChannels, ...dmChannels],
              messages: { ...s.messages, ...newMsgEntries },
            };
          });
        } catch { /* backend unavailable — keep hardcoded channels */ }
      },

      members: INITIAL_MEMBERS,
      loadLocalMembers: async () => {
        try {
          const res = await apiFetch(`${API_BASE}/api/members`);
          if (!res.ok) {
            // 401 = token expired or not logged in yet; 5xx = backend waking up
            const retryDelay = res.status === 401 ? 5_000 : 10_000;
            console.warn(`[members] /api/members returned ${res.status} — retrying in ${retryDelay / 1000}s…`);
            setTimeout(() => useDashboardStore.getState().loadLocalMembers?.(), retryDelay);
            return;
          }
          const data = await res.json();
          if (!data.success || !data.members) return;

          const dbMembers: Member[] = data.members;
          set((s) => {
            // Update workspace channels with correct member IDs
            const newChannels = s.channels.map((ch) => {
              if (!isWS(ch.id)) return ch;
              if (ch.id === 'general') {
                const allMemberIds = dbMembers.map((m) => m.id);
                return syncCount({ ...ch, memberIds: allMemberIds });
              }
              const assignedMemberIds = dbMembers
                .filter((m: any) =>
                  (Array.isArray((m as any).channelIds) && (m as any).channelIds.includes(ch.id)) ||
                  (m as any).channelId === ch.id
                )
                .map((m) => m.id);

              const systemMemberIds = ch.memberIds?.filter((id) => !id.startsWith('member-') || INITIAL_MEMBERS.some((m) => m.id === id)) ?? [];
              const mergedMemberIds = [...new Set([...systemMemberIds, ...assignedMemberIds])];
              return syncCount({ ...ch, memberIds: mergedMemberIds });
            });

            // Ensure every member has a DM channel in the channels list
            const existingChannelIds = new Set(newChannels.map((ch) => ch.id));
            const dmChannelsToAdd: Channel[] = [];
            dbMembers.forEach((m) => {
              if (!existingChannelIds.has(m.id)) {
                dmChannelsToAdd.push({
                  id: m.id,
                  name: m.name,
                  description: `Direct message with ${m.name}`,
                  memberCount: 1,
                  unread: 0,
                  memberIds: [m.id],
                });
              }
            });

            return {
              members: dbMembers,
              channels: [...newChannels, ...dmChannelsToAdd],
              messages: {
                ...s.messages,
                ...Object.fromEntries(dmChannelsToAdd.map((ch) => [ch.id, s.messages[ch.id] ?? []])),
              },
            };
          });
        } catch (err) {
          console.warn('[members] Backend unreachable — Render may be cold-starting. Retrying in 15s…', err);
          setTimeout(() => useDashboardStore.getState().loadLocalMembers?.(), 15_000);
        }
      },
      addMember: (member) => {
        const isSystem = ['admin@edutechex.in', 'aditya@edutechex.in', 'dev.rk@edutechex.in', 'design.sa@edutechex.in', 'tarun@edutechex.in', 'mohan.kumar@edutechex.in', 'mohan.reddy@edutechex.in', 'mohan.sen@edutechex.in'].includes(member.email.toLowerCase());
        if (!isSystem) {
          apiFetch(`${API_BASE}/api/members`, {
            method: 'POST',
            body: JSON.stringify({
              name: member.name,
              email: member.email,
              role: member.role,
              channelId: null,
            }),
          })
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.member) {
              get().loadLocalMembers();
            }
          })
          .catch(() => {});
        }

        set((s) => ({
          members: s.members.some((m) => m.email.toLowerCase() === member.email.toLowerCase()) ? s.members : [...s.members, member],
          channels: s.channels.map((ch) => ch.id !== 'general' ? ch : syncCount({ ...ch, memberIds: withM(ch.memberIds, member.id) })),
          messages: { ...s.messages, [member.id]: [] },
        }));
      },
      removeMember: (memberId) => {
        const isSystemId = ['member-ac', 'member-rk', 'member-sa', 'member-tm', 'member-mk', 'member-mr', 'member-ms'].includes(memberId);
        if (!isSystemId) {
          const dbId = memberId.replace('member-', '');
          apiFetch(`${API_BASE}/api/access-requests/${dbId}`, {
            method: 'DELETE',
          })
          .then(() => {
            get().loadLocalMembers();
          })
          .catch(() => {});
        }

        set((s) => ({
          members: s.members.filter((m) => m.id !== memberId),
          channels: s.channels.map((ch) => syncCount({ ...ch, memberIds: withoutM(ch.memberIds, memberId) })),
        }));
      },
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
      setMemberWorkspaceChannel: (memberId, channelId) => {
        const isSystemId = ['member-ac', 'member-rk', 'member-sa', 'member-tm', 'member-mk', 'member-mr', 'member-ms'].includes(memberId);
        if (!isSystemId) {
          const dbId = memberId.replace('member-', '');
          apiFetch(`${API_BASE}/api/access-requests/${dbId}`, {
            method: 'PATCH',
            body: JSON.stringify({ channelId: channelId || null }),
          })
          .then(() => {
            get().loadLocalMembers();
          })
          .catch(() => {});
        }

        set((s) => ({
          channels: s.channels.map((ch) => {
            if (!isWS(ch.id)) return ch;
            if (ch.id === 'general') return syncCount({ ...ch, memberIds: withM(ch.memberIds, memberId) });
            return syncCount({ ...ch, memberIds: ch.id === channelId ? withM(ch.memberIds, memberId) : withoutM(ch.memberIds, memberId) });
          }),
        }));
      },
      setMemberWorkspaceChannels: (memberId, channelIds) => {
        const isSystemId = ['member-ac', 'member-rk', 'member-sa', 'member-tm', 'member-mk', 'member-mr', 'member-ms'].includes(memberId);
        if (!isSystemId) {
          const dbId = memberId.replace('member-', '');
          apiFetch(`${API_BASE}/api/access-requests/${dbId}`, {
            method: 'PATCH',
            body: JSON.stringify({ channelIds }),
          })
          .then(() => { get().loadLocalMembers(); })
          .catch(() => {});
        }

        set((s) => ({
          channels: s.channels.map((ch) => {
            if (!isWS(ch.id)) return ch;
            if (ch.id === 'general') return syncCount({ ...ch, memberIds: withM(ch.memberIds, memberId) });
            return syncCount({ ...ch, memberIds: channelIds.includes(ch.id) ? withM(ch.memberIds, memberId) : withoutM(ch.memberIds, memberId) });
          }),
        }));
      },
      setMemberRole: (memberId, role) => {
        const isSystemId = ['member-ac', 'member-rk', 'member-sa', 'member-tm', 'member-mk', 'member-mr', 'member-ms'].includes(memberId);
        if (!isSystemId) {
          const dbId = memberId.replace('member-', '');
          apiFetch(`${API_BASE}/api/access-requests/${dbId}`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
          })
          .then(() => {
            get().loadLocalMembers();
          })
          .catch(() => {});
        }

        set((s) => ({
          members: s.members.map((m) => m.id === memberId ? { ...m, role } : m),
        }));
      },
    }),
    {
      name: 'edutechex-dashboard-v3',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        channels: s.channels,
        members: s.members,
        notifications: s.notifications,
        darkMode: s.darkMode,
        bookmarkedMessageIds: s.bookmarkedMessageIds,
        pinnedMessageIds: s.pinnedMessageIds,
        // kanbanTasks intentionally excluded — now fetched from backend on load
        wikiPages: s.wikiPages,
        // messages persisted so they survive refresh when backend is sleeping (Render free tier)
        messages: s.messages,
      }),
    }
  )
);
