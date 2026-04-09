'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search, Sun, Moon, Plus } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { reportApi } from '@/lib/api';
import { getInitials, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/subscriptions': 'Subscriptions',
  '/budgets': 'Budgets',
  '/goals': 'Savings Goals',
  '/reports': 'Reports & Analytics',
  '/accounts': 'Connected Accounts',
  '/settings': 'Settings',
  '/admin': 'Admin Panel',
};

export default function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => reportApi.notifications(true),
    refetchInterval: 60_000,
  });

  const title = Object.entries(PAGE_TITLES).find(([path]) => pathname.startsWith(path))?.[1] ?? 'FinTrack';
  const unreadCount = notifData?.unreadCount ?? 0;

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-card-hover border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-primary-600 font-medium">{unreadCount} unread</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
                {notifData?.notifications?.length > 0 ? (
                  notifData.notifications.slice(0, 8).map((n: any) => (
                    <div key={n.id} className={cn('p-4 hover:bg-gray-50 dark:hover:bg-gray-750', !n.isRead && 'bg-blue-50/50 dark:bg-blue-900/10')}>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">No notifications</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          {getInitials(user?.name ?? user?.email ?? '')}
        </div>
      </div>
    </header>
  );
}
