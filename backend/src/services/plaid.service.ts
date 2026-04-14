import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { aiService } from './ai.service';

const config = new Configuration({
  basePath: PlaidEnvironments[env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
      'PLAID-SECRET': env.PLAID_SECRET,
    },
  },
});

const plaidClient = env.PLAID_CLIENT_ID ? new PlaidApi(config) : null;

export const plaidService = {
  async createLinkToken(userId: string): Promise<string> {
    if (!plaidClient) throw new Error('Plaid not configured');

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Sinop App',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    return response.data.link_token;
  },

  async exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }> {
    if (!plaidClient) throw new Error('Plaid not configured');

    const response = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  },

  async getAccounts(accessToken: string) {
    if (!plaidClient) throw new Error('Plaid not configured');
    const response = await plaidClient.accountsGet({ access_token: accessToken });
    return response.data.accounts;
  },

  async syncTransactions(userId: string, accessToken: string, accountId: string): Promise<number> {
    if (!plaidClient) throw new Error('Plaid not configured');

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });

    const { transactions } = response.data;
    let newCount = 0;

    for (const t of transactions) {
      const existing = await prisma.transaction.findUnique({
        where: { plaidTransactionId: t.transaction_id },
      });
      if (existing) continue;

      const { category: aiCategory } = await aiService.categorizeTransaction(
        t.name,
        t.merchant_name ?? undefined,
        t.amount
      );

      await prisma.transaction.create({
        data: {
          userId,
          accountId,
          plaidTransactionId: t.transaction_id,
          amount: t.amount,
          currency: t.iso_currency_code ?? 'USD',
          description: t.name,
          merchant: t.merchant_name ?? undefined,
          category: t.personal_finance_category?.primary ?? aiCategory,
          date: new Date(t.date),
          type: t.amount > 0 ? 'EXPENSE' : 'INCOME',
          isPending: t.pending,
          merchantLogo: t.logo_url ?? undefined,
          location: t.location.city
            ? `${t.location.city}${t.location.region ? ', ' + t.location.region : ''}`
            : undefined,
        },
      });
      newCount++;
    }

    logger.info(`Synced ${newCount} new transactions from Plaid for user ${userId}`);
    return newCount;
  },
};
