import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { notificationService } from '../services/notification.service';

export const getBudgets = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const month = parseInt(req.query.month as string) || now.getMonth() + 1;
  const year = parseInt(req.query.year as string) || now.getFullYear();

  const budgets = await prisma.budget.findMany({
    where: { userId: req.user!.userId, month, year },
    orderBy: { category: 'asc' },
  });

  // Fetch actual spending for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const spending = await prisma.transaction.groupBy({
    by: ['category'],
    where: {
      userId: req.user!.userId,
      type: 'EXPENSE',
      date: { gte: startDate, lte: endDate },
      category: { not: null },
    },
    _sum: { amount: true },
  });

  const spendingMap: Record<string, number> = {};
  for (const s of spending) {
    if (s.category) spendingMap[s.category] = Math.abs(s._sum.amount ?? 0);
  }

  const enriched = budgets.map(b => ({
    ...b,
    spent: spendingMap[b.category] ?? 0,
    remaining: Math.max(0, b.amount - (spendingMap[b.category] ?? 0)),
    percentage: Math.min(100, Math.round(((spendingMap[b.category] ?? 0) / b.amount) * 100)),
    isOverBudget: (spendingMap[b.category] ?? 0) > b.amount,
  }));

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = Object.values(spendingMap).reduce((sum, v) => sum + v, 0);

  res.json({
    budgets: enriched,
    month,
    year,
    summary: {
      totalBudget,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalRemaining: Math.max(0, totalBudget - totalSpent),
      overallPercentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    },
  });
});

export const getBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await prisma.budget.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!budget) throw new AppError('Budget not found', 404);
  res.json({ budget });
});

export const createBudget = asyncHandler(async (req: Request, res: Response) => {
  const { category, amount, month, year, alertThreshold, color, icon, rollover } = req.body;
  const now = new Date();

  const budget = await prisma.budget.create({
    data: {
      userId: req.user!.userId,
      category,
      amount: parseFloat(amount),
      month: month ?? now.getMonth() + 1,
      year: year ?? now.getFullYear(),
      alertThreshold: alertThreshold ?? 0.8,
      color,
      icon,
      rollover: rollover ?? false,
    },
  });

  res.status(201).json({ budget });
});

export const updateBudget = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.budget.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!existing) throw new AppError('Budget not found', 404);

  const { amount, alertThreshold, color, icon, rollover } = req.body;

  const budget = await prisma.budget.update({
    where: { id: req.params.id },
    data: {
      amount: amount !== undefined ? parseFloat(amount) : undefined,
      alertThreshold,
      color,
      icon,
      rollover,
      alertSent: false, // Reset alert when budget is updated
    },
  });

  res.json({ budget });
});

export const deleteBudget = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.budget.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!existing) throw new AppError('Budget not found', 404);
  await prisma.budget.delete({ where: { id: req.params.id } });
  res.json({ message: 'Budget deleted' });
});

// Savings Goals
export const getSavingsGoals = asyncHandler(async (req: Request, res: Response) => {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
  });

  const enriched = goals.map(g => ({
    ...g,
    percentage: g.targetAmount > 0
      ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
      : 0,
    remaining: Math.max(0, g.targetAmount - g.currentAmount),
    isCompleted: g.currentAmount >= g.targetAmount,
  }));

  res.json({ goals: enriched });
});

export const createSavingsGoal = asyncHandler(async (req: Request, res: Response) => {
  const { name, targetAmount, targetDate, category, icon, color, notes } = req.body;

  const goal = await prisma.savingsGoal.create({
    data: {
      userId: req.user!.userId,
      name,
      targetAmount: parseFloat(targetAmount),
      targetDate: targetDate ? new Date(targetDate) : undefined,
      category,
      icon,
      color,
      notes,
    },
  });

  res.status(201).json({ goal });
});

export const updateSavingsGoal = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.savingsGoal.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!existing) throw new AppError('Goal not found', 404);

  const { name, targetAmount, currentAmount, targetDate, status, notes } = req.body;

  const goal = await prisma.savingsGoal.update({
    where: { id: req.params.id },
    data: {
      name,
      targetAmount: targetAmount !== undefined ? parseFloat(targetAmount) : undefined,
      currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : undefined,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      status,
      notes,
    },
  });

  // Notify on completion
  if (goal.currentAmount >= goal.targetAmount && existing.currentAmount < existing.targetAmount) {
    await notificationService.createNotification(req.user!.userId, {
      title: '🎉 Goal Achieved!',
      message: `Congratulations! You've reached your "${goal.name}" savings goal.`,
      type: 'GOAL_MILESTONE',
    });
  }

  res.json({ goal });
});

export const deleteSavingsGoal = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.savingsGoal.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!existing) throw new AppError('Goal not found', 404);
  await prisma.savingsGoal.delete({ where: { id: req.params.id } });
  res.json({ message: 'Goal deleted' });
});
