'use client';

import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardTopBarProps {
  title: string;
  subtitle?: string;
  unreadNotifications?: number;
  onSearchOpen?: () => void;
  onNotificationsOpen?: () => void;
  onMobileMenuOpen?: () => void;
}

export default function DashboardTopBar({
  title,
  subtitle,
  unreadNotifications = 0,
  onSearchOpen,
  onNotificationsOpen,
  onMobileMenuOpen,
}: DashboardTopBarProps) {
  return (
    <div className="flex h-14 items-center justify-between px-5">
      <div className="flex items-center gap-2 min-w-0">
        {onMobileMenuOpen && (
          <button onClick={onMobileMenuOpen}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-[#4B5678] hover:text-[#EEF2F6] hover:bg-[rgba(148,163,184,0.08)] transition-all shrink-0">
            <Menu size={16} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-black text-[#EEF2F6] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs font-medium text-[#4B5678] truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onSearchOpen && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSearchOpen}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#4B5678] hover:text-[#8896B0] hover:bg-[rgba(148,163,184,0.06)] transition-all"
          >
            <Search size={17} />
          </motion.button>
        )}

        {onNotificationsOpen && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNotificationsOpen}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#4B5678] hover:text-[#8896B0] hover:bg-[rgba(148,163,184,0.06)] transition-all"
          >
            <Bell size={17} />
            {unreadNotifications > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-[#FF6B7F] px-1 text-[8px] font-bold text-white shadow-sm shadow-[#FF6B7F]/30"
              >
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </motion.span>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}
