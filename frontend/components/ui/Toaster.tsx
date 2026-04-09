'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

const listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

export const toast = (props: Omit<Toast, 'id'>, duration = 4000) => {
  const id = String(Date.now());
  const t: Toast = { id, ...props };
  toasts = [t, ...toasts].slice(0, 5);
  listeners.forEach(l => l([...toasts]));
  setTimeout(() => {
    toasts = toasts.filter(x => x.id !== id);
    listeners.forEach(l => l([...toasts]));
  }, duration);
};

export function Toaster() {
  const [current, setCurrent] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast[]) => setCurrent(t);
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const remove = (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    listeners.forEach(l => l([...toasts]));
  };

  if (current.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {current.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-xl shadow-lg border animate-slide-in',
            t.variant === 'destructive'
              ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-100'
              : 'bg-white border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white'
          )}
        >
          {t.variant === 'destructive'
            ? <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            : <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
          }
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{t.title}</p>
            {t.description && <p className="text-xs opacity-70 mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
