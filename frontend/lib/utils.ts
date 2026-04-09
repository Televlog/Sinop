import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  compact: boolean = false
): string {
  if (compact && Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, fmt: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str;
}

export function classifyAmount(amount: number, type: string): string {
  if (type === 'INCOME') return 'text-green-600 dark:text-green-400';
  if (type === 'EXPENSE') return 'text-red-600 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-400';
}

export function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function calculateBillingFrequencyMonthly(billingCycle: string, amount: number): number {
  const factors: Record<string, number> = {
    DAILY: 30,
    WEEKLY: 4.33,
    BIWEEKLY: 2.17,
    MONTHLY: 1,
    QUARTERLY: 1 / 3,
    SEMIANNUAL: 1 / 6,
    YEARLY: 1 / 12,
  };
  return amount * (factors[billingCycle] ?? 1);
}

export function percentageColor(pct: number): string {
  if (pct >= 100) return 'text-red-600';
  if (pct >= 80) return 'text-yellow-600';
  return 'text-green-600';
}

export function progressColor(pct: number): string {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-yellow-500';
  return 'bg-indigo-500';
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    CRITICAL: 'text-red-600 bg-red-50 border-red-200',
    WARNING: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    INFO: 'text-blue-700 bg-blue-50 border-blue-200',
    POSITIVE: 'text-green-700 bg-green-50 border-green-200',
  };
  return map[severity] ?? map.INFO;
}

export function exportBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}
