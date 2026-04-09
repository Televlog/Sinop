export interface User {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  currency: string;
  timezone: string;
  mfaEnabled: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string | null;
  amount: number;
  currency: string;
  description: string;
  merchant: string | null;
  merchantLogo: string | null;
  category: string | null;
  subcategory: string | null;
  date: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  isRecurring: boolean;
  receiptUrl: string | null;
  notes: string | null;
  tags: string[];
  isPending: boolean;
  account?: { accountName: string; institutionName: string } | null;
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  institutionName: string;
  accountName: string;
  accountMask: string | null;
  accountType: string;
  balance: number;
  availableBalance: number | null;
  currency: string;
  isManual: boolean;
  lastSynced: string | null;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'YEARLY';
  nextBillingDate: string;
  category: string | null;
  logoUrl: string | null;
  color: string | null;
  url: string | null;
  status: 'ACTIVE' | 'CANCELLED' | 'PAUSED' | 'TRIAL';
  cancelledAt: string | null;
  notes: string | null;
  reminderDays: number;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  month: number;
  year: number;
  alertThreshold: number;
  color: string | null;
  icon: string | null;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remaining: number;
  percentage: number;
  isCompleted: boolean;
  targetDate: string | null;
  category: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  data: any;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'POSITIVE';
  createdAt: string;
}

export interface MonthlySummary {
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  byCategory: { category: string; amount: number; percentage: number }[];
}

export interface SpendingTrend {
  month: number;
  year: number;
  label: string;
  income: number;
  expenses: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#f59e0b',
  'Groceries': '#10b981',
  'Transportation': '#3b82f6',
  'Entertainment': '#8b5cf6',
  'Shopping': '#ec4899',
  'Healthcare': '#ef4444',
  'Utilities': '#6b7280',
  'Housing': '#0ea5e9',
  'Travel': '#f97316',
  'Education': '#84cc16',
  'Subscriptions': '#6366f1',
  'Personal Care': '#d946ef',
  'Fitness': '#14b8a6',
  'Investments': '#22c55e',
  'Other': '#94a3b8',
};

export const CATEGORY_ICONS: Record<string, string> = {
  'Food & Dining': '🍽️',
  'Groceries': '🛒',
  'Transportation': '🚗',
  'Entertainment': '🎬',
  'Shopping': '🛍️',
  'Healthcare': '💊',
  'Utilities': '💡',
  'Housing': '🏠',
  'Travel': '✈️',
  'Education': '📚',
  'Subscriptions': '📱',
  'Personal Care': '💄',
  'Fitness': '💪',
  'Investments': '📈',
  'Other': '💰',
};
