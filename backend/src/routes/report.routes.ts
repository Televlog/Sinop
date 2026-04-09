import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/monthly', reportController.getMonthlyReport);
router.get('/trends', reportController.getSpendingTrends);
router.get('/insights', reportController.getAIInsights);
router.post('/insights/generate', reportController.generateAIInsights);
router.get('/export/pdf', reportController.exportPDF);
router.get('/export/excel', reportController.exportExcel);
router.get('/notifications', reportController.getNotifications);
router.put('/notifications/:id/read', reportController.markNotificationRead);

export default router;
