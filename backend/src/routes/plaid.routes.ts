import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { plaidService } from '../services/plaid.service';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../config/database';

const router = Router();
router.use(authenticate);

router.post('/link-token', asyncHandler(async (req: Request, res: Response) => {
  const token = await plaidService.createLinkToken(req.user!.userId);
  res.json({ linkToken: token });
}));

router.post('/exchange-token', asyncHandler(async (req: Request, res: Response) => {
  const { publicToken, institutionId, institutionName } = req.body;
  const { accessToken, itemId } = await plaidService.exchangePublicToken(publicToken);

  const accounts = await plaidService.getAccounts(accessToken);

  const created = await Promise.all(
    accounts.map(account =>
      prisma.account.upsert({
        where: { plaidAccountId: account.account_id },
        create: {
          userId: req.user!.userId,
          plaidAccountId: account.account_id,
          plaidItemId: itemId,
          accessToken,
          institutionId,
          institutionName,
          accountName: account.name,
          accountMask: account.mask ?? undefined,
          accountType: mapAccountType(account.type),
          accountSubtype: account.subtype ?? undefined,
          balance: account.balances.current ?? 0,
          availableBalance: account.balances.available ?? undefined,
          isManual: false,
        },
        update: {
          balance: account.balances.current ?? 0,
          availableBalance: account.balances.available ?? undefined,
          lastSynced: new Date(),
        },
      })
    )
  );

  res.json({ accounts: created, message: 'Bank account connected successfully' });
}));

router.post('/sync', asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.body;
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: req.user!.userId },
  });

  if (!account?.accessToken) {
    res.status(404).json({ message: 'Account not found or not linked' });
    return;
  }

  const count = await plaidService.syncTransactions(req.user!.userId, account.accessToken, account.id);

  await prisma.account.update({
    where: { id: accountId },
    data: { lastSynced: new Date() },
  });

  res.json({ message: `Synced ${count} new transactions` });
}));

router.get('/accounts', asyncHandler(async (req: Request, res: Response) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ accounts });
}));

router.delete('/accounts/:id', asyncHandler(async (req: Request, res: Response) => {
  await prisma.account.delete({
    where: { id: req.params.id, userId: req.user!.userId } as any,
  });
  res.json({ message: 'Account disconnected' });
}));

function mapAccountType(type: string): 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'LOAN' | 'OTHER' {
  const map: Record<string, any> = {
    depository: 'CHECKING',
    credit: 'CREDIT',
    investment: 'INVESTMENT',
    loan: 'LOAN',
  };
  return map[type] ?? 'OTHER';
}

export default router;
