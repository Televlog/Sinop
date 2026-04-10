'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_COLORS: Record<string, string> = {
  PAYMENT_REMINDER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  BUDGET_ALERT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SUBSCRIPTION_RENEWAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  GOAL_MILESTONE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  GENERAL: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ notifications: any[] }>({
    queryKey: ['notifications'],
    queryFn: () => reportApi.notifications(),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => reportApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications: any[] = data?.notifications ?? [];
  const unread = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={48} />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No notifications yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Budget alerts and reminders will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: any) => (
            <div key={n.id} className={cn('card p-4 flex gap-4 items-start', !n.isRead && 'border-l-4 border-primary-500')}>
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold', TYPE_COLORS[n.type] ?? TYPE_COLORS.GENERAL)}>
                <Bell size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-semibold text-gray-900 dark:text-white', !n.isRead && 'font-bold')}>{n.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatRelativeTime(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markRead.mutate(n.id)}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  title="Mark as read"
                >
                  <Check size={16} />
                </button>
              )}
              {n.isRead && <CheckCheck size={16} className="flex-shrink-0 text-gray-300 dark:text-gray-600 mt-1" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
