'use client';

import React, { useState, useEffect } from 'react';
import { Users, Search, MoreHorizontal, Video, Bot, FileText, Activity } from 'lucide-react';
import MessageFeed from './MessageFeed';
import MessageInput from './MessageInput';
import { useDashboardStore } from '@/store/dashboardStore';

interface ChannelMainProps {
  onToggleAI: () => void;
  aiPanelOpen: boolean;
  onToggleNotepad: () => void;
  notepadOpen: boolean;
  onToggleActivity?: () => void;
  activityPanelOpen?: boolean;
}

function getMeetingButtonState(now = new Date()) {
  const day = now.getDay();
  const hour = now.getHours();

  if (day === 0 || day === 6) {
    return {
      label: 'No meeting',
      link: null,
      message: 'No meeting is scheduled on Saturday or Sunday.',
    };
  }

  if (day === 5) {
    return {
      label: 'Friday meet',
      link: 'https://meet.google.com/eeq-maem-ztc',
      message: 'Friday meeting link is active.',
    };
  }

  if (day === 4 && hour >= 14) {
    return {
      label: 'Thursday PM meet',
      link: 'https://meet.google.com/dss-wmvy-cuq',
      message: 'Thursday afternoon meeting link is active.',
    };
  }

  return {
    label: 'Main meet',
    link: 'https://meet.google.com/uie-jxkt-vkx',
    message: 'Main meeting link is active.',
  };
}

export default function ChannelMain({
  onToggleAI,
  aiPanelOpen,
  onToggleNotepad,
  notepadOpen,
  onToggleActivity,
  activityPanelOpen = false,
}: ChannelMainProps) {
  const { activeChannel: activeChannelId, channels, members } = useDashboardStore();
  const channel = channels.find((c) => c.id === activeChannelId) ?? channels[0];
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const meetingButtonState = getMeetingButtonState();

  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="font-semibold text-slate-900">No channel selected</p>
        </div>
      </div>
    );
  }

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200/50 px-5 bg-transparent backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-slate-900">
            <span className="text-slate-400">{channel.id.startsWith('member-') ? '@' : '#'}</span>
            {channel.name}
          </h1>
          {channel.description && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{channel.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!channel.id.startsWith('member-') && (
            <button
              onClick={() => setShowMembersModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors"
              title="Members"
            >
              <Users size={16} />
              {channel.memberCount}
            </button>
          )}

          <button className="p-2 text-slate-500 hover:bg-slate-100 transition-colors rounded-lg">
            <Search size={18} />
          </button>

          <button
            onClick={() => {
              if (meetingButtonState.link) {
                window.open(meetingButtonState.link, '_blank');
              } else {
                alert(meetingButtonState.message);
              }
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors ${
              meetingButtonState.link
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-slate-500 hover:bg-slate-600'
            }`}
            title={meetingButtonState.message}
          >
            <Video size={16} />
            {meetingButtonState.label}
          </button>

          <button
            onClick={onToggleAI}
            className={`p-2 rounded-lg transition-colors ${
              aiPanelOpen
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
            title="AI Panel"
          >
            <Bot size={18} />
          </button>

          <button
            onClick={onToggleNotepad}
            className={`p-2 rounded-lg transition-colors ${
              notepadOpen
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
            title="Notepad"
          >
            <FileText size={18} />
          </button>

          {onToggleActivity && (
            <button
              onClick={onToggleActivity}
              className={`p-2 rounded-lg transition-colors ${
                activityPanelOpen
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="Team Activity"
            >
              <Activity size={18} />
            </button>
          )}

          <button className="p-2 text-slate-500 hover:bg-slate-100 transition-colors rounded-lg">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      {/* Message Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <MessageFeed channelId={channel.id} />
        </div>
      </div>

      {/* Message Input */}
      <div className="shrink-0 border-t border-slate-200/50 bg-transparent backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-5">
          <MessageInput channelId={channel.id} channelName={channel.name} />
        </div>
      </div>

      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md max-h-[80vh] rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-white">
              <h2 className="text-lg font-bold">Channel Members</h2>
              <p className="mt-1 text-sm text-slate-300">{channel.name}</p>
            </div>

            {/* Search */}
            <div className="border-b border-slate-200 px-4 py-3">
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1">
                {filteredMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                onClick={() => setShowMembersModal(false)}
                className="w-full rounded-lg bg-slate-900 text-white py-2 font-medium hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
