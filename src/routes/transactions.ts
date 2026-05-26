import { Router } from 'express';
import {
  getTransactions, getTransactionsValidation,
  createTransaction, createTransactionValidation,
  updateTransaction, updateTransactionValidation,
  deleteTransaction, deleteTransactionValidation,
} from '../controllers/transactionController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getTransactionsValidation, getTransactions);
router.post('/', createTransactionValidation, createTransaction);
router.put('/:id', updateTransactionValidation, updateTransaction);
router.delete('/:id', deleteTransactionValidation, deleteTransaction);

export default router;
