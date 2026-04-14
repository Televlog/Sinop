import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { aiService } from '../services/ai.service';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

export const getMonthlyReport = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const month = parseInt(req.query.month as string) || now.getMonth() + 1;
  const year = parseInt(req.query.year as string) || now.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Previous month for comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59);

  const [currentTxns, prevTxns, budgets, subscriptions] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: req.user!.userId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'desc' },
    }),
    prisma.transaction.findMany({
      where: { userId: req.user!.userId, date: { gte: prevStart, lte: prevEnd } },
    }),
    prisma.budget.findMany({ where: { userId: req.user!.userId, month, year } }),
    prisma.subscription.findMany({ where: { userId: req.user!.userId, status: 'ACTIVE' } }),
  ]);

  const income = currentTxns.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expenses = currentTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Math.abs(t.amount), 0);
  const prevIncome = prevTxns.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Math.abs(t.amount), 0);

  const categoryBreakdown: Record<string, number> = {};
  for (const t of currentTxns.filter(tx => tx.type === 'EXPENSE')) {
    const cat = t.category ?? 'Uncategorized';
    categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + Math.abs(t.amount);
  }

  const dailySpending: Record<string, number> = {};
  for (const t of currentTxns.filter(tx => tx.type === 'EXPENSE')) {
    const day = t.date.toISOString().split('T')[0];
    dailySpending[day] = (dailySpending[day] ?? 0) + Math.abs(t.amount);
  }

  const subMonthlyCost = subscriptions.reduce((sum, s) => {
    switch (s.billingCycle) {
      case 'YEARLY': return sum + s.amount / 12;
      case 'QUARTERLY': return sum + s.amount / 3;
      default: return sum + s.amount;
    }
  }, 0);

  res.json({
    period: { month, year },
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    netSavings: Math.round((income - expenses) * 100) / 100,
    savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 1000) / 10 : 0,
    comparison: {
      incomeChange: prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 1000) / 10 : 0,
      expensesChange: prevExpenses > 0 ? Math.round(((expenses - prevExpenses) / prevExpenses) * 1000) / 10 : 0,
    },
    categoryBreakdown: Object.entries(categoryBreakdown)
      .map(([cat, amt]) => ({ category: cat, amount: Math.round(amt * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount),
    dailySpending: Object.entries(dailySpending)
      .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    budgets: budgets.map(b => ({
      category: b.category,
      budget: b.amount,
      spent: categoryBreakdown[b.category] ?? 0,
      remaining: Math.max(0, b.amount - (categoryBreakdown[b.category] ?? 0)),
    })),
    subscriptions: {
      count: subscriptions.length,
      monthlyCost: Math.round(subMonthlyCost * 100) / 100,
    },
    transactionCount: currentTxns.length,
  });
});

export const getSpendingTrends = asyncHandler(async (req: Request, res: Response) => {
  const months = parseInt(req.query.months as string) || 6;
  const now = new Date();

  const data = [];
  for (let i = months - 1; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = targetDate.getMonth() + 1;
    const y = targetDate.getFullYear();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: req.user!.userId, type: 'INCOME', date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId: req.user!.userId, type: 'EXPENSE', date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
    ]);

    data.push({
      month: m,
      year: y,
      label: targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      income: Math.round((incomeAgg._sum.amount ?? 0) * 100) / 100,
      expenses: Math.round(Math.abs(expenseAgg._sum.amount ?? 0) * 100) / 100,
    });
  }

  res.json({ trends: data });
});

export const getAIInsights = asyncHandler(async (req: Request, res: Response) => {
  const insights = await prisma.aIInsight.findMany({
    where: { userId: req.user!.userId, isRead: false },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  res.json({ insights });
});

export const generateAIInsights = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const [transactions, subscriptions, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: startDate } },
      orderBy: { date: 'desc' },
    }),
    prisma.subscription.findMany({ where: { userId, status: 'ACTIVE' } }),
    prisma.budget.findMany({ where: { userId, month: now.getMonth() + 1, year: now.getFullYear() } }),
  ]);

  const insights = await aiService.generateInsights({ userId, transactions, subscriptions, budgets });

  // Save insights
  const created = await prisma.aIInsight.createMany({
    data: insights.map(i => ({ ...i, userId })),
  });

  res.json({ message: `Generated ${created.count} new insights`, insights });
});

export const exportPDF = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const month = parseInt(req.query.month as string) || now.getMonth() + 1;
  const year = parseInt(req.query.year as string) || now.getFullYear();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true, email: true } }),
    prisma.transaction.findMany({
      where: { userId: req.user!.userId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'desc' },
    }),
  ]);

  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Math.abs(t.amount), 0);

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=sinop-report-${year}-${month}.pdf`);
  doc.pipe(res);

  // Header
  doc.fontSize(24).font('Helvetica-Bold').text('Sinop App', { align: 'center' });
  doc.fontSize(14).font('Helvetica').text(`Monthly Report — ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, { align: 'center' });
  doc.moveDown();
  doc.text(`Generated for: ${user?.name ?? user?.email}`, { align: 'center' });
  doc.moveDown(2);

  // Summary
  doc.fontSize(16).font('Helvetica-Bold').text('Summary');
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica');
  doc.text(`Total Income: $${income.toFixed(2)}`);
  doc.text(`Total Expenses: $${expenses.toFixed(2)}`);
  doc.text(`Net Savings: $${(income - expenses).toFixed(2)}`);
  doc.moveDown(2);

  // Transactions
  doc.fontSize(16).font('Helvetica-Bold').text('Transactions');
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');

  for (const t of transactions.slice(0, 50)) {
    doc.text(
      `${t.date.toLocaleDateString()} | ${t.description.substring(0, 30).padEnd(30)} | ${t.category ?? 'N/A'} | $${Math.abs(t.amount).toFixed(2)}`,
      { continued: false }
    );
  }

  doc.end();
});

export const exportExcel = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const month = parseInt(req.query.month as string) || now.getMonth() + 1;
  const year = parseInt(req.query.year as string) || now.getFullYear();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user!.userId, date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'desc' },
    include: { account: { select: { accountName: true } } },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sinop App';

  const sheet = workbook.addWorksheet('Transactions');
  sheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Description', key: 'description', width: 35 },
    { header: 'Merchant', key: 'merchant', width: 25 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Account', key: 'account', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  // Style header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  for (const t of transactions) {
    sheet.addRow({
      date: t.date.toLocaleDateString(),
      description: t.description,
      merchant: t.merchant ?? '',
      category: t.category ?? '',
      type: t.type,
      amount: t.type === 'EXPENSE' ? -Math.abs(t.amount) : t.amount,
      account: t.account?.accountName ?? 'Manual',
      notes: t.notes ?? '',
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=sinop-${year}-${month}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
});

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { unreadOnly } = req.query;
  const where: any = { userId: req.user!.userId };
  if (unreadOnly === 'true') where.isRead = false;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: req.user!.userId, isRead: false },
  });

  res.json({ notifications, unreadCount });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (id === 'all') {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId },
      data: { isRead: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { id, userId: req.user!.userId },
      data: { isRead: true },
    });
  }
  res.json({ message: 'Marked as read' });
});
