import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../services/transactionService', () => ({
  getTransactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
  AuthRequest: undefined,
}));

import { authMiddleware } from '../middleware/auth';

import {
  getTransactions,
  getTransactionsValidation,
  createTransaction,
  createTransactionValidation,
  updateTransaction,
  updateTransactionValidation,
  deleteTransaction,
  deleteTransactionValidation,
} from '../controllers/transactionController';
import { errorHandler } from '../middleware/errorHandler';
import * as transactionService from '../services/transactionService';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.get('/transactions', getTransactionsValidation, getTransactions);
  app.post('/transactions', createTransactionValidation, createTransaction);
  app.put('/transactions/:id', updateTransactionValidation, updateTransaction);
  app.delete('/transactions/:id', deleteTransactionValidation, deleteTransaction);
  app.use(errorHandler);
  return app;
}

describe('transactionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /transactions', () => {
    it('should return transactions list', async () => {
      const transactions = [
        { id: 't1', amount: 100, type: 'expense', categories: { id: 'c1', name: 'Food' } },
      ];
      (transactionService.getTransactions as ReturnType<typeof vi.fn>).mockResolvedValue(transactions);

      const res = await request(createApp()).get('/transactions');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(transactions);
    });

    it('should pass filter params to service', async () => {
      (transactionService.getTransactions as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await request(createApp()).get('/transactions?type=expense&category_id=00000000-0000-0000-0000-000000000000&date_from=2025-01-01&date_to=2025-12-31');

      expect(transactionService.getTransactions).toHaveBeenCalledWith('test-user-id', {
        type: 'expense',
        categoryId: '00000000-0000-0000-0000-000000000000',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      });
    });

    it('should return 422 for invalid type filter', async () => {
      const res = await request(createApp()).get('/transactions?type=invalid');

      expect(res.status).toBe(422);
    });

    it('should return 422 for invalid category_id filter', async () => {
      const res = await request(createApp()).get('/transactions?category_id=not-a-uuid');

      expect(res.status).toBe(422);
    });

    it('should return 422 for invalid date filter', async () => {
      const res = await request(createApp()).get('/transactions?date_from=not-a-date');

      expect(res.status).toBe(422);
    });
  });

  describe('POST /transactions', () => {
    it('should create a transaction with valid data', async () => {
      const newTx = { id: 't1', amount: 500, type: 'expense', categories: { id: 'c1', name: 'Food' } };
      (transactionService.createTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(newTx);

      const res = await request(createApp()).post('/transactions').send({
        category_id: '00000000-0000-0000-0000-000000000000',
        amount: 500,
        type: 'expense',
        transaction_date: '2025-01-15',
        comment: 'Lunch',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(newTx);
    });

    it('should return 422 for missing category_id', async () => {
      const res = await request(createApp()).post('/transactions').send({
        amount: 500,
        type: 'expense',
        transaction_date: '2025-01-15',
      });

      expect(res.status).toBe(422);
    });

    it('should return 422 for zero amount', async () => {
      const res = await request(createApp()).post('/transactions').send({
        category_id: '00000000-0000-0000-0000-000000000000',
        amount: 0,
        type: 'expense',
        transaction_date: '2025-01-15',
      });

      expect(res.status).toBe(422);
    });

    it('should return 422 for invalid type', async () => {
      const res = await request(createApp()).post('/transactions').send({
        category_id: '00000000-0000-0000-0000-000000000000',
        amount: 500,
        type: 'invalid',
        transaction_date: '2025-01-15',
      });

      expect(res.status).toBe(422);
    });

    it('should return 422 for missing transaction_date', async () => {
      const res = await request(createApp()).post('/transactions').send({
        category_id: '00000000-0000-0000-0000-000000000000',
        amount: 500,
        type: 'expense',
      });

      expect(res.status).toBe(422);
    });

    it('should return 422 for comment exceeding 500 chars', async () => {
      const res = await request(createApp()).post('/transactions').send({
        category_id: '00000000-0000-0000-0000-000000000000',
        amount: 500,
        type: 'expense',
        transaction_date: '2025-01-15',
        comment: 'A'.repeat(501),
      });

      expect(res.status).toBe(422);
    });

    it('should return 422 when category type mismatch', async () => {
      const err = Object.assign(new Error('Category type "income" does not match transaction type "expense"'), { status: 422 });
      (transactionService.createTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(err);

      const res = await request(createApp()).post('/transactions').send({
        category_id: '00000000-0000-0000-0000-000000000000',
        amount: 500,
        type: 'expense',
        transaction_date: '2025-01-15',
      });

      expect(res.status).toBe(422);
      expect(res.body.error).toContain('does not match');
    });
  });

  describe('PUT /transactions/:id', () => {
    it('should update a transaction', async () => {
      const updated = { id: 't1', amount: 200, categories: { id: 'c1', name: 'Food' } };
      (transactionService.updateTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const res = await request(createApp()).put('/transactions/00000000-0000-0000-0000-000000000000').send({
        amount: 200,
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updated);
    });

    it('should return 422 for invalid id format', async () => {
      const res = await request(createApp()).put('/transactions/not-a-uuid').send({
        amount: 200,
      });

      expect(res.status).toBe(422);
    });

    it('should return 404 when transaction not found', async () => {
      const err = Object.assign(new Error('Transaction not found'), { status: 404 });
      (transactionService.updateTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(err);

      const res = await request(createApp()).put('/transactions/00000000-0000-0000-0000-000000000000').send({
        amount: 200,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /transactions/:id', () => {
    it('should delete a transaction', async () => {
      (transactionService.deleteTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const res = await request(createApp()).delete('/transactions/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Transaction deleted');
    });

    it('should return 422 for invalid id format', async () => {
      const res = await request(createApp()).delete('/transactions/not-a-uuid');

      expect(res.status).toBe(422);
    });
  });
});
