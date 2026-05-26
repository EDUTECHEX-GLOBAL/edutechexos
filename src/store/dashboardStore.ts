import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MESSAGES_BY_CHANNEL, CHANNELS } from '@/data/mockData';

type MessageAttachment = {
  name: string;
  url: string;
  type: string;
};

type Message = {
  id: string;
  sender: string;
  initials: string;
  color: string;
  timestamp: string;
  text: string;
  audioUrl?: string;
  videoUrl?: string;
  files?: MessageAttachment[];
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

type DashboardState = {
  activeChannel: string;
  setActiveChannel: (id: string) => void;
  messages: Record<string, Message[]>;
  addMessage: (channelId: string, message: Message) => void;
  deleteMessage: (channelId: string, messageId: string) => void;
  loadLocalMessages: () => Promise<void>;
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

const isDirectMessageChannel = (channelId: string) => channelId.startsWith('member-');
const isWorkspaceChannel = (channelId: string) => !isDirectMessageChannel(channelId);
const isExtraWorkspaceChannel = (channelId: string) =>
  isWorkspaceChannel(channelId) && channelId !== 'general';

const withMember = (memberIds: string[] = [], memberId: string) =>
  memberIds.includes(memberId) ? memberIds : [...memberIds, memberId];

const withoutMember = (memberIds: string[] = [], memberId: string) =>
  memberIds.filter((id) => id !== memberId);

const syncMemberCount = (channel: Channel): Channel => ({
  ...channel,
  memberCount: channel.memberIds?.length ?? channel.memberCount,
});

const INITIAL_MEMBERS: Member[] = [
  {
    id: 'member-ac',
    initials: 'AC',
    name: 'Aditya Cherikuri',
    email: 'aditya@edutechex.in',
    role: 'Manager',
    status: 'online',
    color: '#2563eb',
  },
  {
    id: 'member-rk',
    initials: 'RK',
    name: 'Ram K Aluru',
    email: 'dev.rk@edutechex.in',
    role: 'Developer',
    status: 'online',
    color: '#7c3aed',
  },
  {
    id: 'member-sa',
    initials: 'SA',
    name: 'Sneha Agarwal',
    email: 'design.sa@edutechex.in',
    role: 'Designer',
    status: 'away',
    color: '#0891b2',
  },
  {
    id: 'member-tm',
    initials: 'TM',
    name: 'Tarun Mehta',
    email: 'tarun@edutechex.in',
    role: 'Lead',
    status: 'offline',
    color: '#059669',
  },
  {
    id: 'member-mohan1',
    initials: 'MK',
    name: 'Mohan Kumar',
    email: 'mohan.kumar@edutechex.in',
    role: 'Developer',
    status: 'online',
    color: '#dc2626',
  },
  {
    id: 'member-mohan2',
    initials: 'MR',
    name: 'Mohan Reddy',
    email: 'mohan.reddy@edutechex.in',
    role: 'Developer',
    status: 'online',
    color: '#eab308',
  },
  {
    id: 'member-mohan3',
    initials: 'MS',
    name: 'Mohan Sen',
    email: 'mohan.sen@edutechex.in',
    role: 'Developer',
    status: 'online',
    color: '#0891b2',
  },
];

const INITIAL_EXTRA_CHANNEL_BY_MEMBER: Record<string, string> = {
  'member-ac': 'edutechex',
  'member-rk': 'skillnaav',
  'member-sa': 'skillnaav',
  'member-tm': 'edutechexassessa',
  'member-mohan1': 'skillnaav',
  'member-mohan2': 'edutechexassessa',
  'member-mohan3': 'edutechex',
};

const INITIAL_CHANNELS: Channel[] = CHANNELS.map((channel) => {
  if (isDirectMessageChannel(channel.id)) {
    return syncMemberCount({ ...channel, memberIds: [channel.id] });
  }

  if (channel.id === 'general') {
    return syncMemberCount({ ...channel, memberIds: INITIAL_MEMBERS.map((member) => member.id) });
  }

  const memberIds = INITIAL_MEMBERS.filter(
    (member) => INITIAL_EXTRA_CHANNEL_BY_MEMBER[member.id] === channel.id
  ).map((member) => member.id);

  return syncMemberCount({ ...channel, memberIds });
});

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      activeChannel: 'general',
      setActiveChannel: (id) => set({ activeChannel: id }),
      messages: MESSAGES_BY_CHANNEL,
      addMessage: (channelId, message) => {
        // Save to local JSON disk database asynchronously
        import('@/app/actions/dbActions').then(({ saveLocalMessage }) => {
          saveLocalMessage(channelId, message);
        });

        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: [...(state.messages[channelId] ?? []), message],
          },
        }));
      },
      deleteMessage: (channelId, messageId) => {
        // Delete from local JSON disk database asynchronously
        import('@/app/actions/dbActions').then(({ deleteLocalMessage }) => {
          deleteLocalMessage(channelId, messageId);
        });

        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: (state.messages[channelId] ?? []).filter((m) => m.id !== messageId),
          },
        }));
      },
      loadLocalMessages: async () => {
        try {
          const { getLocalMessages } = await import('@/app/actions/dbActions');
          const messages = await getLocalMessages();
          set({ messages });
        } catch (err) {
          console.error('Failed to load local messages inside store:', err);
        }
      },
      notifications: [],
      addNotification: (notif) =>
        set((state) => ({
          notifications: [
            {
              ...notif,
              id: `notif-${Date.now()}`,
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...state.notifications,
          ],
        })),
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      dismissNotification: (id: string) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      aiSummary: {},
      setAiSummary: (channelId, summary) =>
        set((state) => ({
          aiSummary: { ...state.aiSummary, [channelId]: summary },
        })),
      channels: INITIAL_CHANNELS,
      addChannel: (channel) =>
        set((state) => {
          const memberIds =
            channel.id === 'general'
              ? state.members.map((member) => member.id)
              : isDirectMessageChannel(channel.id)
                ? (channel.memberIds ?? [channel.id])
                : [];

          const nextChannel = syncMemberCount({ ...channel, memberIds });

          return {
            channels: [...state.channels, nextChannel],
            messages: {
              ...state.messages,
              [channel.id]: state.messages[channel.id] || [],
            },
          };
        }),
      members: INITIAL_MEMBERS,
      addMember: (member) =>
        set((state) => ({
          members: [...state.members, member],
          channels: state.channels.map((channel) => {
            if (channel.id !== 'general') return channel;
            return syncMemberCount({
              ...channel,
              memberIds: withMember(channel.memberIds, member.id),
            });
          }),
          messages: {
            ...state.messages,
            [member.id]: [],
          },
        })),
      removeMember: (memberId) =>
        set((state) => ({
          members: state.members.filter((m) => m.id !== memberId),
          channels: state.channels.map((channel) =>
            syncMemberCount({ ...channel, memberIds: withoutMember(channel.memberIds, memberId) })
          ),
        })),
      addMemberToChannel: (channelId, memberId) =>
        set((state) => {
          if (channelId === 'general') {
            return {
              channels: state.channels.map((channel) =>
                channel.id === 'general'
                  ? syncMemberCount({
                      ...channel,
                      memberIds: withMember(channel.memberIds, memberId),
                    })
                  : channel
              ),
            };
          }

          if (isExtraWorkspaceChannel(channelId)) {
            return {
              channels: state.channels.map((channel) => {
                if (!isWorkspaceChannel(channel.id)) return channel;
                if (channel.id === 'general') {
                  return syncMemberCount({
                    ...channel,
                    memberIds: withMember(channel.memberIds, memberId),
                  });
                }
                return syncMemberCount({
                  ...channel,
                  memberIds:
                    channel.id === channelId
                      ? withMember(channel.memberIds, memberId)
                      : withoutMember(channel.memberIds, memberId),
                });
              }),
            };
          }

          return {
            channels: state.channels.map((channel) =>
              channel.id === channelId
                ? syncMemberCount({
                    ...channel,
                    memberIds: withMember(channel.memberIds, memberId),
                  })
                : channel
            ),
          };
        }),
      removeMemberFromChannel: (channelId, memberId) =>
        set((state) => {
          if (channelId === 'general') {
            return { channels: state.channels };
          }

          return {
            channels: state.channels.map((channel) =>
              channel.id === channelId
                ? syncMemberCount({
                    ...channel,
                    memberIds: withoutMember(channel.memberIds, memberId),
                  })
                : channel
            ),
          };
        }),
      setMemberWorkspaceChannel: (memberId, channelId) =>
        set((state) => ({
          channels: state.channels.map((channel) => {
            if (!isWorkspaceChannel(channel.id)) return channel;
            if (channel.id === 'general') {
              return syncMemberCount({
                ...channel,
                memberIds: withMember(channel.memberIds, memberId),
              });
            }

            return syncMemberCount({
              ...channel,
              memberIds:
                channel.id === channelId
                  ? withMember(channel.memberIds, memberId)
                  : withoutMember(channel.memberIds, memberId),
            });
          }),
        })),
    }),
    {
      name: 'edutechex-dashboard-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        channels: state.channels,
        members: state.members,
        notifications: state.notifications,
      }),
    }
  )
);
