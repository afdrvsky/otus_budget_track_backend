import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a chainable mock that supports both thenable (await) and .single() resolution
function makeChain(result: { data: unknown; error: unknown }) {
  const self: Record<string, unknown> = {};

  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order'];

  for (const m of methods) {
    self[m] = vi.fn(() => self);
  }

  // .single() returns a promise (used by update, create after .select())
  self.single = vi.fn(() => Promise.resolve(result));

  // The chain itself is thenable (used by get, delete without .single())
  self.then = (resolve: (v: unknown) => void, _reject?: (v: unknown) => void) => {
    resolve(result);
  };
  self.catch = vi.fn(() => Promise.resolve(result));

  return self;
}

let mockResult: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock('../config/supabase', () => {
  const from = vi.fn(() => makeChain(mockResult));
  return {
    supabase: { from },
    supabaseAdmin: { from },
  };
});

import * as transactionService from '../services/transactionService';
import { supabaseAdmin } from '../config/supabase';

describe('transactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: null, error: null };
  });

  describe('getTransactions', () => {
    it('should fetch all transactions for a user', async () => {
      const transactions = [
        {
          id: 't1',
          user_id: 'u1',
          amount: 100,
          type: 'expense',
          categories: { id: 'c1', name: 'Food' },
        },
      ];
      mockResult = { data: transactions, error: null };

      const result = await transactionService.getTransactions('u1', {});

      expect(supabaseAdmin.from).toHaveBeenCalledWith('transactions');
      expect(result).toEqual(transactions);
    });

    it('should apply type filter', async () => {
      mockResult = { data: [], error: null };

      await transactionService.getTransactions('u1', { type: 'expense' });

      const chain = (supabaseAdmin.from as ReturnType<typeof vi.fn>).mock.results[0].value as Record<
        string,
        ReturnType<typeof vi.fn>
      >;
      expect(chain.eq).toHaveBeenCalledWith('type', 'expense');
    });

    it('should apply date range filters', async () => {
      mockResult = { data: [], error: null };

      await transactionService.getTransactions('u1', {
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      });

      const chain = (supabaseAdmin.from as ReturnType<typeof vi.fn>).mock.results[0].value as Record<
        string,
        ReturnType<typeof vi.fn>
      >;
      expect(chain.gte).toHaveBeenCalledWith('transaction_date', '2025-01-01');
      expect(chain.lte).toHaveBeenCalledWith('transaction_date', '2025-12-31');
    });

    it('should apply category filter', async () => {
      mockResult = { data: [], error: null };

      await transactionService.getTransactions('u1', { categoryId: 'c1' });

      const chain = (supabaseAdmin.from as ReturnType<typeof vi.fn>).mock.results[0].value as Record<
        string,
        ReturnType<typeof vi.fn>
      >;
      expect(chain.eq).toHaveBeenCalledWith('category_id', 'c1');
    });

    it('should throw on fetch error', async () => {
      mockResult = { data: null, error: { message: 'DB error' } };

      await expect(transactionService.getTransactions('u1', {})).rejects.toThrow(
        'Failed to fetch transactions',
      );
    });
  });

  describe('createTransaction', () => {
    it('should create a transaction when category type matches', async () => {
      const newTx = {
        id: 't1',
        amount: 500,
        type: 'expense',
        categories: { id: 'c1', name: 'Food' },
      };

      let callCount = 0;
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Category lookup — uses .single()
          return makeChain({ data: { id: 'c1', type: 'expense' }, error: null });
        }
        // Insert — uses .single()
        return makeChain({ data: newTx, error: null });
      });

      const result = await transactionService.createTransaction(
        'u1',
        'c1',
        500,
        'expense',
        '2025-01-15',
        'Lunch',
      );

      expect(result).toEqual(newTx);
    });

    it('should throw 404 when category not found', async () => {
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return makeChain({ data: null, error: null });
      });

      await expect(
        transactionService.createTransaction('u1', 'nonexistent', 100, 'expense', '2025-01-15'),
      ).rejects.toThrow('Category not found');
    });

    it('should throw 422 when category type does not match transaction type', async () => {
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return makeChain({ data: { id: 'c1', type: 'income' }, error: null });
      });

      await expect(
        transactionService.createTransaction('u1', 'c1', 100, 'expense', '2025-01-15'),
      ).rejects.toThrow('Category type "income" does not match transaction type "expense"');
    });

    it('should throw 500 on insert error', async () => {
      let callCount = 0;
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeChain({ data: { id: 'c1', type: 'expense' }, error: null });
        }
        return makeChain({ data: null, error: { message: 'Insert failed' } });
      });

      await expect(
        transactionService.createTransaction('u1', 'c1', 100, 'expense', '2025-01-15'),
      ).rejects.toThrow('Failed to create transaction');
    });
  });

  describe('updateTransaction', () => {
    it('should update a transaction with category validation', async () => {
      const updated = { id: 't1', amount: 200, categories: { id: 'c1', name: 'Food' } };
      let callCount = 0;
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeChain({ data: { id: 'c1', type: 'expense' }, error: null });
        }
        return makeChain({ data: updated, error: null });
      });

      const result = await transactionService.updateTransaction('u1', 't1', {
        amount: 200,
        categoryId: 'c1',
        type: 'expense',
        comment: 'Updated',
        transactionDate: '2025-01-15',
      });

      expect(result).toEqual(updated);
    });

    it('should throw 404 when transaction not found (data is null, no error)', async () => {
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return makeChain({ data: null, error: null });
      });

      await expect(
        transactionService.updateTransaction('u1', 'nonexistent', { amount: 200 }),
      ).rejects.toThrow('Transaction not found');
    });

    it('should throw 500 on update error', async () => {
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return makeChain({ data: null, error: { message: 'Update failed' } });
      });

      await expect(
        transactionService.updateTransaction('u1', 't1', { amount: 200 }),
      ).rejects.toThrow('Failed to update transaction');
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction', async () => {
      // deleteTransaction uses await (thenable), not .single()
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return makeChain({ data: null, error: null });
      });

      await transactionService.deleteTransaction('u1', 't1');

      expect(supabaseAdmin.from).toHaveBeenCalledWith('transactions');
    });

    it('should throw on delete error', async () => {
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return makeChain({ data: null, error: { message: 'Delete failed' } });
      });

      await expect(transactionService.deleteTransaction('u1', 't1')).rejects.toThrow(
        'Failed to delete transaction',
      );
    });
  });
});
