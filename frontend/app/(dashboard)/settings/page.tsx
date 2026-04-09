'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { authApi, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from 'next-themes';
import { toast } from '@/components/ui/Toaster';
import { Loader2, User, Bell, Lock, Moon, Sun, Monitor } from 'lucide-react';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');

  const profileForm = useForm({
    defaultValues: {
      name: user?.name ?? '',
      currency: user?.currency ?? 'USD',
      timezone: user?.timezone ?? 'UTC',
    },
  });

  const passwordForm = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const updateProfile = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      setUser(data.user);
      toast({ title: 'Profile updated' });
    },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const changePassword = useMutation({
    mutationFn: (data: any) => authApi.changePassword(data),
    onSuccess: () => {
      passwordForm.reset();
      toast({ title: 'Password changed. Please log in again.' });
    },
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const updateNotifications = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => { setUser(data.user); toast({ title: 'Notifications updated' }); },
  });

  const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'INR', 'PHP'];
  const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Manila', 'Australia/Sydney'];

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
  ] as const;

  return (
    <div className="max-w-2xl">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h2>
            <form onSubmit={profileForm.handleSubmit(d => updateProfile.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input {...profileForm.register('name')} className="input-field" placeholder="Your name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                  <select {...profileForm.register('currency')} className="input-field">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                  <select {...profileForm.register('timezone')} className="input-field">
                    {TIMEZONES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={updateProfile.isPending} className="btn-primary flex items-center gap-2">
                {updateProfile.isPending && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
            </form>
          </div>

          {/* Theme */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                    theme === value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Notification Preferences</h2>
          {[
            { key: 'notifyEmail', label: 'Email Notifications', description: 'Receive budget alerts, subscription reminders, and weekly reports via email' },
            { key: 'notifyPush', label: 'Push Notifications', description: 'Receive real-time alerts on your mobile device' },
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
              </div>
              <button
                role="switch"
                aria-checked={user?.[key as keyof typeof user] as boolean}
                onClick={() => updateNotifications.mutate({ [key]: !user?.[key as keyof typeof user] })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                  user?.[key as keyof typeof user] ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  user?.[key as keyof typeof user] ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
            <form onSubmit={passwordForm.handleSubmit(d => {
              if (d.newPassword !== d.confirmPassword) {
                toast({ title: 'Passwords do not match', variant: 'destructive' });
                return;
              }
              changePassword.mutate({ currentPassword: d.currentPassword, newPassword: d.newPassword });
            })} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                <input {...passwordForm.register('currentPassword')} type="password" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <input {...passwordForm.register('newPassword')} type="password" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                <input {...passwordForm.register('confirmPassword')} type="password" className="input-field" />
              </div>
              <button type="submit" disabled={changePassword.isPending} className="btn-primary flex items-center gap-2">
                {changePassword.isPending && <Loader2 size={14} className="animate-spin" />}
                Update Password
              </button>
            </form>
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Two-Factor Authentication</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add an extra layer of security to your account using Google Authenticator or similar TOTP apps.</p>
            <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 ${user?.mfaEnabled ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
              <span className="text-xl">{user?.mfaEnabled ? '🔒' : '⚠️'}</span>
              <p className="text-sm font-medium">{user?.mfaEnabled ? '2FA is enabled' : '2FA is not enabled'}</p>
            </div>
            <button className={user?.mfaEnabled ? 'btn-secondary' : 'btn-primary'}>
              {user?.mfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>

          <div className="card p-6 border border-red-100 dark:border-red-900/30">
            <h2 className="text-base font-semibold text-red-600 mb-1">Danger Zone</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
            <button
              onClick={() => {
                if (confirm('This will permanently delete your account. Are you absolutely sure?')) {
                  toast({ title: 'Account deletion requested', description: 'Contact support to complete deletion.', variant: 'destructive' });
                }
              }}
              className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
