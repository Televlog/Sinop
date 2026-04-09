import { Router } from 'express';
import multer from 'multer';
import * as txController from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

router.use(authenticate);

router.get('/', txController.getTransactions);
router.get('/summary', txController.getSummary);
router.get('/categories', txController.getCategories);
router.get('/detect-recurring', txController.detectRecurring);
router.get('/:id', txController.getTransaction);
router.post('/', txController.createTransaction);
router.put('/:id', txController.updateTransaction);
router.delete('/:id', txController.deleteTransaction);
router.post('/:id/receipt', upload.single('receipt'), txController.uploadReceipt);

export default router;
