'use client';

import React, { useMemo } from 'react';
import { X, Bookmark, Hash, ArrowRight, Clock, Star } from 'lucide-react';
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
  } catch { return ''; }
}

type BookmarkedItem = {
  message: Message;
  channelId: string;
  channelName: string;
};

export default function BookmarksPanel({ onClose }: BookmarksPanelProps) {
  const messages = useDashboardStore(s => s.messages);
  const channels = useDashboardStore(s => s.channels);
  const bookmarkedMessageIds = useDashboardStore(s => s.bookmarkedMessageIds);
  const toggleBookmark = useDashboardStore(s => s.toggleBookmark);
  const setActiveChannel = useDashboardStore(s => s.setActiveChannel);

  const { bookmarkedItems, grouped } = useMemo(() => {
    const nameMap: Record<string, string> = {};
    channels.forEach(ch => { nameMap[ch.id] = ch.name; });

    const items: BookmarkedItem[] = [];
    bookmarkedMessageIds.forEach(msgId => {
      for (const [channelId, msgs] of Object.entries(messages)) {
        const msg = msgs.find(m => m.id === msgId);
        if (msg) { items.push({ message: msg, channelId, channelName: nameMap[channelId] ?? channelId }); break; }
      }
    });

    items.sort((a, b) => new Date(b.message.timestamp).getTime() - new Date(a.message.timestamp).getTime());

    const groupedMap: Record<string, { channelName: string; items: BookmarkedItem[] }> = {};
    items.forEach(item => {
      if (!groupedMap[item.channelId]) groupedMap[item.channelId] = { channelName: item.channelName, items: [] };
      groupedMap[item.channelId].items.push(item);
    });

    return { bookmarkedItems: items, grouped: groupedMap };
  }, [bookmarkedMessageIds, messages, channels]);

  const handleGoToChannel = (channelId: string) => { setActiveChannel(channelId); onClose(); };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ background: '#F4F5FA' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#191E2F 0%,#1E2538 100%)',
        padding: '0 20px', height: 60, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        borderBottom: '1px solid rgba(251,191,36,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: 'linear-gradient(145deg,#3d2500,#92400e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(251,191,36,0.35)',
          }}>
            <Bookmark size={17} style={{ color: '#fbbf24' }} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Pinned for later</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1.15 }}>Saved Messages</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {bookmarkedItems.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#fbbf24',
              background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.28)',
              borderRadius: 20, padding: '3px 10px',
            }}>
              {bookmarkedItems.length} saved
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {bookmarkedItems.length === 0 ? (
          /* Empty state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 18, padding: '32px 28px', textAlign: 'center' }}>
            <div style={{
              width: 76, height: 76, borderRadius: 22,
              background: 'linear-gradient(145deg,#3d2500,#92400e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 32px rgba(251,191,36,0.25)',
            }}>
              <Bookmark size={32} style={{ color: '#fbbf24' }} strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#1E2636', marginBottom: 8 }}>Nothing saved yet</p>
              <p style={{ fontSize: 13, color: '#7C859E', lineHeight: 1.65, maxWidth: 240 }}>
                Hover over any message and click the <Star size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> bookmark icon to pin it here for later.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 22 }}>
            {Object.entries(grouped).map(([channelId, group]) => (
              <div key={channelId}>
                {/* Channel group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 20, padding: '4px 11px',
                  }}>
                    <Hash size={10} style={{ color: '#6366f1' }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1', letterSpacing: '0.04em' }}>{group.channelName}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>· {group.items.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGoToChannel(channelId)}
                    style={{
                      marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 700, color: '#6366f1',
                      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
                      borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                    }}
                  >
                    Go <ArrowRight size={10} />
                  </button>
                </div>

                {/* Message cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(item => {
                    const isBookmarked = bookmarkedMessageIds.includes(item.message.id);
                    const accent = item.message.color ?? '#3E4A89';
                    return (
                      <div
                        key={item.message.id}
                        style={{
                          background: 'white',
                          borderRadius: 13,
                          padding: '13px 14px',
                          boxShadow: '0 1px 5px rgba(0,0,0,0.06)',
                          border: '1px solid rgba(0,0,0,0.05)',
                          borderLeft: `4px solid ${accent}`,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {/* subtle glow behind card */}
                        <div style={{ position: 'absolute', top: -12, right: -12, width: 50, height: 50, background: `${accent}18`, borderRadius: '50%', filter: 'blur(14px)', pointerEvents: 'none' }} />

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          {/* Avatar */}
                          <span style={{
                            width: 34, height: 34, borderRadius: '50%', background: accent,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0,
                            boxShadow: `0 2px 8px ${accent}44`,
                          }}>
                            {item.message.initials}
                          </span>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#1E2636' }}>{item.message.sender}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#9CA3AF' }}>
                                <Clock size={9} /> {formatTime(item.message.timestamp)}
                              </span>
                            </div>
                            <p style={{
                              fontSize: 13, color: '#4A5578', lineHeight: 1.55,
                              display: '-webkit-box', WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>
                              {item.message.text}
                            </p>

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}>
                              <button
                                type="button"
                                onClick={() => handleGoToChannel(channelId)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 11, fontWeight: 700, color: '#6366f1',
                                  background: 'rgba(99,102,241,0.08)', border: 'none',
                                  borderRadius: 6, padding: '4px 9px', cursor: 'pointer',
                                }}
                              >
                                <ArrowRight size={10} /> Jump to message
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleBookmark(item.message.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 11, fontWeight: 700, color: '#f59e0b',
                                  background: 'rgba(245,158,11,0.1)', border: 'none',
                                  borderRadius: 6, padding: '4px 9px', cursor: 'pointer',
                                }}
                              >
                                <Bookmark size={10} fill={isBookmarked ? 'currentColor' : 'none'} />
                                {isBookmarked ? 'Remove' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
