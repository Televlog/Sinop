import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const [
    totalUsers,
    activeUsers,
    totalTransactions,
    totalSubscriptions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    prisma.transaction.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
  ]);

  // Growth - new users this week
  const newUsersThisWeek = await prisma.user.count({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.json({
    stats: {
      totalUsers,
      activeUsers,
      totalTransactions,
      totalSubscriptions,
      newUsersThisWeek,
    },
    recentUsers,
  });
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', search, role } = req.query;
  const take = Math.min(parseInt(limit as string), 100);
  const skip = (parseInt(page as string) - 1) * take;

  const where: any = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { email: { contains: search as string } },
    ];
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true,
        isVerified: true, mfaEnabled: true, createdAt: true,
        _count: { select: { transactions: true, subscriptions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ users, pagination: { page: parseInt(page as string), limit: take, total, pages: Math.ceil(total / take) } });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      _count: { select: { transactions: true, subscriptions: true, budgets: true } },
      accounts: { select: { id: true, institutionName: true, accountName: true, balance: true } },
    },
  });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  const { passwordHash, mfaSecret, resetToken, verifyToken, ...safeUser } = user as any;
  res.json({ user: safeUser });
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, email: true, role: true },
  });
  res.json({ user });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: 'User deleted' });
});

export const getAdminTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', userId } = req.query;
  const take = Math.min(parseInt(limit as string), 100);
  const skip = (parseInt(page as string) - 1) * take;

  const where: any = {};
  if (userId) where.userId = userId;

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        account: { select: { accountName: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    transactions,
    pagination: { page: parseInt(page as string), limit: take, total, pages: Math.ceil(total / take) },
  });
});

export const getPlatformAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const months = 6;
  const data = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const [newUsers, newTransactions] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.transaction.count({ where: { createdAt: { gte: start, lte: end } } }),
    ]);

    data.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      newUsers,
      newTransactions,
    });
  }

  res.json({ analytics: data });
});
