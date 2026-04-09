import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { aiService } from '../services/ai.service';
import { ocrService } from '../services/ocr.service';

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '20',
    category,
    type,
    startDate,
    endDate,
    search,
    accountId,
    isRecurring,
    sortBy = 'date',
    sortOrder = 'desc',
  } = req.query;

  const take = Math.min(parseInt(limit as string), 100);
  const skip = (parseInt(page as string) - 1) * take;

  const where: any = { userId: req.user!.userId };
  if (category) where.category = category;
  if (type) where.type = type;
  if (accountId) where.accountId = accountId;
  if (isRecurring !== undefined) where.isRecurring = isRecurring === 'true';
  if (search) {
    where.OR = [
      { description: { contains: search as string } },
      { merchant: { contains: search as string } },
      { notes: { contains: search as string } },
    ];
  }
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate as string);
    if (endDate) where.date.lte = new Date(endDate as string);
  }

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy as string]: sortOrder },
      include: { account: { select: { accountName: true, institutionName: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    transactions,
    pagination: {
      page: parseInt(page as string),
      limit: take,
      total,
      pages: Math.ceil(total / take),
    },
  });
});

export const getTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: { account: true },
  });
  if (!transaction) throw new AppError('Transaction not found', 404);
  res.json({ transaction });
});

export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  const {
    amount, description, merchant, category, date, type,
    accountId, notes, tags, isRecurring, paymentMethod,
  } = req.body;

  let finalCategory = category;
  let confidence: number | undefined;

  if (!category && description) {
    const result = await aiService.categorizeTransaction(description, merchant, amount);
    finalCategory = result.category;
    confidence = result.confidence;
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: req.user!.userId,
      accountId,
      amount: parseFloat(amount),
      description,
      merchant,
      category: finalCategory,
      date: new Date(date),
      type,
      notes,
      tags: JSON.stringify(tags ?? []),
      isRecurring: isRecurring ?? false,
      paymentMethod,
      aiCategorizationConfidence: confidence,
    },
  });

  // Update budget spent amount
  if (type === 'EXPENSE' && finalCategory) {
    const now = new Date(date);
    await prisma.budget.updateMany({
      where: {
        userId: req.user!.userId,
        category: finalCategory,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      data: { spent: { increment: Math.abs(amount) } },
    });
  }

  res.status(201).json({ transaction });
});

export const updateTransaction = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!existing) throw new AppError('Transaction not found', 404);

  const {
    amount, description, merchant, category, date, type,
    notes, tags, isRecurring, paymentMethod,
  } = req.body;

  const transaction = await prisma.transaction.update({
    where: { id: req.params.id },
    data: {
      amount: amount !== undefined ? parseFloat(amount) : undefined,
      description,
      merchant,
      category,
      date: date ? new Date(date) : undefined,
      type,
      notes,
      tags,
      isRecurring,
      paymentMethod,
    },
  });

  res.json({ transaction });
});

export const deleteTransaction = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!existing) throw new AppError('Transaction not found', 404);
  await prisma.transaction.delete({ where: { id: req.params.id } });
  res.json({ message: 'Transaction deleted' });
});

export const uploadReceipt = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('No file uploaded', 400);

  const transaction = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!transaction) throw new AppError('Transaction not found', 404);

  const { text, amount, merchant, date } = await ocrService.extractReceiptData(req.file.buffer);

  const receiptUrl = `/uploads/receipts/${req.file.filename}`;

  await prisma.transaction.update({
    where: { id: req.params.id },
    data: {
      receiptUrl,
      receiptText: text,
      ...(merchant && !transaction.merchant && { merchant }),
    },
  });

  res.json({ receiptUrl, extracted: { text, amount, merchant, date } });
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await prisma.transaction.groupBy({
    by: ['category'],
    where: { userId: req.user!.userId, category: { not: null } },
    _count: { category: true },
    _sum: { amount: true },
    orderBy: { _count: { category: 'desc' } },
  });

  res.json({ categories: categories.map(c => ({
    name: c.category,
    count: c._count.category,
    total: c._sum.amount,
  }))});
});

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = parseInt(month as string) || now.getMonth() + 1;
  const y = parseInt(year as string) || now.getFullYear();

  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59);

  const [income, expenses, byCategory] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: req.user!.userId, type: 'INCOME', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: req.user!.userId, type: 'EXPENSE', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId: req.user!.userId,
        type: 'EXPENSE',
        date: { gte: startDate, lte: endDate },
        category: { not: null },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ]);

  const totalIncome = income._sum.amount ?? 0;
  const totalExpenses = Math.abs(expenses._sum.amount ?? 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  res.json({
    month: m,
    year: y,
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate: Math.round(savingsRate * 10) / 10,
    byCategory: byCategory.map(c => ({
      category: c.category,
      amount: Math.abs(c._sum.amount ?? 0),
      percentage: totalExpenses > 0
        ? Math.round((Math.abs(c._sum.amount ?? 0) / totalExpenses) * 1000) / 10
        : 0,
    })),
  });
});

export const detectRecurring = asyncHandler(async (req: Request, res: Response) => {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.user!.userId,
      type: 'EXPENSE',
      date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { date: 'desc' },
  });

  const detected = await aiService.detectRecurringTransactions(transactions);
  res.json({ recurring: detected });
});
