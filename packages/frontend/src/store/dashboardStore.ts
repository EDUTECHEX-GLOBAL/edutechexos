import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CHANNELS } from '@/data/mockData';

// Route message API calls through the backend so Socket.IO events are emitted.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://edutechexos-backend.onrender.com'
    : 'http://localhost:10002');

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

// Guards against firing multiple redirects when several requests 401 at once.
let sessionExpiredHandled = false;

/**
 * Called when an authenticated request comes back 401 (expired/invalid token).
 * Without this, every loader silently returns and the user is left staring at
 * an empty dashboard with no idea their session ended. We clear the stale token
 * once and bounce them to login so they can sign back in.
 */
function handleSessionExpired() {
  if (sessionExpiredHandled || typeof window === 'undefined') return;
  sessionExpiredHandled = true;
  try { localStorage.removeItem('edutechex_token'); } catch { /* ignore */ }
  const onAuthPage = window.location.pathname.startsWith('/sign-up-login-screen');
  if (!onAuthPage) {
    window.location.replace('/sign-up-login-screen?mode=user&redirect=/dashboard&expired=1');
  }
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

  // Attach userEmail to query string for GET and DELETE (no body);
  // merge into body for POST/PATCH/PUT with an existing JSON body
  if (email) {
    if (method === 'GET' || (method === 'DELETE' && !options.body)) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}userEmail=${encodeURIComponent(email)}`;
    } else if (options.body && typeof options.body === 'string') {
      try {
        const parsed = JSON.parse(options.body);
        if (!parsed.userEmail) {
          parsed.userEmail = email;
          options = { ...options, body: JSON.stringify(parsed) };
        }
      } catch {
        /* not JSON — skip */
      }
    }
  }

  const res = await fetch(url, { ...options, headers });
  // A 401 on an authenticated request means the token expired — redirect to
  // login instead of letting every loader silently fail into an empty UI.
  if (res.status === 401 && token) handleSessionExpired();
  return res;
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
  siteName?: string;
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
  taskCard?: {
    assignee: string;
    assigneeInitials: string;
    assigneeColor: string;
    taskText: string;
    status: 'todo' | 'inprogress' | 'done';
  };
};

export type WikiPage = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isPrivate?: boolean;  // true = only creator can see; false = shared with channel
  createdBy?: string | null;
};

export type KanbanTask = {
  id: string;
  text: string;
  assignee: string;
  assigneeInitials: string;
  assigneeEmail?: string; // used to show the task only to the assigned person
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
  channelId?: string;
  messageId?: string;
  timestamp: string;
  read: boolean;
  recipientEmails?: string[];
  joinLink?: string;
};

export type MemberStatus = 'online' | 'away' | 'in-meeting' | 'offline';

type Member = {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: string;
  status: MemberStatus;
  color: string;
  channelIds?: string[];
  onLeave?: boolean;
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
  patchLocalMessage: (channelId: string, messageId: string, patch: Partial<Message>) => void;
  editMessage: (channelId: string, messageId: string, newText: string) => void;
  loadLocalMessages: () => Promise<void>;
  loadMoreMessages: (channelId: string) => Promise<void>;

  toggleReaction: (channelId: string, messageId: string, emoji: string, userEmail: string) => void;
  votePoll: (channelId: string, messageId: string, optionIdx: number, userEmail: string) => void;

  pinnedMessageIds: Record<string, string[]>;
  pinMessage: (channelId: string, messageId: string) => void;
  unpinMessage: (channelId: string, messageId: string) => void;
  applyPinFromSocket: (channelId: string, messageId: string) => void;
  applyUnpinFromSocket: (channelId: string, messageId: string) => void;
  loadPinnedMessages: () => Promise<void>;

  bookmarkedMessageIds: string[];
  toggleBookmark: (
    messageId: string,
    message?: { channelId?: string; text?: string; sender?: string; timestamp?: string }
  ) => void;
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
  addWikiPage: (channelId: string, data: { title: string; content: string; isPrivate?: boolean }) => void;
  updateWikiPage: (
    channelId: string,
    pageId: string,
    data: Partial<Pick<WikiPage, 'title' | 'content' | 'isPrivate'>>
  ) => void;
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
  createWorkspaceChannel: (name: string, description?: string) => Promise<{ ok: boolean; id?: string; error?: string }>;
  loadWorkspaceChannels: () => Promise<void>;

  members: Member[];
  loadLocalMembers: () => Promise<void>;
  addMember: (member: Member) => void;
  removeMember: (memberId: string) => void;
  removeMemberLocally: (memberId: string) => void;
  addMemberToChannel: (channelId: string, memberId: string) => void;
  removeMemberFromChannel: (channelId: string, memberId: string) => void;
  setMemberWorkspaceChannel: (memberId: string, channelId: string | null) => void;
  setMemberWorkspaceChannels: (memberId: string, channelIds: string[], onError?: (msg: string) => void) => void;
  setMemberRole: (memberId: string, role: string) => void;
  updateMemberStatus: (email: string, status: MemberStatus) => void;
  updateMemberName: (email: string, name: string) => void;
  updateMemberLeaveStatus: (email: string, onLeave: boolean) => void;

  unreadCounts: Record<string, number>;
  incrementUnread: (channelId: string) => void;
  clearUnread: (channelId: string) => void;
  clearAllUnread: () => void;
  resetUserState: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isDM = (id: string) => id.startsWith('member-');
const isWS = (id: string) => !isDM(id);
const isExtraWS = (id: string) => isWS(id) && id !== 'general';
const withM = (ids: string[] = [], id: string) => (ids.includes(id) ? ids : [...ids, id]);
const withoutM = (ids: string[] = [], id: string) => ids.filter((x) => x !== id);
const syncCount = (ch: Channel): Channel => ({
  ...ch,
  memberCount: ch.memberIds?.length ?? ch.memberCount,
});

const INITIAL_MEMBERS: Member[] = [];

const EXTRA_CH: Record<string, string> = {};

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
        })
          .then(async (res) => {
            if (!res.ok) {
              const m = message as { files?: unknown[]; videoUrl?: string; audioUrl?: string };
              const hasMedia = m.files?.length || m.videoUrl || m.audioUrl;
              if (hasMedia) {
                let why = `server error ${res.status}`;
                try {
                  const body = await res.clone().json();
                  if (body?.error) why = body.error;
                } catch { /* non-JSON body */ }
                if (res.status === 413) why = 'file too large — set up Cloudinary in Vercel settings';
                import('sonner').then(({ toast }) => toast.error(`Media failed: ${why}`)).catch(() => {});
              }
            }
          })
          .catch(() => {
            /* backend unreachable — message kept locally, will not reach others */
          });

        set((s) => ({
          messages: { ...s.messages, [channelId]: [...(s.messages[channelId] ?? []), message] },
        }));
      },

      // Called by the Socket.IO listener — updates state WITHOUT hitting the API.
      // Deduplicates using both `id` and `clientId`. When the server echo arrives for
      // an optimistic message, REPLACE the local copy with the server-confirmed version
      // so the message carries the real MongoDB _id (bookmarks, edits, etc. need it).
      addMessageFromSocket: (channelId, message) => {
        set((s) => {
          const existing = s.messages[channelId] ?? [];
          const incomingClientId = (message as Message & { clientId?: string }).clientId;

          let replaced = false;
          const updated = existing.map((m) => {
            if (m.id === message.id) { replaced = true; return message; }
            if (incomingClientId && m.id === incomingClientId) { replaced = true; return message; }
            return m;
          });

          if (replaced) {
            return { messages: { ...s.messages, [channelId]: updated } };
          }

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
        }).catch(() => {
          /* backend unavailable — optimistic soft-delete applied */
        });

        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    isDeleted: true,
                    text: '',
                    audioUrl: undefined,
                    videoUrl: undefined,
                    files: undefined,
                    poll: undefined,
                    reactions: undefined,
                  }
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
                ? {
                    ...m,
                    isDeleted: true,
                    text: '',
                    audioUrl: undefined,
                    videoUrl: undefined,
                    files: undefined,
                    poll: undefined,
                    reactions: undefined,
                  }
                : m
            ),
          },
        }));
      },

      patchLocalMessage: (channelId, messageId, patch) => {
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) =>
              m.id === messageId ? { ...m, ...patch } : m
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
        }).catch(() => {
          /* backend unavailable */
        });

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
        } catch {
          /* backend unavailable — keep current state */
        }
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
              [channelId]: [...older, ...(s.messages[channelId] ?? [])],
            },
            hasMoreMessages: { ...s.hasMoreMessages, [channelId]: data.hasMore },
            isLoadingMore: { ...s.isLoadingMore, [channelId]: false },
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
        }).catch(() => {
          /* backend unavailable */
        });

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
            return {
              ...opt,
              votes: hasVote ? opt.votes.filter((v) => v !== userEmail) : [...opt.votes, userEmail],
            };
          return { ...opt, votes: opt.votes.filter((v) => v !== userEmail) };
        });
        const poll = { ...current.poll, options };

        // Persist to backend — also triggers `message_updated` broadcast
        apiFetch(`${API_BASE}/api/messages/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poll }),
        }).catch(() => {
          /* backend unavailable */
        });

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
      applyPinFromSocket: (channelId, messageId) => {
        set((s) => ({
          pinnedMessageIds: {
            ...s.pinnedMessageIds,
            [channelId]: [...new Set([...(s.pinnedMessageIds[channelId] ?? []), messageId])],
          },
        }));
      },
      applyUnpinFromSocket: (channelId, messageId) => {
        set((s) => ({
          pinnedMessageIds: {
            ...s.pinnedMessageIds,
            [channelId]: (s.pinnedMessageIds[channelId] ?? []).filter((id) => id !== messageId),
          },
        }));
      },
      loadPinnedMessages: async () => {
        try {
          const res = await apiFetch(`${API_BASE}/api/pinned`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.success && data.pinnedMessageIds) {
            set({ pinnedMessageIds: data.pinnedMessageIds });
          }
        } catch {
          /* backend unavailable — keep local state */
        }
      },

      bookmarkedMessageIds: [],
      toggleBookmark: (
        messageId,
        message?: { channelId?: string; text?: string; sender?: string; timestamp?: string }
      ) => {
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
          if (!res.ok) return;
          const data = await res.json();
          if (data.success && data.bookmarks) {
            set({ bookmarkedMessageIds: data.bookmarks.map((b: any) => b.messageId) });
          }
        } catch {
          /* backend unavailable — keep local state */
        }
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
              [channelId]: isTyping
                ? [...new Set([...cur, userName])]
                : cur.filter((n) => n !== userName),
            },
          };
        }),

      darkMode: false,
      toggleDarkMode: () =>
        set((s) => {
          const next = !s.darkMode;
          if (typeof document !== 'undefined')
            document.documentElement.classList.toggle('dark', next);
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
        } catch {
          /* backend unavailable */
        }
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
          .catch(() => {
            /* backend unavailable — task is saved locally */
          });
      },

      updateKanbanTaskStatus: (taskId, status) => {
        set((s) => ({
          kanbanTasks: s.kanbanTasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
        }));
        apiFetch(`${API_BASE}/api/kanban/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }).catch(() => {
          /* backend unavailable */
        });
      },

      deleteKanbanTask: (taskId) => {
        set((s) => ({ kanbanTasks: s.kanbanTasks.filter((t) => t.id !== taskId) }));
        apiFetch(`${API_BASE}/api/kanban/${taskId}`, {
          method: 'DELETE',
        }).catch(() => {
          /* backend unavailable */
        });
      },

      wikiPages: {},
      addWikiPage: (channelId, data) => {
        const tempId = `wiki-${Date.now()}`;
        const page: WikiPage = {
          id: tempId,
          ...data,
          isPrivate: data.isPrivate !== false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          wikiPages: { ...s.wikiPages, [channelId]: [...(s.wikiPages[channelId] ?? []), page] },
        }));

        apiFetch(`${API_BASE}/api/wikipages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tempId, channelId, title: data.title, content: data.content, isPrivate: data.isPrivate !== false }),
        })
          .then((res) => res.json())
          .then((res) => {
            if (res.success && res.page) {
              set((s) => ({
                wikiPages: {
                  ...s.wikiPages,
                  [channelId]: (s.wikiPages[channelId] ?? []).map((p) =>
                    p.id === tempId ? res.page : p
                  ) as WikiPage[],
                },
              }));
            }
          })
          .catch(() => {
            /* backend unavailable */
          });
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
          apiFetch(`${API_BASE}/api/wikipages/${pageId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channelId,
              title: currentPage.title,
              content: currentPage.content,
              isPrivate: currentPage.isPrivate !== false,
            }),
          }).catch(() => {
            /* backend unavailable */
          });
        }
      },
      deleteWikiPage: (channelId, pageId) => {
        apiFetch(`${API_BASE}/api/wikipages/${pageId}`, {
          method: 'DELETE',
        }).catch(() => {
          /* backend unavailable */
        });

        set((s) => ({
          wikiPages: {
            ...s.wikiPages,
            [channelId]: (s.wikiPages[channelId] ?? []).filter((p) => p.id !== pageId),
          },
        }));
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
        } catch {
          /* backend unavailable — keep current wiki state */
        }
      },

      notifications: [],
      addNotification: (notif) => {
        const localId = `notif-${Date.now()}`;
        const newNotif = {
          ...notif,
          id: localId,
          timestamp: new Date().toISOString(),
          read: false,
        };
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
              .map((n) => ({ ...n, read: false }) as Notification);
            if (!incoming.length) return s;
            return { notifications: [...incoming, ...s.notifications] };
          });
        } catch {
          /* backend unavailable */
        }
      },
      markAllNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      dismissNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

      aiSummary: {},
      setAiSummary: (channelId, summary) =>
        set((s) => ({ aiSummary: { ...s.aiSummary, [channelId]: summary } })),

      channels: INITIAL_CHANNELS,
      addChannel: (channel) =>
        set((s) => {
          const memberIds =
            channel.id === 'general'
              ? s.members.map((m) => m.id)
              : isDM(channel.id)
                ? (channel.memberIds ?? [channel.id])
                : [];
          const next = syncCount({ ...channel, memberIds });
          return {
            channels: [...s.channels, next],
            messages: { ...s.messages, [channel.id]: s.messages[channel.id] || [] },
          };
        }),
      // Persist a new channel to the backend so it survives logout/login.
      // (addChannel alone only mutates local state — the channel vanishes on the
      //  next loadWorkspaceChannels, which replaces local channels with the DB list.)
      createWorkspaceChannel: async (name, description) => {
        try {
          const res = await apiFetch(`${API_BASE}/api/channels`, {
            method: 'POST',
            body: JSON.stringify({ name, description: description ?? '' }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.success || !data.channel) {
            return { ok: false, error: data.error || `Failed to create channel (${res.status}).` };
          }
          const ch = data.channel as Channel;
          set((s) => {
            if (s.channels.some((c) => c.id === ch.id)) return s; // already added via socket echo
            // Include all current members so the creator (admin) sees it immediately;
            // loadLocalMembers will later reconcile exact per-member access.
            const next = syncCount({ ...ch, memberIds: s.members.map((m) => m.id) });
            return {
              channels: [...s.channels, next],
              messages: { ...s.messages, [ch.id]: s.messages[ch.id] || [] },
            };
          });
          return { ok: true, id: ch.id };
        } catch {
          return { ok: false, error: 'Network error — could not create channel.' };
        }
      },
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
              syncCount({
                ...ch,
                memberIds:
                  existingMemberIds[ch.id] ??
                  (ch.id === 'general' ? s.members.map((m) => m.id) : []),
              })
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
        } catch {
          /* backend unavailable — keep hardcoded channels */
        }
      },

      members: INITIAL_MEMBERS,
      loadLocalMembers: async () => {
        try {
          const res = await apiFetch(`${API_BASE}/api/members`);
          if (!res.ok) {
            // 401 = token expired or not logged in yet; 5xx = backend waking up
            const retryDelay = res.status === 401 ? 5_000 : 10_000;
            console.warn(
              `[members] /api/members returned ${res.status} — retrying in ${retryDelay / 1000}s…`
            );
            setTimeout(() => useDashboardStore.getState().loadLocalMembers?.(), retryDelay);
            return;
          }
          const data = await res.json();
          if (!data.success || !data.members) return;

          const dbMembers: Member[] = data.members;
          set((s) => {
            // Build per-channel member lists honouring each member's channelIds assignment.
            // Admins/Managers get access to every channel; regular members only get the
            // channels an admin has explicitly assigned to them (+ #general for everyone).
            const allMemberIds = dbMembers.map((m) => m.id);
            const privilegedIds = new Set(
              dbMembers
                .filter((m) => m.role === 'Admin' || m.role === 'Manager')
                .map((m) => m.id)
            );
            const newChannels = s.channels.map((ch) => {
              if (!isWS(ch.id)) return ch;
              if (ch.id === 'general') {
                // Everyone is in #general
                return syncCount({ ...ch, memberIds: allMemberIds });
              }
              // For extra channels: admins/managers + members whose channelIds includes this channel
              const assigned = dbMembers
                .filter((m) => {
                  if (privilegedIds.has(m.id)) return true;
                  return (m.channelIds ?? []).includes(ch.id);
                })
                .map((m) => m.id);
              return syncCount({ ...ch, memberIds: assigned });
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
                ...Object.fromEntries(
                  dmChannelsToAdd.map((ch) => [ch.id, s.messages[ch.id] ?? []])
                ),
              },
            };
          });
        } catch (err) {
          console.warn(
            '[members] Backend unreachable — Render may be cold-starting. Retrying in 15s…',
            err
          );
          setTimeout(() => useDashboardStore.getState().loadLocalMembers?.(), 15_000);
        }
      },
      addMember: (member) => {
        const isSystem = [
          'admin@edutechex.in',
        ].includes(member.email.toLowerCase());
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
          members: s.members.some((m) => m.email.toLowerCase() === member.email.toLowerCase())
            ? s.members
            : [...s.members, member],
          channels: s.channels.map((ch) =>
            ch.id !== 'general'
              ? ch
              : syncCount({ ...ch, memberIds: withM(ch.memberIds, member.id) })
          ),
          messages: { ...s.messages, [member.id]: [] },
        }));
      },
      removeMember: (memberId) => {
        // Just update local state — callers are responsible for the backend DELETE.
        // (Previously this fired its own apiFetch DELETE and then called
        // loadLocalMembers() unconditionally in .then(), which restored the user
        // from the DB whenever the DELETE failed or raced with other requests.)
        set((s) => ({
          members: s.members.filter((m) => m.id !== memberId),
          channels: s.channels.map((ch) =>
            syncCount({ ...ch, memberIds: withoutM(ch.memberIds, memberId) })
          ),
        }));
      },
      // Only removes from local state — used by socket handlers to avoid re-calling the DELETE API
      removeMemberLocally: (memberId) => {
        set((s) => ({
          members: s.members.filter((m) => m.id !== memberId),
          channels: s.channels.map((ch) =>
            syncCount({ ...ch, memberIds: withoutM(ch.memberIds, memberId) })
          ),
        }));
      },
      addMemberToChannel: (channelId, memberId) =>
        set((s) => {
          if (channelId === 'general') {
            return {
              channels: s.channels.map((ch) =>
                ch.id === 'general'
                  ? syncCount({ ...ch, memberIds: withM(ch.memberIds, memberId) })
                  : ch
              ),
            };
          }
          if (isExtraWS(channelId)) {
            return {
              channels: s.channels.map((ch) => {
                if (!isWS(ch.id)) return ch;
                if (ch.id === 'general')
                  return syncCount({ ...ch, memberIds: withM(ch.memberIds, memberId) });
                return syncCount({
                  ...ch,
                  memberIds:
                    ch.id === channelId
                      ? withM(ch.memberIds, memberId)
                      : withoutM(ch.memberIds, memberId),
                });
              }),
            };
          }
          return {
            channels: s.channels.map((ch) =>
              ch.id === channelId
                ? syncCount({ ...ch, memberIds: withM(ch.memberIds, memberId) })
                : ch
            ),
          };
        }),
      removeMemberFromChannel: (channelId, memberId) =>
        set((s) => {
          if (channelId === 'general') return { channels: s.channels };
          return {
            channels: s.channels.map((ch) =>
              ch.id === channelId
                ? syncCount({ ...ch, memberIds: withoutM(ch.memberIds, memberId) })
                : ch
            ),
          };
        }),
      setMemberWorkspaceChannel: (memberId, channelId) => {
        const isSystemId = [
          'member-ac',
          'member-rk',
          'member-sa',
          'member-tm',
          'member-mk',
          'member-mr',
          'member-ms',
        ].includes(memberId);
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
            if (ch.id === 'general')
              return syncCount({ ...ch, memberIds: withM(ch.memberIds, memberId) });
            return syncCount({
              ...ch,
              memberIds:
                ch.id === channelId
                  ? withM(ch.memberIds, memberId)
                  : withoutM(ch.memberIds, memberId),
            });
          }),
        }));
      },
      setMemberWorkspaceChannels: (memberId, channelIds, onError) => {
        const isSystemId = [
          'member-ac',
          'member-rk',
          'member-sa',
          'member-tm',
          'member-mk',
          'member-mr',
          'member-ms',
        ].includes(memberId);
        if (!isSystemId) {
          const dbId = memberId.replace('member-', '');
          apiFetch(`${API_BASE}/api/access-requests/${dbId}`, {
            method: 'PATCH',
            body: JSON.stringify({ channelIds }),
          })
            .then((res) => {
              if (!res.ok) {
                onError?.(`Channel save failed (${res.status}). Changes reverted.`);
              }
              get().loadLocalMembers();
            })
            .catch(() => {
              onError?.('Could not reach the server. Changes reverted.');
              get().loadLocalMembers();
            });
        }

        set((s) => ({
          channels: s.channels.map((ch) => {
            if (!isWS(ch.id)) return ch;
            if (ch.id === 'general')
              return syncCount({ ...ch, memberIds: withM(ch.memberIds, memberId) });
            return syncCount({
              ...ch,
              memberIds: channelIds.includes(ch.id)
                ? withM(ch.memberIds, memberId)
                : withoutM(ch.memberIds, memberId),
            });
          }),
        }));
      },
      setMemberRole: (memberId, role) => {
        const isSystemId = [
          'member-ac',
          'member-rk',
          'member-sa',
          'member-tm',
          'member-mk',
          'member-mr',
          'member-ms',
        ].includes(memberId);
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
          members: s.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
        }));
      },

      updateMemberStatus: (email, status) => {
        set((s) => ({
          members: s.members.map((m) =>
            m.email.toLowerCase() === email.toLowerCase() ? { ...m, status } : m
          ),
        }));
      },

      updateMemberName: (email, name) => {
        set((s) => ({
          members: s.members.map((m) =>
            m.email.toLowerCase() === email.toLowerCase() ? { ...m, name } : m
          ),
        }));
      },

      updateMemberLeaveStatus: (email, onLeave) => {
        set((s) => ({
          members: s.members.map((m) =>
            m.email.toLowerCase() === email.toLowerCase() ? { ...m, onLeave } : m
          ),
        }));
      },

      unreadCounts: {},
      incrementUnread: (channelId) => {
        set((s) => ({
          unreadCounts: {
            ...s.unreadCounts,
            [channelId]: (s.unreadCounts[channelId] ?? 0) + 1,
          },
        }));
      },
      clearUnread: (channelId) => {
        set((s) => {
          if (!s.unreadCounts[channelId]) return s;
          const next = { ...s.unreadCounts };
          delete next[channelId];
          return { unreadCounts: next };
        });
      },
      clearAllUnread: () => set({ unreadCounts: {} }),
      resetUserState: () => {
        // Clear all per-user in-memory state when a user logs out so the
        // next user who logs in on the same device starts completely clean.
        set({
          unreadCounts: {},
          notifications: [],
          kanbanTasks: [],
          aiSummary: {},
        });
      },
    }),
    {
      name: 'edutechex-dashboard-v3',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        channels: s.channels,
        members: s.members,
        darkMode: s.darkMode,
        // kanbanTasks intentionally excluded — now fetched from backend on load
        wikiPages: s.wikiPages,
        // messages persisted so they survive refresh when backend is sleeping (Render free tier)
        messages: s.messages,
        // NOTE: pinnedMessageIds, bookmarkedMessageIds, notifications are NOT persisted —
        // they are user-specific and loaded from backend on login. Persisting them would
        // leak one user's data to the next user who logs in on the same device.
      }),
    }
  )
);
