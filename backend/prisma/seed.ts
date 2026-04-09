import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fintrack.app' },
    update: {},
    create: {
      email: 'admin@fintrack.app',
      name: 'Admin User',
      passwordHash: adminHash,
      role: 'ADMIN',
      isVerified: true,
      currency: 'USD',
    },
  });

  // Demo user
  const userHash = await bcrypt.hash('Demo123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@fintrack.app' },
    update: {},
    create: {
      email: 'demo@fintrack.app',
      name: 'Alex Johnson',
      passwordHash: userHash,
      role: 'USER',
      isVerified: true,
      currency: 'USD',
    },
  });

  // Demo manual bank account
  const account = await prisma.account.upsert({
    where: { plaidAccountId: 'demo-checking-001' },
    update: {},
    create: {
      userId: user.id,
      plaidAccountId: 'demo-checking-001',
      institutionName: 'Demo Bank',
      accountName: 'Checking Account',
      accountMask: '4242',
      accountType: 'CHECKING',
      balance: 8450.00,
      isManual: true,
    },
  });

  // Demo transactions
  const transactions = [
    { description: 'Salary Deposit', amount: 5500, type: 'INCOME', category: 'Income', date: new Date('2026-04-01') },
    { description: 'Whole Foods Market', amount: -124.50, type: 'EXPENSE', category: 'Groceries', date: new Date('2026-04-02'), merchant: 'Whole Foods' },
    { description: 'Netflix Subscription', amount: -15.99, type: 'EXPENSE', category: 'Subscriptions', date: new Date('2026-04-03'), merchant: 'Netflix', isRecurring: true },
    { description: 'Chipotle Mexican Grill', amount: -18.50, type: 'EXPENSE', category: 'Food & Dining', date: new Date('2026-04-03'), merchant: 'Chipotle' },
    { description: 'Uber', amount: -24.00, type: 'EXPENSE', category: 'Transportation', date: new Date('2026-04-04'), merchant: 'Uber' },
    { description: 'Spotify Premium', amount: -9.99, type: 'EXPENSE', category: 'Subscriptions', date: new Date('2026-04-05'), merchant: 'Spotify', isRecurring: true },
    { description: 'Amazon Purchase', amount: -67.23, type: 'EXPENSE', category: 'Shopping', date: new Date('2026-04-06'), merchant: 'Amazon' },
    { description: 'Electric Bill', amount: -89.00, type: 'EXPENSE', category: 'Utilities', date: new Date('2026-04-07'), merchant: 'Pacific Gas & Electric', isRecurring: true },
    { description: 'Gym Membership', amount: -45.00, type: 'EXPENSE', category: 'Fitness', date: new Date('2026-04-07'), isRecurring: true },
    { description: 'Freelance Payment', amount: 850, type: 'INCOME', category: 'Income', date: new Date('2026-04-08') },
    { description: 'CVS Pharmacy', amount: -32.15, type: 'EXPENSE', category: 'Healthcare', date: new Date('2026-04-08'), merchant: 'CVS' },
    { description: 'Starbucks', amount: -6.75, type: 'EXPENSE', category: 'Food & Dining', date: new Date('2026-04-08'), merchant: 'Starbucks' },
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        description: tx.description,
        amount: tx.amount,
        type: tx.type as any,
        category: tx.category,
        date: tx.date,
        merchant: tx.merchant ?? undefined,
        isRecurring: tx.isRecurring ?? false,
        currency: 'USD',
      },
    });
  }

  // Demo subscriptions
  const subs = [
    { name: 'Netflix', amount: 15.99, billingCycle: 'MONTHLY', nextBillingDate: new Date('2026-05-03'), category: 'Entertainment', color: '#ef4444' },
    { name: 'Spotify', amount: 9.99, billingCycle: 'MONTHLY', nextBillingDate: new Date('2026-05-05'), category: 'Music', color: '#1db954' },
    { name: 'Adobe Creative Cloud', amount: 54.99, billingCycle: 'MONTHLY', nextBillingDate: new Date('2026-04-15'), category: 'Productivity', color: '#ff0000' },
    { name: 'iCloud Storage', amount: 2.99, billingCycle: 'MONTHLY', nextBillingDate: new Date('2026-04-20'), category: 'Cloud Storage', color: '#007aff' },
    { name: 'Amazon Prime', amount: 139, billingCycle: 'YEARLY', nextBillingDate: new Date('2027-01-01'), category: 'Shopping', color: '#ff9900' },
    { name: 'Planet Fitness', amount: 25.00, billingCycle: 'MONTHLY', nextBillingDate: new Date('2026-04-17'), category: 'Fitness', color: '#7c3aed' },
  ];

  for (const sub of subs) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        name: sub.name,
        amount: sub.amount,
        billingCycle: sub.billingCycle as any,
        nextBillingDate: sub.nextBillingDate,
        category: sub.category,
        color: sub.color,
        status: 'ACTIVE',
        reminderDays: 3,
      },
    });
  }

  // Demo budgets for current month
  const now = new Date();
  const budgetCategories = [
    { category: 'Groceries', amount: 400 },
    { category: 'Food & Dining', amount: 300 },
    { category: 'Transportation', amount: 200 },
    { category: 'Entertainment', amount: 100 },
    { category: 'Shopping', amount: 250 },
    { category: 'Utilities', amount: 150 },
    { category: 'Fitness', amount: 60 },
  ];

  for (const b of budgetCategories) {
    await prisma.budget.create({
      data: {
        userId: user.id,
        category: b.category,
        amount: b.amount,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        alertThreshold: 0.8,
      },
    });
  }

  // Demo savings goal
  await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: 'Emergency Fund',
      targetAmount: 10000,
      currentAmount: 3500,
      targetDate: new Date('2026-12-31'),
      category: 'Emergency',
    },
  });

  // Demo AI insights
  await prisma.aIInsight.create({
    data: {
      userId: user.id,
      type: 'SUBSCRIPTION_WASTE',
      title: 'Review Your Subscriptions',
      description: 'You\'re spending $154/month on 6 active subscriptions. Consider cancelling any you don\'t use regularly.',
      severity: 'INFO',
    },
  });

  console.log(`✅ Seeded successfully!`);
  console.log(`   Admin: admin@fintrack.app / Admin123!`);
  console.log(`   Demo:  demo@fintrack.app  / Demo123!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
