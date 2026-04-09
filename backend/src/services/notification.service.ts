import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

type NotifType =
  | 'PAYMENT_REMINDER'
  | 'BUDGET_ALERT'
  | 'SUSPICIOUS_ACTIVITY'
  | 'SUBSCRIPTION_RENEWAL'
  | 'GOAL_MILESTONE'
  | 'ACCOUNT_SYNC'
  | 'GENERAL';

export const notificationService = {
  async createNotification(
    userId: string,
    data: { title: string; message: string; type: NotifType; metadata?: any; actionUrl?: string }
  ) {
    return prisma.notification.create({
      data: { userId, ...data },
    });
  },

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!env.SMTP_USER) {
      logger.info('Email service not configured, skipping:', { to, subject });
      return;
    }
    try {
      await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
    } catch (error) {
      logger.error('Failed to send email', { error, to, subject });
    }
  },

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const url = `${env.CLIENT_URL}/auth/verify-email/${token}`;
    await this.sendEmail(
      email,
      'Verify your FinTrack email',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#4F46E5">Welcome to FinTrack!</h1>
        <p>Hi ${name}, please verify your email address to get started.</p>
        <a href="${url}" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">
          Verify Email
        </a>
        <p style="color:#666;font-size:14px">Or copy: ${url}</p>
        <p style="color:#666;font-size:12px">This link expires in 24 hours.</p>
      </div>`
    );
  },

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const url = `${env.CLIENT_URL}/auth/reset-password/${token}`;
    await this.sendEmail(
      email,
      'Reset your FinTrack password',
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#4F46E5">Password Reset</h1>
        <p>Hi ${name}, click below to reset your password. This link expires in 1 hour.</p>
        <a href="${url}" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#666;font-size:14px">If you didn't request this, ignore this email.</p>
      </div>`
    );
  },

  async sendBudgetAlert(email: string, name: string, category: string, percentage: number): Promise<void> {
    await this.sendEmail(
      email,
      `Budget Alert: ${category} at ${percentage}%`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#EF4444">Budget Alert</h1>
        <p>Hi ${name}, you've used <strong>${percentage}%</strong> of your <strong>${category}</strong> budget this month.</p>
        <a href="${env.CLIENT_URL}/budgets" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">
          View Budgets
        </a>
      </div>`
    );
  },

  async sendSubscriptionReminder(
    email: string,
    name: string,
    subName: string,
    amount: number,
    billingDate: Date
  ): Promise<void> {
    await this.sendEmail(
      email,
      `Upcoming: ${subName} billing on ${billingDate.toLocaleDateString()}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#4F46E5">Subscription Reminder</h1>
        <p>Hi ${name}, your <strong>${subName}</strong> subscription of <strong>$${amount.toFixed(2)}</strong> will be charged on <strong>${billingDate.toLocaleDateString()}</strong>.</p>
        <a href="${env.CLIENT_URL}/subscriptions" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">
          Manage Subscriptions
        </a>
      </div>`
    );
  },

  // Cron: Check subscriptions due in reminder window
  async processSubscriptionReminders(): Promise<void> {
    const now = new Date();

    const subscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { user: { select: { email: true, name: true, notifyEmail: true } } },
    });

    for (const sub of subscriptions) {
      const daysUntil = Math.ceil(
        (new Date(sub.nextBillingDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil === sub.reminderDays || daysUntil === 1) {
        // Create in-app notification
        await this.createNotification(sub.userId, {
          title: `${sub.name} billing in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
          message: `$${sub.amount.toFixed(2)} will be charged on ${new Date(sub.nextBillingDate).toLocaleDateString()}`,
          type: 'SUBSCRIPTION_RENEWAL',
          metadata: { subscriptionId: sub.id, amount: sub.amount },
          actionUrl: `/subscriptions/${sub.id}`,
        });

        // Send email
        if (sub.user.notifyEmail) {
          await this.sendSubscriptionReminder(
            sub.user.email,
            sub.user.name ?? sub.user.email,
            sub.name,
            sub.amount,
            new Date(sub.nextBillingDate)
          );
        }
      }
    }
    logger.info(`Processed subscription reminders for ${subscriptions.length} subscriptions`);
  },

  // Cron: Check budgets and send alerts
  async processBudgetAlerts(): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const budgets = await prisma.budget.findMany({
      where: { month, year, alertSent: false },
      include: {
        user: { select: { id: true, email: true, name: true, notifyEmail: true } },
      },
    });

    for (const budget of budgets) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const spending = await prisma.transaction.aggregate({
        where: {
          userId: budget.userId,
          type: 'EXPENSE',
          category: budget.category,
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      });

      const spent = Math.abs(spending._sum.amount ?? 0);
      const percentage = spent / budget.amount;

      if (percentage >= budget.alertThreshold) {
        const pct = Math.round(percentage * 100);

        await this.createNotification(budget.userId, {
          title: `Budget Alert: ${budget.category}`,
          message: `You've used ${pct}% of your $${budget.amount.toFixed(0)} ${budget.category} budget.`,
          type: 'BUDGET_ALERT',
          metadata: { category: budget.category, spent, budget: budget.amount, percentage: pct },
          actionUrl: '/budgets',
        });

        if (budget.user.notifyEmail) {
          await this.sendBudgetAlert(budget.user.email, budget.user.name ?? budget.user.email, budget.category, pct);
        }

        await prisma.budget.update({ where: { id: budget.id }, data: { alertSent: true } });
      }
    }
    logger.info(`Processed budget alerts for ${budgets.length} budgets`);
  },
};
