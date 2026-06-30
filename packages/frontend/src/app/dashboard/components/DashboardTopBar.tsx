'use client';

import React from 'react';
import { Search, Bell, Menu, Bot } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardTopBarProps {
  title: string;
  subtitle?: string;
  unreadNotifications?: number;
  onSearchOpen?: () => void;
  onNotificationsOpen?: () => void;
  onMobileMenuOpen?: () => void;
  onAiOpen?: () => void;
  isAvailable?: boolean;
  onAvailabilityToggle?: () => void;
}

export default function DashboardTopBar({
  title,
  subtitle,
  unreadNotifications = 0,
  onSearchOpen,
  onNotificationsOpen,
  onMobileMenuOpen,
  onAiOpen,
  isAvailable,
  onAvailabilityToggle,
}: DashboardTopBarProps) {
  return (
    <div className="flex h-14 items-center justify-between px-4 bg-white border-b border-slate-100">
      <div className="flex items-center gap-2.5 min-w-0">
        {onMobileMenuOpen && (
          <button onClick={onMobileMenuOpen}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-all shrink-0">
            <Menu size={18} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-[15px] md:text-lg font-black text-slate-800 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] font-medium text-slate-400 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Availability pill — mobile only */}
        {onAvailabilityToggle && (
          <motion.button whileTap={{ scale: 0.93 }} onClick={onAvailabilityToggle}
            className={`md:hidden flex h-7 items-center gap-1 rounded-full px-2.5 text-[10px] font-bold border transition-all ${
              isAvailable
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-600 border-red-200'
            }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {isAvailable ? 'Available' : 'Busy'}
          </motion.button>
        )}

        {/* AI Copilot — shown on mobile only (desktop uses channel sub-header button) */}
        {onAiOpen && (
          <motion.button whileTap={{ scale: 0.93 }} onClick={onAiOpen}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-all">
            <Bot size={18} />
          </motion.button>
        )}

        {onSearchOpen && (
          <motion.button whileTap={{ scale: 0.93 }} onClick={onSearchOpen}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-all">
            <Search size={17} />
          </motion.button>
        )}

        {onNotificationsOpen && (
          <motion.button whileTap={{ scale: 0.93 }} onClick={onNotificationsOpen}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-all">
            <Bell size={17} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-[#FF6B7F] px-1 text-[8px] font-black text-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}
