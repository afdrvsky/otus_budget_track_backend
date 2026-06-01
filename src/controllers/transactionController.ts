import { Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import * as transactionService from '../services/transactionService';

export const getTransactionsValidation = [
  query('type').optional().isIn(['income', 'expense']),
  query('category_id').optional().isUUID(),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
];

export async function getTransactions(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(422, 'Validation failed', errors.array());
    }

    const userId = req.userId!;
    const data = await transactionService.getTransactions(userId, {
      type: req.query.type as string | undefined,
      categoryId: req.query.category_id as string | undefined,
      dateFrom: req.query.date_from as string | undefined,
      dateTo: req.query.date_to as string | undefined,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export const createTransactionValidation = [
  body('category_id').isUUID().withMessage('Valid category ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('transaction_date').isISO8601().withMessage('Valid date is required'),
  body('comment').optional().isLength({ max: 500 }),
];

export async function createTransaction(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(422, 'Validation failed', errors.array());
    }

    const userId = req.userId!;
    const { category_id, amount, type, transaction_date, comment } = req.body;
    const data = await transactionService.createTransaction(
      userId,
      category_id,
      amount,
      type,
      transaction_date,
      comment,
    );

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export const updateTransactionValidation = [
  param('id').isUUID().withMessage('Invalid transaction ID'),
  body('category_id').optional().isUUID(),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('type').optional().isIn(['income', 'expense']),
  body('transaction_date').optional().isISO8601(),
  body('comment').optional().isLength({ max: 500 }),
];

export async function updateTransaction(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(422, 'Validation failed', errors.array());
    }

    const userId = req.userId!;
    const id = req.params.id as string;
    const { category_id, amount, type, transaction_date, comment } = req.body;
    const data = await transactionService.updateTransaction(userId, id, {
      categoryId: category_id,
      amount,
      type,
      transactionDate: transaction_date,
      comment,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export const deleteTransactionValidation = [
  param('id').isUUID().withMessage('Invalid transaction ID'),
];

export async function deleteTransaction(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(422, 'Validation failed', errors.array());
    }

    const userId = req.userId!;
    const id = req.params.id as string;
    await transactionService.deleteTransaction(userId, id);

    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    next(err);
  }
}
