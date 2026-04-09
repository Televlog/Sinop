import { Router } from 'express';
import * as subController from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', subController.getSubscriptions);
router.get('/upcoming', subController.getUpcomingBillings);
router.get('/detect', subController.detectSubscriptionsFromTransactions);
router.get('/:id', subController.getSubscription);
router.post('/', subController.createSubscription);
router.put('/:id', subController.updateSubscription);
router.post('/:id/cancel', subController.cancelSubscription);
router.delete('/:id', subController.deleteSubscription);

export default router;
