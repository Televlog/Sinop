import { Router } from 'express';
import * as budgetController from '../controllers/budget.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', budgetController.getBudgets);
router.get('/:id', budgetController.getBudget);
router.post('/', budgetController.createBudget);
router.put('/:id', budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget);

// Savings goals sub-resource
router.get('/goals/all', budgetController.getSavingsGoals);
router.post('/goals', budgetController.createSavingsGoal);
router.put('/goals/:id', budgetController.updateSavingsGoal);
router.delete('/goals/:id', budgetController.deleteSavingsGoal);

export default router;
