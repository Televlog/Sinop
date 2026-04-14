'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, RefreshCcw, PiggyBank,
  BarChart3, Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  CreditCard, Target, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Subscriptions', href: '/subscriptions', icon: RefreshCcw },
  { label: 'Budgets', href: '/budgets', icon: PiggyBank },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Accounts', href: '/accounts', icon: CreditCard },
];

const bottomNav = [
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700',
        'transition-all duration-300 ease-in-out z-50',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-gray-100 dark:border-gray-700', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">F</div>
        {!collapsed && <span className="text-lg font-bold text-gray-900 dark:text-white">Sinop App</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {nav.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  collapsed ? 'justify-center' : '',
                  active
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {user?.role === 'ADMIN' && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                collapsed ? 'justify-center' : '',
                isActive('/admin')
                  ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
              title={collapsed ? 'Admin' : undefined}
            >
              <Shield size={18} className="flex-shrink-0" />
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="py-4 px-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
        {bottomNav.map(item => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                collapsed ? 'justify-center' : '',
                isActive(item.href)
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-colors',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full p-1 shadow-sm hover:shadow transition-shadow"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
