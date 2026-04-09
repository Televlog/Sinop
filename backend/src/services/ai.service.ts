import OpenAI from 'openai';
import { env } from '../config/env';
import { logger } from '../config/logger';

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

const CATEGORIES = [
  'Food & Dining', 'Groceries', 'Transportation', 'Entertainment',
  'Shopping', 'Healthcare', 'Utilities', 'Housing', 'Travel',
  'Education', 'Personal Care', 'Insurance', 'Investments',
  'Subscriptions', 'Fitness', 'Gifts & Donations', 'Business',
  'ATM & Cash', 'Fees & Charges', 'Other',
];

// Simple rule-based categorization as fallback
const CATEGORY_RULES: Record<string, string[]> = {
  'Food & Dining': ['restaurant', 'cafe', 'pizza', 'burger', 'sushi', 'starbucks', 'mcdonalds', 'dining'],
  'Groceries': ['walmart', 'target', 'kroger', 'safeway', 'whole foods', 'trader joe', 'grocery', 'supermarket'],
  'Transportation': ['uber', 'lyft', 'transit', 'parking', 'fuel', 'gas', 'toll', 'taxi', 'grab'],
  'Entertainment': ['netflix', 'spotify', 'cinema', 'movie', 'concert', 'theater', 'hulu', 'disney'],
  'Shopping': ['amazon', 'ebay', 'etsy', 'shopify', 'clothing', 'fashion', 'mall'],
  'Healthcare': ['pharmacy', 'doctor', 'hospital', 'medical', 'dental', 'vision', 'cvs', 'walgreens'],
  'Utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'cable', 'utility'],
  'Housing': ['rent', 'mortgage', 'property', 'lease', 'maintenance'],
  'Travel': ['airline', 'hotel', 'airbnb', 'booking', 'expedia', 'flight'],
  'Subscriptions': ['subscription', 'membership', 'monthly', 'annual plan'],
  'Fitness': ['gym', 'fitness', 'yoga', 'peloton', 'crossfit', 'sport'],
};

