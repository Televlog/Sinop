import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { notificationService } from '../services/notification.service';

export const getSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;
  const where: any = { userId: req.user!.userId };
  if (status) where.status = status;

  const subscriptions = await prisma.subscription.findMany({
    where,
    orderBy: { nextBillingDate: 'asc' },
  });

  const now = new Date();
  const monthlyTotal = subscriptions
    .filter(s => s.status === 'ACTIVE')
    .reduce((sum, s) => {
      switch (s.billingCycle) {
        case 'DAILY': return sum + s.amount * 30;
        case 'WEEKLY': return sum + s.amount * 4.33;
        case 'BIWEEKLY': return sum + s.amount * 2.17;
        case 'MONTHLY': return sum + s.amount;
        case 'QUARTERLY': return sum + s.amount / 3;
        case 'SEMIANNUAL': return sum + s.amount / 6;
        case 'YEARLY': return sum + s.amount / 12;
        default: return sum + s.amount;
      }
    }, 0);

  const upcomingIn7Days = subscriptions.filter(s => {
    const diff = (new Date(s.nextBillingDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return s.status === 'ACTIVE' && diff >= 0 && diff <= 7;
  });

  res.json({
    subscriptions,
    summary: {
      total: subscriptions.filter(s => s.status === 'ACTIVE').length,
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      yearlyTotal: Math.round(monthlyTotal * 12 * 100) / 100,
      upcomingIn7Days: upcomingIn7Days.length,
    },
  });
});

export const getSubscription = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await prisma.subscription.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!subscription) throw new AppError('Subscription not found', 404);
  res.json({ subscription });
});

export const createSubscription = asyncHandler(async (req: Request, res: Response) => {
  const {
    name, amount, billingCycle, nextBillingDate, category,
    logoUrl, color, url, notes, reminderDays, startDate,
  } = req.body;

  const subscription = await prisma.subscription.create({
    data: {
      userId: req.user!.userId,
      name,
      amount: parseFloat(amount),
      billingCycle,
      nextBillingDate: new Date(nextBillingDate),
      startDate: startDate ? new Date(startDate) : undefined,
      category,
      logoUrl,
      color,
      url,
      notes,
      reminderDays: reminderDays ?? 3,
    },
  });

  res.status(201).json({ subscription });
});

export const updateSubscription = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.subscription.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!existing) throw new AppError('Subscription not found', 404);

  const {
    name, amount, billingCycle, nextBillingDate, category,
    logoUrl, color, url, notes, reminderDays, status,
  } = req.body;

  const subscription = await prisma.subscription.update({
    where: { id: req.params.id },
    data: {
      name,
      amount: amount !== undefined ? parseFloat(amount) : undefined,
      billingCycle,
      nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : undefined,
      category,
      logoUrl,
      color,
      url,
      notes,
      reminderDays,
      status,
      cancelledAt: status === 'CANCELLED' ? new Date() : undefined,
    },
  });

  res.json({ subscription });
});

export const deleteSubscription = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.subscription.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!existing) throw new AppError('Subscription not found', 404);
  await prisma.subscription.delete({ where: { id: req.params.id } });
  res.json({ message: 'Subscription deleted' });
});

export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { cancellationUrl } = req.body;
  const existing = await prisma.subscription.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!existing) throw new AppError('Subscription not found', 404);

  const subscription = await prisma.subscription.update({
    where: { id: req.params.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationUrl,
    },
  });

  res.json({ subscription, message: 'Subscription marked as cancelled' });
});

export const getUpcomingBillings = asyncHandler(async (req: Request, res: Response) => {
  const { days = '30' } = req.query;
  const daysAhead = parseInt(days as string);
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const upcoming = await prisma.subscription.findMany({
    where: {
      userId: req.user!.userId,
      status: 'ACTIVE',
      nextBillingDate: { gte: now, lte: futureDate },
    },
    orderBy: { nextBillingDate: 'asc' },
  });

  const total = upcoming.reduce((sum, s) => sum + s.amount, 0);

  res.json({ upcoming, total: Math.round(total * 100) / 100, days: daysAhead });
});

export const detectSubscriptionsFromTransactions = asyncHandler(async (req: Request, res: Response) => {
  // Look at last 90 days of transactions for recurring patterns
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.user!.userId,
      type: 'EXPENSE',
      date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { date: 'desc' },
  });

  // Group by merchant/description
  const grouped: Record<string, typeof transactions> = {};
  for (const t of transactions) {
    const key = (t.merchant ?? t.description).toLowerCase().trim();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  const detected = [];
  for (const [key, txns] of Object.entries(grouped)) {
    if (txns.length >= 2) {
      const amounts = txns.map(t => Math.abs(t.amount));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const isConsistentAmount = amounts.every(a => Math.abs(a - avgAmount) < avgAmount * 0.05);

      if (isConsistentAmount) {
        detected.push({
          name: key,
          amount: Math.round(avgAmount * 100) / 100,
          occurrences: txns.length,
          lastDate: txns[0].date,
          transactionIds: txns.map(t => t.id),
        });
      }
    }
  }

  res.json({ detected });
});
