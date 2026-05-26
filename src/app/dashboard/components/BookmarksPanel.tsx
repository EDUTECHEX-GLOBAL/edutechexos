'use client';

import React, { useMemo } from 'react';
import {
  X,
  Bookmark,
  Hash,
  ArrowRight,
} from 'lucide-react';
import { useDashboardStore, Message } from '@/store/dashboardStore';

interface BookmarksPanelProps {
  onClose: () => void;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

type BookmarkedItem = {
  message: Message;
  channelId: string;
  channelName: string;
};

export default function BookmarksPanel({ onClose }: BookmarksPanelProps) {
  const messages = useDashboardStore((s) => s.messages);
  const channels = useDashboardStore((s) => s.channels);
  const bookmarkedMessageIds = useDashboardStore(
    (s) => s.bookmarkedMessageIds
  );
  const toggleBookmark = useDashboardStore((s) => s.toggleBookmark);
  const setActiveChannel = useDashboardStore((s) => s.setActiveChannel);

  // Build a lookup of all messages across channels
  const { bookmarkedItems, grouped } = useMemo(() => {
    const channelNameMap: Record<string, string> = {};
    channels.forEach((ch) => {
      channelNameMap[ch.id] = ch.name;
    });

    // Flat list of bookmarked items
    const items: BookmarkedItem[] = [];
    bookmarkedMessageIds.forEach((msgId) => {
      for (const [channelId, msgs] of Object.entries(messages)) {
        const msg = msgs.find((m) => m.id === msgId);
        if (msg) {
          items.push({
            message: msg,
            channelId,
            channelName: channelNameMap[channelId] ?? channelId,
          });
          break;
        }
      }
    });

    // Sort most recent first
    items.sort(
      (a, b) =>
        new Date(b.message.timestamp).getTime() -
        new Date(a.message.timestamp).getTime()
    );

    // Group by channel
    const groupedMap: Record<
      string,
      { channelName: string; items: BookmarkedItem[] }
    > = {};
    items.forEach((item) => {
      if (!groupedMap[item.channelId]) {
        groupedMap[item.channelId] = {
          channelName: item.channelName,
          items: [],
        };
      }
      groupedMap[item.channelId].items.push(item);
    });

    return { bookmarkedItems: items, grouped: groupedMap };
  }, [bookmarkedMessageIds, messages, channels]);

  const handleGoToChannel = (channelId: string) => {
    setActiveChannel(channelId);
    onClose();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-none bg-white">
      {/* Header */}
      <div
        className="flex h-14 shrink-0 items-center justify-between px-4"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/20">
            <Bookmark
              size={16}
              className="text-indigo-300"
              strokeWidth={2.5}
            />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
              Pinned for later
            </p>
            <p className="text-sm font-black leading-none text-white">
              Saved Messages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {bookmarkedItems.length > 0 && (
            <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-[11px] font-black text-indigo-300">
              {bookmarkedItems.length} saved
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            title="Close"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {bookmarkedItems.length === 0 ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Bookmark
                size={28}
                className="text-slate-300"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">
                No saved messages yet
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Bookmark any message to find it here later. Click the bookmark
                icon on any message to save it.
              </p>
            </div>
          </div>
        ) : (
          /* Grouped by channel */
          <div className="divide-y divide-slate-100">
            {Object.entries(grouped).map(([channelId, group]) => (
              <div key={channelId}>
                {/* Channel group header */}
                <div className="flex items-center gap-2 bg-slate-50 px-5 py-2.5 border-b border-slate-100">
                  <Hash
                    size={12}
                    className="shrink-0 text-indigo-500"
                    strokeWidth={2.5}
                  />
                  <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">
                    {group.channelName}
                  </span>
                  <span className="ml-auto text-[10px] font-semibold text-slate-400">
                    {group.items.length} saved
                  </span>
                  <button
                    type="button"
                    onClick={() => handleGoToChannel(channelId)}
                    className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-600 transition-colors hover:bg-indigo-100"
                  >
                    Go to channel
                    <ArrowRight size={10} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Messages in group */}
                {group.items.map((item) => {
                  const isBookmarked = bookmarkedMessageIds.includes(
                    item.message.id
                  );
                  return (
                    <div
                      key={item.message.id}
                      className="group flex items-start gap-3 border-b border-slate-50 px-5 py-3.5 transition-colors hover:bg-slate-50"
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: item.message.color ?? '#4f46e5',
                      }}
                    >
                      {/* Avatar */}
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                        style={{
                          backgroundColor: item.message.color ?? '#4f46e5',
                        }}
                      >
                        {item.message.initials}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-slate-800">
                            {item.message.sender}
                          </span>
                          <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                            <Hash size={9} strokeWidth={2.5} />
                            {item.channelName}
                          </span>
                          <span className="ml-auto text-[10px] text-slate-400">
                            {formatTime(item.message.timestamp)}
                          </span>
                        </div>
                        <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">
                          {item.message.text}
                        </p>

                        {/* Actions row */}
                        <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => handleGoToChannel(channelId)}
                            className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100"
                          >
                            <ArrowRight size={10} strokeWidth={2.5} />
                            Go to channel
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBookmark(item.message.id)}
                            className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600 transition-colors hover:bg-amber-100"
                            title={
                              isBookmarked
                                ? 'Remove bookmark'
                                : 'Add bookmark'
                            }
                          >
                            <Bookmark
                              size={10}
                              strokeWidth={2.5}
                              fill={isBookmarked ? 'currentColor' : 'none'}
                            />
                            {isBookmarked ? 'Remove' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