function ruleBasedCategorize(description: string, merchant?: string): string {
  const text = `${description} ${merchant ?? ''}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some(kw => text.includes(kw))) return category;
  }
  return 'Other';
}

export const aiService = {
  async categorizeTransaction(
    description: string,
    merchant?: string,
    amount?: number
  ): Promise<{ category: string; confidence: number }> {
    if (!openai) {
      return { category: ruleBasedCategorize(description, merchant), confidence: 0.6 };
    }

    try {
      const prompt = `Categorize this financial transaction into exactly one of these categories:
${CATEGORIES.join(', ')}

Transaction:
- Description: ${description}
- Merchant: ${merchant ?? 'Unknown'}
- Amount: ${amount ? `$${Math.abs(amount).toFixed(2)}` : 'Unknown'}

Respond with JSON only: {"category": "...", "confidence": 0.0-1.0}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: 100,
      });

      const result = JSON.parse(response.choices[0].message.content ?? '{}');
      if (!CATEGORIES.includes(result.category)) {
        return { category: ruleBasedCategorize(description, merchant), confidence: 0.5 };
      }
      return { category: result.category, confidence: result.confidence ?? 0.85 };
    } catch (error) {
      logger.error('AI categorization failed, using rule-based fallback', { error });
      return { category: ruleBasedCategorize(description, merchant), confidence: 0.6 };
    }
  },

  async detectRecurringTransactions(transactions: any[]): Promise<any[]> {
    const grouped: Record<string, any[]> = {};
    for (const t of transactions) {
      const key = (t.merchant ?? t.description).toLowerCase().trim().replace(/\s+/g, ' ');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    }

    const recurring = [];
    for (const [key, txns] of Object.entries(grouped)) {
      if (txns.length < 2) continue;

      const amounts = txns.map((t: any) => Math.abs(t.amount));
      const avgAmount = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
      const isConsistentAmount = amounts.every((a: number) => Math.abs(a - avgAmount) < avgAmount * 0.1);

      if (!isConsistentAmount) continue;

      const dates = txns.map((t: any) => new Date(t.date).getTime()).sort((a: number, b: number) => a - b);
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
      }
      const avgGap = gaps.reduce((a: number, b: number) => a + b, 0) / gaps.length;

      let billingCycle = 'MONTHLY';
      if (avgGap <= 2) billingCycle = 'DAILY';
      else if (avgGap <= 9) billingCycle = 'WEEKLY';
      else if (avgGap <= 20) billingCycle = 'BIWEEKLY';
      else if (avgGap <= 35) billingCycle = 'MONTHLY';
      else if (avgGap <= 100) billingCycle = 'QUARTERLY';
      else billingCycle = 'YEARLY';

      recurring.push({
        name: key,
        amount: Math.round(avgAmount * 100) / 100,
        billingCycle,
        occurrences: txns.length,
        lastDate: txns[0].date,
        confidence: isConsistentAmount ? 0.9 : 0.7,
        transactionIds: txns.map((t: any) => t.id),
      });
    }

    return recurring;
  },

  async generateInsights(data: {
    userId: string;
    transactions: any[];
    subscriptions: any[];
    budgets: any[];
  }): Promise<any[]> {
    const insights: any[] = [];
    const { transactions, subscriptions, budgets } = data;

    // Detect unusual spending
    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === 'EXPENSE';
    });
    const lastMonth = transactions.filter(t => {
      const d = new Date(t.date);
      const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === lm && d.getFullYear() === ly && t.type === 'EXPENSE';
    });

    const thisMonthTotal = thisMonth.reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
    const lastMonthTotal = lastMonth.reduce((s: number, t: any) => s + Math.abs(t.amount), 0);

    if (lastMonthTotal > 0 && thisMonthTotal > lastMonthTotal * 1.25) {
      insights.push({
        type: 'UNUSUAL_EXPENSE',
        title: 'Higher Spending This Month',
        description: `Your spending is ${Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)}% higher than last month ($${thisMonthTotal.toFixed(0)} vs $${lastMonthTotal.toFixed(0)}).`,
        severity: 'WARNING',
        data: { thisMonthTotal, lastMonthTotal },
      });
    }

    // Subscription waste
    const subMonthlyCost = subscriptions.reduce((sum: number, s: any) => {
      return sum + (s.billingCycle === 'YEARLY' ? s.amount / 12 : s.amount);
    }, 0);

    if (subMonthlyCost > 100) {
      insights.push({
        type: 'SUBSCRIPTION_WASTE',
        title: 'High Subscription Costs',
        description: `You're spending $${subMonthlyCost.toFixed(0)}/month on ${subscriptions.length} subscriptions. Consider reviewing unused ones.`,
        severity: 'INFO',
        data: { monthlyCost: subMonthlyCost, count: subscriptions.length },
      });
    }

    // Budget forecast
    const overBudget = budgets.filter((b: any) => (b.spent ?? 0) > b.amount);
    if (overBudget.length > 0) {
      insights.push({
        type: 'BUDGET_FORECAST',
        title: `Over Budget in ${overBudget.length} Categories`,
        description: `You've exceeded your budget in: ${overBudget.map((b: any) => b.category).join(', ')}.`,
        severity: 'CRITICAL',
        data: { overBudget: overBudget.map((b: any) => ({ category: b.category, budget: b.amount, spent: b.spent })) },
      });
    }

    // Savings opportunity
    const income = transactions.filter((t: any) => t.type === 'INCOME' && {
      date: new Date(t.date)
    }).reduce((s: number, t: any) => s + t.amount, 0);

    if (income > 0) {
      const savingsRate = ((income - thisMonthTotal) / income) * 100;
      if (savingsRate < 20) {
        insights.push({
          type: 'SAVINGS_OPPORTUNITY',
          title: 'Low Savings Rate',
          description: `Your current savings rate is ${savingsRate.toFixed(1)}%. Financial experts recommend saving at least 20% of income.`,
          severity: savingsRate < 0 ? 'CRITICAL' : 'WARNING',
          data: { savingsRate, income, expenses: thisMonthTotal },
        });
      } else {
        insights.push({
          type: 'SPENDING_PATTERN',
          title: 'Great Savings Rate!',
          description: `You're saving ${savingsRate.toFixed(1)}% of your income. Keep it up!`,
          severity: 'POSITIVE',
          data: { savingsRate },
        });
      }
    }

    return insights;
  },

  async predictNextMonthExpenses(userId: string, transactions: any[]): Promise<number> {
    const last3Months = [0, 1, 2].map(i => {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return transactions
        .filter((t: any) => {
          const td = new Date(t.date);
          return td >= start && td <= end && t.type === 'EXPENSE';
        })
        .reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
    });

    if (last3Months.every(m => m === 0)) return 0;
    // Weighted average (most recent month has highest weight)
    return (last3Months[0] * 3 + last3Months[1] * 2 + last3Months[2]) / 6;
  },
};
